import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FileText, Square, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-close after done
  useEffect(() => {
    if (step === "done") {
      const t = setTimeout(() => handleClose(), 2000);
      return () => clearTimeout(t);
    }
  }, [step]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.start(1000);
      setStep("recording");
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      toast.error("Impossible d'accéder au micro.");
    }
  }, []);

  const stopRecording = useCallback(async () => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder) return;
    if (timerRef.current) clearInterval(timerRef.current);

    return new Promise<Blob>((resolve) => {
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        mediaRecorder.stream.getTracks().forEach((t) => t.stop());
        resolve(blob);
      };
      mediaRecorder.stop();
    });
  }, []);

  const processAudio = async () => {
    setStep("processing");
    try {
      const audioBlob = await stopRecording();
      if (!audioBlob || audioBlob.size === 0) {
        toast.error("Aucun audio enregistré");
        setStep("ready");
        return;
      }

      const fileName = `${visitId}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from("visit-recordings")
        .upload(fileName, audioBlob, { contentType: "audio/webm" });

      if (uploadError) console.error("Upload error:", uploadError);
      const audioUrl = uploadError ? null : fileName;

      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const transcribeRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-transcribe`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: formData,
        }
      );

      if (!transcribeRes.ok) {
        const err = await transcribeRes.json().catch(() => ({}));
        throw new Error(err.error || "Erreur de transcription");
      }

      const { text: transcribedText } = await transcribeRes.json();

      const { data: summaryData } = await supabase.functions.invoke("visit-summary", {
        body: { transcription: transcribedText, client_name: clientName, visit_date: visitDate },
      });

      const generatedSummary = summaryData?.summary || "";

      await supabase
        .from("visits")
        .update({
          transcription: transcribedText,
          summary: generatedSummary,
          audio_url: audioUrl,
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

  const handleClose = () => {
    if (step === "recording") {
      mediaRecorderRef.current?.stop();
      mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    }
    setStep("ready");
    setDuration(0);
    onOpenChange(false);
    onComplete();
  };

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  if (!open) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 rounded-lg border bg-card shadow-lg">
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
            <p className="text-xs text-muted-foreground text-center">Prendre des notes vocales</p>
            <Button variant="outline" size="sm" onClick={startRecording} className="gap-1.5 text-xs">
              <div className="h-2 w-2 rounded-full bg-muted-foreground" />
              Démarrer
            </Button>
          </div>
        )}

        {step === "recording" && (
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
              <span className="text-sm font-mono">{formatDuration(duration)}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={processAudio} className="gap-1 text-xs">
              <Square className="h-3 w-3" /> Stop
            </Button>
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
