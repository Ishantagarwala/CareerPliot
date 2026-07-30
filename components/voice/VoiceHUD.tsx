"use client";

import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { VoiceState, SupportedLanguage } from "./useVoice";

interface VoiceHUDProps {
  status: VoiceState;
  transcript: string;
  onTranscriptChange: (text: string) => void;
  onStartRecord: () => void;
  onStopRecord: () => void;
  onSubmit: (text: string) => void;
  onCancel: () => void;
  languages: SupportedLanguage[];
  selectedLanguage: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
}

export default function VoiceHUD({
  status,
  transcript,
  onTranscriptChange,
  onStartRecord,
  onStopRecord,
  onSubmit,
  onCancel,
  languages,
  selectedLanguage,
  onLanguageChange,
}: VoiceHUDProps) {
  const [editingText, setEditingText] = useState("");

  useEffect(() => {
    setEditingText(transcript);
  }, [transcript]);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/85 backdrop-blur-xs" onClick={onCancel} />

      {/* Main panel */}
      <div className="relative w-full max-w-md bg-[#0A0A0C] border-2 border-[#262626] p-6 rounded-[8px] shadow-2xl z-[1001] text-center space-y-6 overflow-hidden animate-scale-in">
        {/* Animated Superhero Command Center Theme Background Glows */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.05)_0%,rgba(14,165,233,0.05)_50%,transparent_100%)] pointer-events-none" />
        
        {/* Header HUD Info */}
        <div className="flex justify-between items-center border-b border-[#262626] pb-3 mb-2">
          <div className="font-mono text-[9px] text-[#8e9192] tracking-widest">
            VOICE CONVERSATION INTERFACE
          </div>
          
          {/* Language Picker Dropdown */}
          <div className="flex items-center gap-1 bg-[#16161a] border border-[#262626] px-2 py-0.5 rounded cursor-pointer">
            <span className="material-symbols-outlined text-[12px] text-cyan-400">translate</span>
            <select
              value={selectedLanguage.code}
              onChange={(e) => {
                const found = languages.find((l) => l.code === e.target.value);
                if (found) onLanguageChange(found);
              }}
              className="bg-transparent text-[10px] font-mono font-bold text-white border-0 outline-none p-0 cursor-pointer focus:ring-0"
              style={{ colorScheme: "dark" }}
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code} className="bg-[#131315] text-white">
                  {l.nativeName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Animated States and waveforms */}
        <div className="flex flex-col items-center space-y-4">
          {status === "listening" && (
            <div className="relative flex items-center justify-center h-24 w-24">
              {/* Pulsing Spidey Energy Rings */}
              <span className="absolute inset-0 rounded-full bg-cyan-500/10 animate-ping" />
              <span className="absolute inset-2 rounded-full bg-cyan-500/20 animate-pulse" />
              
              <button
                onClick={onStopRecord}
                className="relative h-16 w-16 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.5)] transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[28px] animate-pulse">mic</span>
              </button>
            </div>
          )}

          {status === "processing" && (
            <div className="relative flex items-center justify-center h-24 w-24">
              <svg viewBox="0 0 50 50" className="w-20 h-20 text-cyan-400 fill-none stroke-current animate-spin-slow" strokeWidth="1.5">
                <circle cx="25" cy="25" r="20" strokeDasharray="30,10" />
                <circle cx="25" cy="25" r="14" strokeDasharray="15,8" className="opacity-70" />
                <circle cx="25" cy="25" r="8" className="opacity-40" />
              </svg>
              <span className="absolute material-symbols-outlined text-[24px] text-cyan-400 animate-pulse">psychology</span>
            </div>
          )}

          {status === "speaking" && (
            <div className="relative flex items-center justify-center h-24 w-24">
              <span className="absolute inset-0 rounded-full bg-cyan-400/10 animate-ping" />
              <div className="flex items-center gap-1 h-12">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 bg-cyan-400 rounded-full animate-bounce"
                    style={{
                      height: `${12 + Math.random() * 28}px`,
                      animationDelay: `${i * 100}ms`,
                      animationDuration: "0.6s",
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {status === "idle" && (
            <div className="relative flex items-center justify-center h-24 w-24">
              <button
                onClick={onStartRecord}
                className="h-16 w-16 bg-[#1C1C22] border-2 border-cyan-500/50 hover:border-cyan-400 hover:bg-[#25252e] text-cyan-400 rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[28px]">mic</span>
              </button>
            </div>
          )}

          {status === "error" && (
            <div className="relative flex items-center justify-center h-24 w-24">
              <div className="h-16 w-16 bg-red-950/20 border border-red-500 rounded-full flex items-center justify-center text-red-500 shadow-lg">
                <span className="material-symbols-outlined text-[28px]">error</span>
              </div>
            </div>
          )}

          {/* Status Label text */}
          <div className="text-sm font-bold font-mono tracking-wide">
            {status === "listening" && <span className="text-red-500 animate-pulse">● LISTENING...</span>}
            {status === "processing" && <span className="text-cyan-400">THINKING...</span>}
            {status === "speaking" && <span className="text-cyan-400">SPEAKING...</span>}
            {status === "idle" && <span className="text-[#8e9192]">TAP MIC TO TALK</span>}
            {status === "error" && <span className="text-red-400">ERROR OCCURRED</span>}
          </div>
        </div>

        {/* Transcript Box Area */}
        {status !== "processing" && (transcript || editingText) && (
          <div className="space-y-3 text-left">
            <label className="block text-[10px] font-mono text-[#8e9192] uppercase">
              Transcript (Verify/Edit below):
            </label>
            <textarea
              value={editingText}
              onChange={(e) => {
                setEditingText(e.target.value);
                onTranscriptChange(e.target.value);
              }}
              className="w-full bg-[#131316] border border-[#262626] rounded p-3 text-xs text-white placeholder:text-[#404042] min-h-[80px] focus:border-cyan-500 focus:outline-none resize-none"
              placeholder="Speak or edit transcript here..."
            />

            {/* Editing and Confirmation fallbacks */}
            <div className="flex gap-2">
              <button
                onClick={onStartRecord}
                className="flex-1 py-2 border border-[#262626] hover:bg-[#1C1C22] text-[#8e9192] hover:text-white font-mono text-[11px] rounded"
              >
                RETRY AUDIO
              </button>
              <button
                onClick={() => onSubmit(editingText)}
                disabled={!editingText.trim()}
                className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold font-mono text-[11px] rounded"
              >
                SUBMIT ANSWER
              </button>
            </div>
          </div>
        )}

        {/* Cancel and Type fallback buttons */}
        <div className="flex flex-col gap-2 pt-2 border-t border-[#262626]">
          <button
            onClick={onCancel}
            className="w-full py-2 bg-transparent text-[#8e9192] hover:text-white font-mono text-[11px] hover:underline"
          >
            Type answers instead
          </button>
        </div>
      </div>
    </div>
  );
}
