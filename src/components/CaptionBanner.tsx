import React from "react";
import { Volume2, Sparkles, Languages, CheckCheck } from "lucide-react";
import { SubtitleItem, AppTheme } from "../types";
import { speakTranslation } from "../utils/translator";

interface CaptionBannerProps {
  subtitle: SubtitleItem | null;
  interimText?: string;
  isSpeaking: boolean;
  theme: AppTheme;
  fontSize?: "sm" | "base" | "lg" | "xl";
  showAudioButton?: boolean;
}

export const CaptionBanner: React.FC<CaptionBannerProps> = ({
  subtitle,
  interimText,
  isSpeaking,
  theme,
  fontSize = "base",
  showAudioButton = true,
}) => {
  const isDark = theme === "dark";

  if (!subtitle && !interimText) {
    return (
      <div
        id="empty-caption-placeholder"
        className={`w-full py-2.5 px-4 rounded-xl border flex items-center justify-center gap-2 text-xs transition-colors ${
          isDark
            ? "bg-slate-900/60 border-slate-800/80 text-slate-400"
            : "bg-white/80 border-slate-200 text-slate-500"
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>Esperando que alguien hable... La traducción instantánea aparecerá aquí automáticamente</span>
      </div>
    );
  }

  // Determine language labels and flags
  const isBostonSpeaker = subtitle?.speakerLocation.toLowerCase().includes("boston") || subtitle?.sourceLang === "en";
  const speakerFlag = isBostonSpeaker ? "🇺🇸" : "🇨🇴";
  const targetFlag = isBostonSpeaker ? "🇨🇴" : "🇺🇸";
  const sourceLangName = isBostonSpeaker ? "Inglés (Boston)" : "Español (Colombia)";
  const targetLangName = isBostonSpeaker ? "Español (Colombia)" : "Inglés (Boston)";

  const fontClasses = {
    sm: "text-xs md:text-sm",
    base: "text-sm md:text-base",
    lg: "text-base md:text-lg",
    xl: "text-lg md:text-xl",
  }[fontSize];

  return (
    <div
      id="live-caption-banner"
      className={`w-full p-3.5 sm:p-4 rounded-2xl border backdrop-blur-md shadow-lg transition-all duration-300 relative overflow-hidden ${
        isDark
          ? "bg-slate-950/85 border-slate-700/80 text-slate-100"
          : "bg-white/95 border-slate-300/90 text-slate-900 shadow-slate-200/50"
      }`}
    >
      {/* Subtle top indicator bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500" />

      {/* Row 1: Spoken Original */}
      <div className="flex items-start justify-between gap-3 pb-2 border-b border-dashed border-slate-700/30">
        <div className="space-y-1 w-full">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-500/15 text-slate-400">
              <span>{speakerFlag}</span>
              <span>{subtitle?.speakerName || "Hablante"} ({sourceLangName})</span>
            </span>
            {isSpeaking && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Hablando en vivo
              </span>
            )}
            <span className="text-[10px] text-slate-400 ml-auto">
              {subtitle?.timestamp}
            </span>
          </div>

          <p className={`${fontClasses} font-medium tracking-normal text-slate-300 leading-snug`}>
            {interimText ? (
              <span className="italic opacity-80">{interimText}...</span>
            ) : (
              `"${subtitle?.originalText}"`
            )}
          </p>
        </div>
      </div>

      {/* Row 2: Instant AI Translation directly underneath as requested */}
      <div className="pt-2 flex items-start justify-between gap-3">
        <div className="space-y-1 w-full">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{targetFlag} Traducción Instantánea ({targetLangName})</span>
            </span>
          </div>

          <p
            className={`${fontClasses} font-bold leading-snug tracking-tight text-amber-400 drop-shadow-xs`}
          >
            {subtitle?.translatedText ? (
              `"${subtitle.translatedText}"`
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
                Traduciendo instantáneamente con Gemini IA...
              </span>
            )}
          </p>
        </div>

        {/* Audio TTS replay button */}
        {showAudioButton && subtitle?.translatedText && (
          <button
            id="speak-translation-btn"
            onClick={() => speakTranslation(subtitle.translatedText, subtitle.targetLang)}
            className={`shrink-0 p-2 rounded-xl transition-all self-end ${
              isDark
                ? "bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30"
                : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200"
            }`}
            title="Escuchar pronunciación de la traducción"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
