"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type CaptureStatus = "idle" | "recording" | "processing" | "done";

const MEDIARECORDER_SUPPORTED =
  typeof window !== "undefined" && typeof window.MediaRecorder === "function";

function getPreferredMimeType(): string {
  if (typeof window === "undefined") return "";
  const types = ["audio/webm", "audio/webm;codecs=opus", "audio/ogg", "audio/mp4"];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

export interface CaptureCardProps {
  captureStatus: CaptureStatus;
  onStartProcessing: () => void;
  onUploadChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function CaptureCard({
  captureStatus,
  onStartProcessing,
  onUploadChange,
}: CaptureCardProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const revokeRecordedUrl = useCallback((url: string | null) => {
    if (url) {
      URL.revokeObjectURL(url);
    }
  }, []);

  const clearRecording = useCallback(() => {
    setRecordedBlobUrl(null);
    setRecordError(null);
    setRecordingSeconds(0);
  }, []);

  useEffect(() => {
    return () => {
      revokeRecordedUrl(recordedBlobUrl);
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, [recordedBlobUrl, revokeRecordedUrl]);

  const startRecording = useCallback(async () => {
    if (!MEDIARECORDER_SUPPORTED) {
      setRecordError("Recording not supported in this browser—use Upload audio.");
      toast.error("Recording not supported");
      return;
    }
    setRecordError(null);
    setRecordedBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getPreferredMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (chunksRef.current.length === 0) return;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        setRecordedBlobUrl(url);
      };

      recorder.onerror = () => {
        setRecordError("Recording failed.");
        toast.error("Recording failed");
      };

      recorder.start(200);
      setIsRecording(true);
      setRecordingSeconds(0);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      setRecordError("Microphone access denied or unavailable. Use Upload audio instead.");
      toast.error("Microphone access denied");
      console.warn("getUserMedia error:", err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
  }, []);

  const handleUseRecording = useCallback(() => {
    if (!recordedBlobUrl) return;
    onStartProcessing();
  }, [recordedBlobUrl, onStartProcessing]);

  const isProcessing = captureStatus === "processing";
  const isDisabled = isProcessing || isRecording;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Capture</CardTitle>
        <CardDescription>
          Start recording or upload an audio file. We&apos;ll turn it into a structured
          visit summary.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!MEDIARECORDER_SUPPORTED && (
          <p className="rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
            Recording not supported in this browser—use Upload audio.
          </p>
        )}

        {recordError && (
          <p className="rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-800">
            {recordError}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {!isRecording ? (
            <Button
              size="sm"
              onClick={startRecording}
              disabled={isDisabled || !MEDIARECORDER_SUPPORTED}
            >
              Start Recording
            </Button>
          ) : (
            <Button size="sm" variant="destructive" onClick={stopRecording}>
              Stop Recording
            </Button>
          )}

          <label className="inline-flex cursor-pointer">
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={onUploadChange}
              disabled={isDisabled}
            />
            <span
              className={
                isDisabled
                  ? "inline-flex h-8 items-center rounded-md border border-zinc-200 bg-zinc-50 px-3 text-xs font-medium text-zinc-500"
                  : "inline-flex h-8 cursor-pointer items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              }
            >
              {isProcessing ? "Processing…" : "Upload audio"}
            </span>
          </label>

          {recordedBlobUrl && !isRecording && (
            <>
              <Button size="sm" variant="secondary" onClick={handleUseRecording} disabled={isProcessing}>
                Use Recording
              </Button>
              <Button size="sm" variant="outline" onClick={clearRecording} disabled={isProcessing}>
                Clear Recording
              </Button>
            </>
          )}
        </div>

        {isRecording && (
          <p className="text-xs text-red-600 font-medium">
            Recording… {Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, "0")}
          </p>
        )}

        {recordedBlobUrl && !isRecording && (
          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Playback
            </p>
            <audio controls src={recordedBlobUrl} className="w-full max-w-md" />
          </div>
        )}

        <p className="text-xs text-zinc-500">
          Status:{" "}
          <span
            className={
              isRecording
                ? "text-red-600 font-medium"
                : captureStatus === "processing"
                  ? "text-amber-600 font-medium"
                  : captureStatus === "done"
                    ? "text-emerald-600 font-medium"
                    : ""
            }
          >
            {isRecording
              ? "Recording"
              : captureStatus.charAt(0).toUpperCase() + captureStatus.slice(1)}
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
