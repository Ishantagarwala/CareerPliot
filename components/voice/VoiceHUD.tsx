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
  suggestions?: string[];
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
  suggestions,
}: VoiceHUDProps) {
  const [editingText, setEditingText] = useState("");

  useEffect(() => {
    setEditingText(transcript);
  }, [transcript]);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity duration-300" 
        onClick={onCancel} 
      />

      {/* Neo-brutalist Panel */}
      <div className="relative w-full max-w-md bg-card border-4 border-black p-6 shadow-[8px_8px_0_0_#000] z-[1001] text-center space-y-6 overflow-hidden animate-scale-in text-card-foreground">
        
        {/* Top Right Close Button */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-3 right-3 h-8 w-8 border-2 border-black bg-white hover:bg-red-500 hover:text-white flex items-center justify-center shadow-[2px_2px_0_0_#000] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer text-black"
          title="Close voice mode"
        >
          <span className="material-symbols-outlined text-[18px] font-bold">close</span>
        </button>

        {/* Top bar header info */}
        <div className="flex justify-between items-center border-b-2 border-black pb-3.5 mb-2 relative z-10 pr-8">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full border border-black ${status === "listening" ? "bg-red-500 animate-pulse" : "bg-green-500"}`} />
            <span className="font-mono text-[9px] uppercase tracking-widest font-extrabold">
              Voice Assistant Protocol
            </span>
          </div>
          
          {/* Language Selector Dropdown */}
          <div className="flex items-center gap-1.5 bg-background border-2 border-black px-2.5 py-1 shadow-[2px_2px_0_0_#000] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer">
            <span className="material-symbols-outlined text-[13px] text-foreground">translate</span>
            <select
              value={selectedLanguage.code}
              onChange={(e) => {
                const found = languages.find((l) => l.code === e.target.value);
                if (found) onLanguageChange(found);
              }}
              className="bg-transparent text-[10px] font-mono font-bold text-foreground border-0 outline-none p-0 cursor-pointer focus:ring-0"
              style={{ colorScheme: "dark" }}
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code} className="bg-card text-foreground">
                  {l.nativeName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground font-medium max-w-xs mx-auto">
          Select your preferred language, tap the microphone to speak, and review/edit the text preview before submitting.
        </p>

        {/* Waveform / Animation States */}
        <div className="flex flex-col items-center space-y-4 relative z-10">
          
          {/* LISTENING STATE */}
          {status === "listening" && (
            <div className="relative flex items-center justify-center h-28 w-28">
              <span className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping" />
              <button
                onClick={onStopRecord}
                className="relative h-20 w-20 bg-red-500 border-4 border-black text-white rounded-full flex items-center justify-center shadow-[4px_4px_0_0_#000] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all transform active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[32px] animate-pulse">mic</span>
              </button>
            </div>
          )}

          {/* PROCESSING / THINKING STATE */}
          {status === "processing" && (
            <div className="relative flex items-center justify-center h-28 w-28">
              <div className="animate-spin h-16 w-16 border-4 border-black border-t-primary rounded-full shadow-[3px_3px_0_0_#000]" />
              <span className="absolute material-symbols-outlined text-[24px] text-foreground">psychology</span>
            </div>
          )}

          {/* SPEAKING STATE */}
          {status === "speaking" && (
            <div className="relative flex items-center justify-center h-28 w-28 bg-white border-4 border-black rounded-full shadow-[4px_4px_0_0_#000]">
              <div className="flex items-end gap-1 h-10">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 bg-black rounded-full animate-bounce"
                    style={{
                      height: `${12 + Math.random() * 20}px`,
                      animationDelay: `${i * 80}ms`,
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
              <button
                onClick={onStartRecord}
                className="h-20 w-20 bg-white hover:bg-neutral-100 text-black border-4 border-black rounded-full flex items-center justify-center shadow-[4px_4px_0_0_#000] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all transform active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[32px]">mic</span>
              </button>
            </div>
          )}

          {/* ERROR STATE */}
          {status === "error" && (
            <div className="relative flex items-center justify-center h-28 w-28">
              <div className="h-20 w-20 bg-red-100 text-red-600 border-4 border-black rounded-full flex items-center justify-center shadow-[4px_4px_0_0_#000]">
                <span className="material-symbols-outlined text-[32px]">error</span>
              </div>
            </div>
          )}

          {/* Dynamic Status Text label */}
          <div className="text-xs font-mono font-bold tracking-widest uppercase">
            {status === "listening" && <span className="text-red-600 animate-pulse">● RECORDING AUDIO...</span>}
            {status === "processing" && <span className="text-foreground">ANALYZING SIGNAL...</span>}
            {status === "speaking" && <span className="text-foreground">SPEAKING INBOUND...</span>}
            {status === "idle" && <span className="text-muted-foreground">TAP MICROPHONE TO TALK</span>}
            {status === "error" && <span className="text-red-600">SIGNAL ERROR</span>}
          </div>
        </div>

        {/* Interactive Transcript Area */}
        {status !== "processing" && (
          <div className="space-y-3.5 text-left relative z-10 animate-fade-in-up">
            {/* Suggested Options */}
            {suggestions && suggestions.length > 0 && (
              <div className="space-y-2 text-left relative z-10">
                <label className="text-[9px] font-mono text-foreground uppercase tracking-widest font-extrabold">
                  Suggested Options (Speak or Click to Add) //
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-[88px] overflow-y-auto pr-1 border border-black/10 p-2 bg-background/50 rounded-md">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        const currentText = editingText.trim();
                        const newText = currentText 
                          ? currentText.endsWith(",") || currentText.endsWith(".")
                            ? `${currentText} ${suggestion}`
                            : `${currentText}, ${suggestion}`
                          : suggestion;
                        setEditingText(newText);
                        onTranscriptChange(newText);
                      }}
                      className="px-2 py-1 border border-black bg-white hover:bg-primary hover:text-primary-foreground font-mono text-[9px] font-bold rounded shadow-[1px_1px_0_0_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer text-black"
                    >
                      + {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center">
              <label className="text-[9px] font-mono text-foreground uppercase tracking-widest font-extrabold">
                Transcript Preview //
              </label>
              {status === "idle" && (
                <span className="text-[8px] font-mono text-muted-foreground uppercase">Editable</span>
              )}
            </div>
            
            <textarea
              value={editingText}
              onChange={(e) => {
                setEditingText(e.target.value);
                onTranscriptChange(e.target.value);
              }}
              className="w-full bg-background border-2 border-black rounded-lg p-3 text-xs text-foreground placeholder:text-muted-foreground min-h-[90px] focus:outline-none resize-none transition-all leading-relaxed shadow-[3px_3px_0_0_#000]"
              placeholder="Speak in your selected language... Your words will appear here in real-time. You can also click here to type and edit."
            />

            {/* Submission controls */}
            <div className="flex gap-3">
              <button
                onClick={onStartRecord}
                className="flex-1 py-2.5 bg-white border-2 border-black hover:bg-neutral-100 text-black font-mono text-[10px] font-bold tracking-wider rounded-lg shadow-[3px_3px_0_0_#000] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
              >
                RE-RECORD
              </button>
              <button
                onClick={() => onSubmit(editingText)}
                disabled={!editingText.trim()}
                className="flex-1 py-2.5 bg-primary border-2 border-black text-primary-foreground font-extrabold font-mono text-[10px] tracking-wider rounded-lg shadow-[3px_3px_0_0_#000] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
              >
                SUBMIT PROTOCOL
              </button>
            </div>
          </div>
        )}

        {/* Keyboard typing fallback selector / Go Back */}
        <div className="flex flex-col gap-2 pt-3 border-t-2 border-black relative z-10">
          <button
            onClick={onCancel}
            className="w-full py-2 bg-white border-2 border-black hover:bg-red-500 hover:text-white text-black font-mono text-[10px] tracking-widest font-extrabold uppercase shadow-[3px_3px_0_0_#000] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
          >
            ← Cancel / Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
