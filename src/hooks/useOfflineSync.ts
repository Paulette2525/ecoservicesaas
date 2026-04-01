import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getPendingRecordings,
  updateRecordingStatus,
  updatePendingRecording,
  deletePendingRecording,
  onRecordingsChange,
  type PendingRecording,
} from "@/lib/offlineDb";
import { useOnlineStatus } from "./useOnlineStatus";
import { toast } from "sonner";

const CHUNK_SIZE = 4 * 1024 * 1024; // 4 MB
const CHUNK_THRESHOLD = 5 * 1024 * 1024; // 5 MB

type SyncError = { message: string; isProviderError: boolean };

function parseSyncErrorResponse(payload: any): SyncError {
  const raw = `${payload?.provider_status} ${payload?.details} ${payload?.error}`;
  const isProviderError = /payment_issue|insufficient_credits|rate_limited/i.test(raw);
  const message =
    payload?.provider_status === "payment_issue"
      ? "Service de transcription indisponible (problème de paiement du fournisseur)."
      : payload?.provider_status === "rate_limited"
        ? "Trop de requêtes vers le service de transcription, réessai automatique."
        : payload?.details || payload?.error || payload?.message || "Erreur de transcription";
  return { message, isProviderError };
}

async function transcribeChunk(blob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append("audio", blob, "recording.webm");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const res = await fetch(`${supabaseUrl}/functions/v1/elevenlabs-transcribe`, {
    method: "POST",
    headers: { Authorization: `Bearer ${supabaseKey}` },
    body: formData,
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const parsed = parseSyncErrorResponse(payload);
    const e = new Error(parsed.message) as any;
    e.isProviderError = parsed.isProviderError;
    throw e;
  }

  const { text } = await res.json();
  return text || "";
}

async function transcribeWithChunking(audioBlob: Blob): Promise<string> {
  if (audioBlob.size <= CHUNK_THRESHOLD) {
    return transcribeChunk(audioBlob);
  }

  const chunks: Blob[] = [];
  let offset = 0;
  while (offset < audioBlob.size) {
    chunks.push(audioBlob.slice(offset, offset + CHUNK_SIZE, audioBlob.type));
    offset += CHUNK_SIZE;
  }

  console.log(`Audio ${(audioBlob.size / 1024 / 1024).toFixed(1)} Mo → ${chunks.length} chunks`);

  const texts: string[] = [];
  for (const chunk of chunks) {
    texts.push(await transcribeChunk(chunk));
  }
  return texts.filter(Boolean).join(" ");
}

async function withRetry<T>(fn: () => Promise<T>, retries = 1, delayMs = 3000): Promise<T> {
  try {
    return await fn();
  } catch (e: any) {
    if (e.isProviderError || retries <= 0) throw e;
    console.log(`Retry in ${delayMs}ms...`);
    await new Promise((r) => setTimeout(r, delayMs));
    return withRetry(fn, retries - 1, delayMs * 2);
  }
}

export function useOfflineSync() {
  const { isOnline } = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingItems, setPendingItems] = useState<PendingRecording[]>([]);
  const syncingRef = useRef(false);

  const refreshPending = useCallback(async () => {
    try {
      const items = await getPendingRecordings();
      setPendingItems(items);
      setPendingCount(items.length);
    } catch {
      // IndexedDB may not be available
    }
  }, []);

  const syncOne = async (rec: PendingRecording) => {
    await updateRecordingStatus(rec.id, "syncing");

    // 1. Upload audio only once
    let fileName = rec.uploadedPath;
    if (!fileName) {
      fileName = `${rec.visitId}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from("visit-recordings")
        .upload(fileName, rec.audioBlob, { contentType: "audio/webm" });

      if (uploadError) {
        throw new Error("Impossible d'envoyer l'audio pour la synchronisation.");
      }

      await updatePendingRecording(rec.id, { uploadedPath: fileName, status: "syncing" });
    }

    // Save audio_url immediately so audio is never lost
    await supabase
      .from("visits")
      .update({ audio_url: fileName, sync_status: "audio_uploaded" } as any)
      .eq("id", rec.visitId);

    // 2. Transcribe with chunking + retry
    let transcribedText: string;
    try {
      transcribedText = await withRetry(() => transcribeWithChunking(rec.audioBlob));
    } catch (e: any) {
      // Save error status but don't delete from queue
      await supabase
        .from("visits")
        .update({ sync_status: "error", sync_error: e.message } as any)
        .eq("id", rec.visitId);
      throw e;
    }

    // 3. Summary
    const { data: summaryData, error: summaryError } = await supabase.functions.invoke("visit-summary", {
      body: { transcription: transcribedText, client_name: rec.clientName, visit_date: rec.visitDate },
    });

    if (summaryError) {
      await supabase
        .from("visits")
        .update({ transcription: transcribedText, sync_status: "error", sync_error: "Erreur résumé" } as any)
        .eq("id", rec.visitId);
      throw new Error(summaryError.message || "Erreur lors de la génération du résumé.");
    }

    const generatedSummary = summaryData?.summary || "";

    // 4. Update visit with everything
    await supabase
      .from("visits")
      .update({
        transcription: transcribedText,
        summary: generatedSummary,
        audio_url: fileName,
        report: generatedSummary || undefined,
        sync_status: "synced",
        sync_error: null,
      } as any)
      .eq("id", rec.visitId);

    // 5. Remove from IndexedDB
    await deletePendingRecording(rec.id);
  };

  const syncAll = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setIsSyncing(true);

    try {
      const items = await getPendingRecordings();
      if (items.length === 0) return;

      for (const rec of items) {
        if (!navigator.onLine) break;
        try {
          await syncOne(rec);
          toast.success(`Visite "${rec.clientName}" synchronisée`);
        } catch (e: any) {
          const message = e instanceof Error ? e.message : "Erreur de synchronisation";
          console.error("Sync failed for", rec.id, e);
          await updateRecordingStatus(rec.id, "pending");
          toast.error(`Sync impossible pour "${rec.clientName}" : ${message}`);

          if (e.isProviderError || /paiement|payment/i.test(message)) {
            break;
          }
        }
        await refreshPending();
      }
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
      await refreshPending();
    }
  }, [refreshPending]);

  // Listen to IndexedDB changes
  useEffect(() => {
    const unsub = onRecordingsChange(() => {
      refreshPending();
    });
    return unsub;
  }, [refreshPending]);

  // Refresh on mount
  useEffect(() => {
    refreshPending();
  }, [refreshPending]);

  // Auto-sync when coming back online (listen to native event directly)
  useEffect(() => {
    const handleOnline = () => {
      // Small delay to let network stabilize
      setTimeout(() => syncAll(), 1500);
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [syncAll]);

  // Also try sync if we mount while online with pending items
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncAll();
    }
  }, [isOnline, pendingCount, syncAll]);

  return { pendingCount, isSyncing, isOnline, pendingItems, refreshPending, syncAll };
}
