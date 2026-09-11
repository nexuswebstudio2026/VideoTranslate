import React, { useState } from "react";
import { Send, Sparkles, MessageSquare, Bot } from "lucide-react";
import { AppTheme } from "../types";

interface QuickPhraseBarProps {
  theme: AppTheme;
  onSendLocalPhrase: (text: string) => void;
  onSendRemotePhrase: (text: string) => void;
  isTranslating: boolean;
}

export const QuickPhraseBar: React.FC<QuickPhraseBarProps> = ({
  theme,
  onSendLocalPhrase,
  onSendRemotePhrase,
  isTranslating,
}) => {
  const [customText, setCustomText] = useState("");
  const [speakerMode, setSpeakerMode] = useState<"colombia" | "boston">("colombia");
  const isDark = theme === "dark";

  const colombianPhrases = [
    "¡Hola amiga! ¿Cómo estás en Boston?",
    "¿Qué tal el frío por allá hoy?",
    "Acá en Colombia disfrutando de un café delicioso.",
    "Te escucho y te veo perfecto en la videollamada.",
    "¡Qué alegría verte de nuevo!",
  ];

  const bostonPhrases = [
    "Hey! So good to see you! How is Colombia?",
    "It's wicked chilly here in Boston today!",
    "Can you see and hear me clearly?",
    "I really miss traveling to see you!",
    "The translation appears right on time on my screen!",
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;

    if (speakerMode === "colombia") {
      onSendLocalPhrase(customText.trim());
    } else {
      onSendRemotePhrase(customText.trim());
    }
    setCustomText("");
  };

  return (
    <div
      id="quick-phrase-bar"
      className={`w-full max-w-4xl mx-auto p-3 sm:p-4 rounded-3xl border transition-all duration-200 shadow-md ${
        isDark
          ? "bg-slate-900/70 border-slate-800 text-slate-200"
          : "bg-white/80 border-slate-200 text-slate-800"
      }`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Prueba Rápida de Voz y Traducción Instantánea
          </span>
        </div>

        {/* Toggle who speaks for the quick tests */}
        <div className="flex items-center p-1 rounded-xl bg-slate-800/40 border border-slate-700/50 text-xs">
          <button
            type="button"
            onClick={() => setSpeakerMode("colombia")}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              speakerMode === "colombia"
                ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            🇨🇴 Tú (Hablas Español)
          </button>
          <button
            type="button"
            onClick={() => setSpeakerMode("boston")}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              speakerMode === "boston"
                ? "bg-indigo-600 text-white font-bold shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            🇺🇸 Sarah (Habla Inglés)
          </button>
        </div>
      </div>

      {/* Suggested clickable chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {(speakerMode === "colombia" ? colombianPhrases : bostonPhrases).map((phrase, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              if (speakerMode === "colombia") {
                onSendLocalPhrase(phrase);
              } else {
                onSendRemotePhrase(phrase);
              }
            }}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-all ${
              isDark
                ? "bg-slate-800/60 hover:bg-slate-700/80 border-slate-700 text-slate-300 hover:text-white"
                : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
            }`}
          >
            "{phrase}"
          </button>
        ))}
      </div>

      {/* Custom input bar */}
      <form onSubmit={handleSubmit} className="mt-2 flex items-center gap-2">
        <div className="relative flex-1">
          <input
            id="custom-phrase-input"
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder={
              speakerMode === "colombia"
                ? "Escribe lo que hablarías en español (ej: ¡Hola parce, qué tal el clima en Boston?)..."
                : "Type what Sarah says in English (e.g.: Hey! How is the weather in Colombia today?)..."
            }
            className={`w-full pl-3.5 pr-10 py-2 rounded-2xl text-xs sm:text-sm border transition-all focus:outline-hidden focus:ring-2 focus:ring-indigo-500 ${
              isDark
                ? "bg-slate-950/80 border-slate-700 text-slate-100 placeholder-slate-500"
                : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400"
            }`}
          />
        </div>

        <button
          id="send-phrase-btn"
          type="submit"
          disabled={!customText.trim() || isTranslating}
          className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Pronunciar</span>
        </button>
      </form>
    </div>
  );
};
