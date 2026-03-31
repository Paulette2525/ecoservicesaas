import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FileText, Square, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { savePendingRecording } from "@/lib/offlineDb";
import { useScribe } from "@elevenlabs/react";

interface VisitRecorderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitId: string;
  clientName: string;
  visitDate: string;
  onComplete: () => void;
}

type Step = "ready" | "recording" | "processing" | "done";

export default function VisitRecorder({ open, onOpenChange, visitId, clientName, visitDate, onComplete }: VisitRecorderProps) {
  const [step, setStep] = useState<Step>("ready");
  const [duration, setDuration] = useState(0);
  const [liveText, setLiveText] = useState("");
  const committedTextRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Offline fallback refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: "vad",
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

  // Auto-close after done
  useEffect(() => {
    if (step === "done") {
      const t = setTimeout(() => handleClose(), 2000);
      return () => clearTimeout(t);
    }
  }, [step]);

  const startRecording = useCallback(async () => {
    committedTextRef.current = "";
    setLiveText("");
    setDuration(0);

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
        toast.error("Impossible d'obtenir le token de transcription");
        return;
      }

      await scribe.connect({
        token: data.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      setStep("recording");
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch (e: any) {
      console.error("Start error:", e);
      toast.error("Erreur au démarrage de l'enregistrement");
    }
  }, [scribe]);

  const stopAndProcess = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);

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
    setStep("processing");

    try {
      scribe.disconnect();

      // Wait a beat for final committed transcripts
      await new Promise((r) => setTimeout(r, 500));

      const fullText = committedTextRef.current.trim();
      if (!fullText) {
        toast.error("Aucune transcription détectée");
        setStep("ready");
        return;
      }

      // Generate summary
      const { data: summaryData } = await supabase.functions.invoke("visit-summary", {
        body: { transcription: fullText, client_name: clientName, visit_date: visitDate },
      });

      const generatedSummary = summaryData?.summary || "";

      // Update visit record
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
  }, [isOfflineMode, scribe, visitId, clientName, visitDate]);

  const handleClose = () => {
    if (step === "recording") {
      if (isOfflineMode) {
        mediaRecorderRef.current?.stop();
        mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
      } else {
        scribe.disconnect();
      }
      if (timerRef.current) clearInterval(timerRef.current);
    }
    setStep("ready");
    setDuration(0);
    setLiveText("");
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
      </div>
    </div>
  );
}
