"use client";

import { useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

type SpeechRecognitionEventLike = { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> };
type SpeechRecognitionLike = {
  continuous: boolean; interimResults: boolean; lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
  start(): void; stop(): void;
};

export function VoiceAnswer({ onTranscript, onStatus }: {
  onTranscript: (text: string) => void;
  onStatus: (status: "COMPLETED" | "FAILED" | "NOT_USED") => void;
}) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const startedAt = useRef(0);
  const finalText = useRef("");
  const [recording, setRecording] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  function start() {
    const SpeechRecognition = (window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
    if (!SpeechRecognition) { setUnsupported(true); onStatus("FAILED"); return; }
    const recognition = new SpeechRecognition();
    recognition.continuous = true; recognition.interimResults = true; recognition.lang = "zh-CN";
    finalText.current = ""; startedAt.current = Date.now();
    recognition.onresult = (event) => {
      let interim = "";
      for (let i = 0; i < event.results.length; i += 1) {
        const item = event.results[i];
        if (item.isFinal) finalText.current += item[0].transcript;
        else interim += item[0].transcript;
      }
      onTranscript((finalText.current + interim).trim());
    };
    recognition.onerror = () => { setRecording(false); onStatus("FAILED"); };
    recognition.onend = () => setRecording(false);
    recognitionRef.current = recognition; recognition.start(); setRecording(true);
  }

  function stop() {
    recognitionRef.current?.stop(); setRecording(false); onStatus("COMPLETED");
    const seconds = Math.max(1, (Date.now() - startedAt.current) / 1000);
    const text = finalText.current;
    const rate = Math.round(text.length / seconds * 60);
    const fillers = (text.match(/嗯|呃|然后|就是|那个|um|uh/gi) ?? []).length;
    setAnalysis(`约 ${rate} 字/分钟 · 口头禅 ${fillers} 次`);
  }

  return <div className="mt-3 flex flex-wrap items-center gap-2">
    <Button type="button" variant={recording ? "danger" : "secondary"} size="sm" onClick={recording ? stop : start}>
      {recording ? <MicOff className="size-4" /> : <Mic className="size-4" />}{recording ? "停止并转写" : "语音作答"}
    </Button>
    {recording ? <Badge tone="coral">正在聆听</Badge> : null}
    {analysis ? <span className="text-xs text-muted-foreground">{analysis}</span> : null}
    {unsupported ? <span className="text-xs text-destructive">当前浏览器不支持语音转写，请使用文字作答。</span> : null}
  </div>;
}
