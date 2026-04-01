import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPendingRecordings, updateRecordingStatus, deletePendingRecording, type PendingRecording } from "@/lib/offlineDb";
import { useOnlineStatus } from "./useOnlineStatus";
import { toast } from "sonner";

export function useOfflineSync() {
  const { isOnline } = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingItems, setPendingItems] = useState<PendingRecording[]>([]);
  const syncingRef = useRef(false);

  const parseSyncError = async (response: Response) => {
    const payload = await response.json().catch(() => null);

    if (payload?.provider_status === "payment_issue") {
      return "Le service de transcription est indisponible pour le moment (problème de paiement du fournisseur).";
    }

    return payload?.error || payload?.message || payload?.details || "Erreur de transcription";
  };

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

    const audioUrl = uploadError ? null : fileName;

    // 2. Transcribe
    const formData = new FormData();
    formData.append("audio", rec.audioBlob, "recording.webm");

    const transcribeRes = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-transcribe`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: formData,
      }
    );

    if (!transcribeRes.ok) {
      throw new Error(await parseSyncError(transcribeRes));
    }

    const { text: transcribedText } = await transcribeRes.json();

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
        audio_url: audioUrl,
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

          if (/paiement du fournisseur|crédits|payment_issue/i.test(message)) {
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
