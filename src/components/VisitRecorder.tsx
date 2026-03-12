import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mic, Square, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

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
  const [transcription, setTranscription] = useState("");
  const [summary, setSummary] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      toast.error("Impossible d'accéder au micro. Vérifiez les permissions.");
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

      // 1. Upload audio to storage
      const fileName = `${visitId}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from("visit-recordings")
        .upload(fileName, audioBlob, { contentType: "audio/webm" });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast.error("Erreur lors de l'upload audio");
      }

      const audioUrl = uploadError ? null : fileName;

      // 2. Transcribe via ElevenLabs
      toast.info("Transcription en cours...");
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const transcribeRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-transcribe`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: formData,
        }
      );

      if (!transcribeRes.ok) {
        const err = await transcribeRes.json().catch(() => ({}));
        throw new Error(err.error || "Erreur de transcription");
      }

      const { text: transcribedText } = await transcribeRes.json();
      setTranscription(transcribedText);

      // 3. Generate summary via Lovable AI
      toast.info("Génération du résumé IA...");
      const { data: summaryData, error: summaryError } = await supabase.functions.invoke("visit-summary", {
        body: { transcription: transcribedText, client_name: clientName, visit_date: visitDate },
      });

      if (summaryError) {
        let msg = summaryError.message;
        try {
          if (summaryError.context && typeof summaryError.context.json === "function") {
            const body = await summaryError.context.json();
            msg = body?.error || msg;
          }
        } catch {}
        console.error("Summary error:", msg);
        toast.error("Erreur lors du résumé IA");
      }

      const generatedSummary = summaryData?.summary || "";
      setSummary(generatedSummary);

      // 4. Update visit record
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
      toast.success("Enregistrement traité avec succès !");
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
    setTranscription("");
    setSummary("");
    onOpenChange(false);
    onComplete();
  };

  const formatDuration = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>🎙️ Enregistrer l'échange — {clientName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {step === "ready" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <p className="text-sm text-muted-foreground text-center">
                Cliquez pour démarrer l'enregistrement de votre échange avec le client.
              </p>
              <Button size="lg" onClick={startRecording} className="gap-2">
                <Mic className="h-5 w-5" /> Enregistrer l'échange
              </Button>
            </div>
          )}

          {step === "recording" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="relative flex items-center justify-center">
                <span className="absolute inline-flex h-16 w-16 animate-ping rounded-full bg-destructive/30" />
                <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-destructive">
                  <Mic className="h-6 w-6 text-destructive-foreground" />
                </span>
              </div>
              <p className="text-2xl font-mono font-bold">{formatDuration(duration)}</p>
              <p className="text-sm text-muted-foreground">Enregistrement en cours…</p>
              <Button variant="destructive" onClick={processAudio} className="gap-2">
                <Square className="h-4 w-4" /> Arrêter l'enregistrement
              </Button>
            </div>
          )}

          {step === "processing" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Transcription et analyse en cours…</p>
            </div>
          )}

          {step === "done" && (
            <>
              <div>
                <Label>Transcription</Label>
                <Textarea value={transcription} readOnly rows={5} className="mt-1 bg-muted/50" />
              </div>
              <div>
                <Label>Résumé IA</Label>
                <Textarea value={summary} readOnly rows={6} className="mt-1 bg-muted/50" />
              </div>
              <div className="flex items-center gap-2 text-sm text-success">
                <CheckCircle className="h-4 w-4" />
                Données sauvegardées dans la fiche visite
              </div>
              <Button onClick={handleClose} className="w-full">Terminer</Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
