"use client";

import React, { useState, useEffect } from "react";
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
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300" onClick={onCancel} />

      {/* Futuristic HUD Command Center Panel */}
      <div className="relative w-full max-w-md bg-[#070709]/95 border-2 border-cyan-500/20 p-6 rounded-2xl shadow-[0_0_60px_rgba(6,182,212,0.15)] z-[1001] text-center space-y-6 overflow-hidden animate-scale-in">
        
        {/* Subtle Cybernetic Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,255,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,6px_100%] pointer-events-none opacity-40" />
        
        {/* Red & Blue Superhero Aura Background Glows */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-red-600/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none" />

        {/* Top bar header info */}
        <div className="flex justify-between items-center border-b border-cyan-500/10 pb-3.5 mb-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-mono text-[9px] text-cyan-400/80 tracking-[0.2em] font-bold">
              SYS PROTOCOL // INTERACTIVE VOICE MODE
            </span>
          </div>
          
          {/* Language Selector Dropdown */}
          <div className="flex items-center gap-1.5 bg-[#0F0F13] border border-cyan-500/20 px-2.5 py-1 rounded-md cursor-pointer hover:border-cyan-400/50 transition-colors">
            <span className="material-symbols-outlined text-[13px] text-cyan-400">translate</span>
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
                <option key={l.code} value={l.code} className="bg-[#09090C] text-white">
                  {l.nativeName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dynamic circular waveform / animation states */}
        <div className="flex flex-col items-center space-y-4 relative z-10">
          
          {/* LISTENING STATE */}
          {status === "listening" && (
            <div className="relative flex items-center justify-center h-28 w-28">
              {/* Multiplying expanding Spidey rings */}
              <span className="absolute inset-0 rounded-full border-2 border-red-500/30 animate-ping" />
              <span className="absolute inset-2 rounded-full border border-cyan-400/40 animate-ping [animation-delay:0.3s]" />
              <span className="absolute inset-4 rounded-full bg-cyan-500/10 animate-pulse" />
              
              <button
                onClick={onStopRecord}
                className="relative h-16 w-16 bg-gradient-to-tr from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.5)] border-2 border-red-400/50 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[28px] animate-pulse">mic</span>
              </button>
            </div>
          )}

          {/* PROCESSING / THINKING STATE */}
          {status === "processing" && (
            <div className="relative flex items-center justify-center h-28 w-28">
              <svg viewBox="0 0 50 50" className="w-24 h-24 text-cyan-400 fill-none stroke-current animate-spin-slow" strokeWidth="1.5">
                <circle cx="25" cy="25" r="20" strokeDasharray="30,10" className="opacity-80" />
                <circle cx="25" cy="25" r="14" strokeDasharray="15,8" className="opacity-60" />
                <circle cx="25" cy="25" r="8" className="opacity-40" />
              </svg>
              <span className="absolute material-symbols-outlined text-[28px] text-cyan-400 animate-pulse">psychology</span>
            </div>
          )}

          {/* SPEAKING STATE */}
          {status === "speaking" && (
            <div className="relative flex items-center justify-center h-28 w-28">
              <span className="absolute inset-0 rounded-full border border-cyan-400/20 animate-ping" />
              <span className="absolute inset-2 rounded-full bg-cyan-400/5 animate-pulse" />
              <div className="flex items-end gap-1.5 h-12">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 bg-cyan-400 rounded-full animate-bounce"
                    style={{
                      height: `${16 + Math.random() * 24}px`,
                      animationDelay: `${i * 90}ms`,
                      animationDuration: "0.55s",
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* IDLE STATE */}
          {status === "idle" && (
            <div className="relative flex items-center justify-center h-28 w-28">
              <span className="absolute inset-0 rounded-full border border-cyan-500/10 animate-pulse" />
              <button
                onClick={onStartRecord}
                className="h-16 w-16 bg-[#0E0E12] border-2 border-cyan-500/50 hover:border-cyan-400 hover:bg-[#15151D] text-cyan-400 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[28px]">mic</span>
              </button>
            </div>
          )}

          {/* ERROR STATE */}
          {status === "error" && (
            <div className="relative flex items-center justify-center h-28 w-28">
              <div className="h-16 w-16 bg-red-950/20 border border-red-500/50 rounded-full flex items-center justify-center text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                <span className="material-symbols-outlined text-[28px] animate-pulse">error</span>
              </div>
            </div>
          )}

          {/* Dynamic Status Text label */}
          <div className="text-xs font-mono font-bold tracking-widest uppercase">
            {status === "listening" && <span className="text-red-500 animate-pulse">● RECORDING AUDIO...</span>}
            {status === "processing" && <span className="text-cyan-400">ANALYZING SIGNAL...</span>}
            {status === "speaking" && <span className="text-cyan-400">AUDIO OUTBOUND...</span>}
            {status === "idle" && <span className="text-[#8e9192]">MICROPHONE READY // TAP TO TALK</span>}
            {status === "error" && <span className="text-red-400">SIGNAL ERROR</span>}
          </div>
        </div>

        {/* Interactive Transcript Area (If any text detected or editing is active) */}
        {status !== "processing" && (transcript || editingText) && (
          <div className="space-y-3.5 text-left relative z-10 animate-fade-in-up">
            <div className="flex justify-between items-center">
              <label className="text-[9px] font-mono text-cyan-400/80 tracking-widest font-bold uppercase">
                TRANSCRIPT PREVIEW //
              </label>
              {status === "idle" && (
                <span className="text-[8px] font-mono text-[#8e9192]">EDITABLE</span>
              )}
            </div>
            
            <textarea
              value={editingText}
              onChange={(e) => {
                setEditingText(e.target.value);
                onTranscriptChange(e.target.value);
              }}
              className="w-full bg-[#09090C] border border-cyan-500/10 hover:border-cyan-500/25 focus:border-cyan-400 rounded-lg p-3 text-xs text-white placeholder:text-[#404042] min-h-[90px] focus:outline-none resize-none transition-all font-sans leading-relaxed shadow-inner"
              placeholder="Your voice translation will appear here. Tap microphone to record..."
            />

            {/* Submission controls */}
            <div className="flex gap-2.5">
              <button
                onClick={onStartRecord}
                className="flex-1 py-2.5 border border-cyan-500/25 hover:border-cyan-400 hover:bg-cyan-500/5 text-cyan-400 hover:text-white font-mono text-[10px] font-bold tracking-wider rounded-lg transition-colors cursor-pointer"
              >
                RE-RECORD
              </button>
              <button
                onClick={() => onSubmit(editingText)}
                disabled={!editingText.trim()}
                className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 disabled:from-[#111116] disabled:to-[#111116] disabled:border-white/5 disabled:opacity-30 disabled:text-[#8e9192] disabled:cursor-not-allowed text-black font-extrabold font-mono text-[10px] tracking-wider rounded-lg transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)] cursor-pointer"
              >
                SUBMIT PROTOCOL
              </button>
            </div>
          </div>
        )}

        {/* Keyboard typing fallback selector */}
        <div className="flex flex-col gap-2 pt-3 border-t border-cyan-500/10 relative z-10">
          <button
            onClick={onCancel}
            className="w-full py-2 bg-transparent text-[#8e9192] hover:text-cyan-400 font-mono text-[9px] tracking-widest font-bold uppercase transition-colors"
          >
            DISCONNECT VOICE // USE KEYBOARD PROTOCOL
          </button>
        </div>
      </div>
    </div>
  );
}
