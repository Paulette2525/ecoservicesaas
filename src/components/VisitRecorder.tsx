import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FileText, Square, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { savePendingRecording } from "@/lib/offlineDb";
import { useScribe, CommitStrategy } from "@elevenlabs/react";

interface VisitRecorderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitId: string;
  clientName: string;
  visitDate: string;
  onComplete: () => void;
}

type Step = "ready" | "recording" | "processing" | "done" | "error";

export default function VisitRecorder({ open, onOpenChange, visitId, clientName, visitDate, onComplete }: VisitRecorderProps) {
  const [step, setStep] = useState<Step>("ready");
  const [duration, setDuration] = useState(0);
  const [liveText, setLiveText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const committedTextRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wasConnectedRef = useRef(false);

  // Offline fallback refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: CommitStrategy.VAD,
    onPartialTranscript: (data) => {
      setLiveText(committedTextRef.current + (committedTextRef.current ? " " : "") + data.text);
    },
    onCommittedTranscript: (data) => {
      committedTextRef.current = committedTextRef.current
        ? committedTextRef.current + " " + data.text
        : data.text;
      setLiveText(committedTextRef.current);
    },
  });

  // Monitor scribe connection status
  useEffect(() => {
    if (scribe.isConnected) {
      wasConnectedRef.current = true;
    } else if (wasConnectedRef.current && step === "recording" && !isOfflineMode) {
      // Scribe disconnected unexpectedly during recording
      wasConnectedRef.current = false;
      console.warn("Scribe disconnected unexpectedly");
      
      if (timerRef.current) clearInterval(timerRef.current);
      
      const fullText = committedTextRef.current.trim();
      if (fullText) {
        // We have some text, process what we got
        processTranscription(fullText);
      } else {
        setErrorMsg("La connexion a été interrompue. Vérifiez votre connexion internet et réessayez.");
        setStep("error");
      }
    }
  }, [scribe.isConnected, step, isOfflineMode]);

  // Auto-close after done
  useEffect(() => {
    if (step === "done") {
      const t = setTimeout(() => handleClose(), 2000);
      return () => clearTimeout(t);
    }
  }, [step]);

  const processTranscription = async (fullText: string) => {
    setStep("processing");
    try {
      const { data: summaryData } = await supabase.functions.invoke("visit-summary", {
        body: { transcription: fullText, client_name: clientName, visit_date: visitDate },
      });

      const generatedSummary = summaryData?.summary || "";

      await supabase
        .from("visits")
        .update({
          transcription: fullText,
          summary: generatedSummary,
          report: generatedSummary || undefined,
        })
        .eq("id", visitId);

      setStep("done");
      toast.success("Notes sauvegardées");
    } catch (e: any) {
      console.error("Processing error:", e);
      toast.error(e.message || "Erreur lors du traitement");
      setStep("ready");
    }
  };

  const startRecording = useCallback(async () => {
    committedTextRef.current = "";
    setLiveText("");
    setDuration(0);
    setErrorMsg("");
    wasConnectedRef.current = false;

    // Offline fallback
    if (!navigator.onLine) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        mediaRecorder.start(1000);
        setIsOfflineMode(true);
        setStep("recording");
        timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
      } catch {
        toast.error("Impossible d'accéder au micro.");
      }
      return;
    }

    // Online: use realtime scribe
    try {
      setIsOfflineMode(false);

      const { data, error } = await supabase.functions.invoke("elevenlabs-scribe-token");
      if (error || !data?.token) {
        console.error("Token error:", error, data);
        toast.error("Impossible d'obtenir le token de transcription");
        return;
      }

      console.log("Token obtained, connecting to scribe...");

      await scribe.connect({
        token: data.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      console.log("Scribe connected successfully");
      setStep("recording");
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch (e: any) {
      console.error("Start error:", e);
      setErrorMsg(e.message || "Erreur au démarrage");
      setStep("error");
    }
  }, [scribe]);

  const stopAndProcess = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    wasConnectedRef.current = false;

    // Offline mode: save to IndexedDB
    if (isOfflineMode) {
      setStep("processing");
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder) return;

      const audioBlob = await new Promise<Blob>((resolve) => {
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          mediaRecorder.stream.getTracks().forEach((t) => t.stop());
          resolve(blob);
        };
        mediaRecorder.stop();
      });

      await savePendingRecording({ visitId, clientName, visitDate, audioBlob });
      setStep("done");
      toast.success("Enregistrement sauvegardé hors ligne — synchronisation automatique au retour");
      return;
    }

    // Online mode: disconnect scribe and process text
    try {
      scribe.disconnect();
    } catch (e) {
      console.warn("Disconnect error (non-fatal):", e);
    }

    // Wait a beat for final committed transcripts
    await new Promise((r) => setTimeout(r, 800));

    const fullText = committedTextRef.current.trim();
    if (!fullText) {
      toast.error("Aucune transcription détectée. Vérifiez que votre micro fonctionne.");
      setStep("ready");
      return;
    }

    await processTranscription(fullText);
  }, [isOfflineMode, scribe, visitId, clientName, visitDate]);

  const handleClose = () => {
    if (step === "recording") {
      wasConnectedRef.current = false;
      if (isOfflineMode) {
        mediaRecorderRef.current?.stop();
        mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
      } else {
        try { scribe.disconnect(); } catch {}
      }
      if (timerRef.current) clearInterval(timerRef.current);
    }
    setStep("ready");
    setDuration(0);
    setLiveText("");
    setErrorMsg("");
    committedTextRef.current = "";
    onOpenChange(false);
    onComplete();
  };

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  if (!open) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 rounded-lg border bg-card shadow-lg">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          Notes de visite
        </div>
        <button onClick={handleClose} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
      </div>

      <div className="p-3">
        {step === "ready" && (
          <div className="flex flex-col items-center gap-2 py-2">
            <p className="text-xs text-muted-foreground text-center">
              {navigator.onLine ? "Transcription en temps réel" : "Mode hors ligne"}
            </p>
            <Button variant="outline" size="sm" onClick={startRecording} className="gap-1.5 text-xs">
              <div className="h-2 w-2 rounded-full bg-muted-foreground" />
              Démarrer
            </Button>
          </div>
        )}

        {step === "recording" && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-sm font-mono">{formatDuration(duration)}</span>
                {!isOfflineMode && (
                  <span className={`text-xs ${scribe.isConnected ? "text-green-600" : "text-orange-500"}`}>
                    {scribe.isConnected ? "●" : "○"}
                  </span>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={stopAndProcess} className="gap-1 text-xs">
                <Square className="h-3 w-3" /> Stop
              </Button>
            </div>
            {!isOfflineMode && liveText && (
              <div className="max-h-32 overflow-y-auto rounded bg-muted/50 p-2">
                <p className="text-xs text-muted-foreground leading-relaxed">{liveText}</p>
              </div>
            )}
            {!isOfflineMode && !liveText && duration > 3 && (
              <p className="text-xs text-muted-foreground text-center animate-pulse">En écoute…</p>
            )}
          </div>
        )}

        {step === "processing" && (
          <div className="flex items-center gap-2 py-3 justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Traitement…</span>
          </div>
        )}

        {step === "done" && (
          <div className="flex items-center gap-2 py-2 justify-center">
            <span className="text-xs text-muted-foreground">✓ Notes sauvegardées</span>
          </div>
        )}

        {step === "error" && (
          <div className="flex flex-col items-center gap-2 py-2">
            <div className="flex items-center gap-1.5 text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Erreur</span>
            </div>
            <p className="text-xs text-muted-foreground text-center">{errorMsg}</p>
            <Button variant="outline" size="sm" onClick={() => { setStep("ready"); setErrorMsg(""); }} className="text-xs">
              Réessayer
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
