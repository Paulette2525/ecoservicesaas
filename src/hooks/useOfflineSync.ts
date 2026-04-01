import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPendingRecordings, updateRecordingStatus, deletePendingRecording, type PendingRecording } from "@/lib/offlineDb";
import { useOnlineStatus } from "./useOnlineStatus";
import { toast } from "sonner";

const CHUNK_SIZE = 4 * 1024 * 1024; // 4 MB
const CHUNK_THRESHOLD = 5 * 1024 * 1024; // 5 MB

type SyncError = { message: string; isProviderError: boolean };

function parseSyncErrorResponse(payload: any): SyncError {
  const isProviderError = /payment_issue|insufficient_credits|rate_limited/i.test(
    `${payload?.provider_status} ${payload?.details} ${payload?.error}`
  );
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

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-transcribe`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
      body: formData,
    }
  );

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const err = parseSyncErrorResponse(payload);
    const e = new Error(err.message) as any;
    e.isProviderError = err.isProviderError;
    throw e;
  }

  const { text } = await res.json();
  return text || "";
}

async function transcribeWithChunking(audioBlob: Blob): Promise<string> {
  if (audioBlob.size <= CHUNK_THRESHOLD) {
    return transcribeChunk(audioBlob);
  }

  // Split into chunks
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

    // 1. Upload audio
    const fileName = `${rec.visitId}/${Date.now()}.webm`;
    const { error: uploadError } = await supabase.storage
      .from("visit-recordings")
      .upload(fileName, rec.audioBlob, { contentType: "audio/webm" });

    if (uploadError) {
      console.error("Sync upload error:", uploadError);
      throw new Error("Impossible d'envoyer l'audio pour la synchronisation.");
    }

    // 2. Transcribe with chunking + retry
    const transcribedText = await withRetry(() => transcribeWithChunking(rec.audioBlob));

    // 3. Summary
    const { data: summaryData, error: summaryError } = await supabase.functions.invoke("visit-summary", {
      body: { transcription: transcribedText, client_name: rec.clientName, visit_date: rec.visitDate },
    });

    if (summaryError) {
      throw new Error(summaryError.message || "Erreur lors de la génération du résumé.");
    }

    const generatedSummary = summaryData?.summary || "";

    // 4. Update visit
    const { error: visitError } = await supabase
      .from("visits")
      .update({
        transcription: transcribedText,
        summary: generatedSummary,
        audio_url: fileName,
        report: generatedSummary || undefined,
      })
      .eq("id", rec.visitId);

    if (visitError) {
      throw new Error(visitError.message || "Impossible de mettre à jour la visite.");
    }

    // 5. Remove from IndexedDB
    await deletePendingRecording(rec.id);
  };

  const syncAll = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setIsSyncing(true);

    try {
      const items = await getPendingRecordings();
      for (const rec of items) {
        if (!navigator.onLine) break;
        try {
          await syncOne(rec);
          toast.success(`Visite "${rec.clientName}" synchronisée`);
        } catch (e: any) {
          const message = e instanceof Error ? e.message : "Erreur de synchronisation";
          console.error("Sync failed for", rec.id, e);
          await updateRecordingStatus(rec.id, "pending");
          toast.error(`Synchronisation impossible pour "${rec.clientName}" : ${message}`);

          if (e.isProviderError || /paiement du fournisseur|crédits|payment_issue/i.test(message)) {
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

  // Refresh on mount
  useEffect(() => {
    refreshPending();
  }, [refreshPending]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncAll();
    }
  }, [isOnline, pendingCount, syncAll]);

  return { pendingCount, isSyncing, isOnline, pendingItems, refreshPending, syncAll };
}
