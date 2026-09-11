import React from "react";
import { X, Sliders, Type, Volume2, Globe, Sparkles, Video } from "lucide-react";
import { AppTheme } from "../types";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: AppTheme;
  captionFontSize: "sm" | "base" | "lg" | "xl";
  onChangeFontSize: (size: "sm" | "base" | "lg" | "xl") => void;
  autoSpeak: boolean;
  onToggleAutoSpeak: () => void;
  translationTone: "friendly" | "neutral" | "exact";
  onChangeTone: (tone: "friendly" | "neutral" | "exact") => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  captionFontSize,
  onChangeFontSize,
  autoSpeak,
  onToggleAutoSpeak,
  translationTone,
  onChangeTone,
}) => {
  if (!isOpen) return null;
  const isDark = theme === "dark";

  return (
    <div
      id="settings-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    >
      <div
        className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden transition-all ${
          isDark
            ? "bg-slate-950 border-slate-800 text-slate-100"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <h2 className="font-bold text-base sm:text-lg">
              Ajustes de Traducción y Videollamada
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-all ${
              isDark ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-600"
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-6 text-sm">
          {/* Subtitle Font Size */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 font-semibold text-slate-300">
              <Type className="w-4 h-4 text-indigo-400" />
              <span>Tamaño de Subtítulos y Traducción</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(["sm", "base", "lg", "xl"] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => onChangeFontSize(size)}
                  className={`py-2 rounded-xl border text-xs font-semibold uppercase transition-all ${
                    captionFontSize === size
                      ? "bg-indigo-600 border-indigo-500 text-white shadow-xs"
                      : isDark
                      ? "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                      : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {size === "sm" ? "Pequeño" : size === "base" ? "Normal" : size === "lg" ? "Grande" : "X-Grande"}
                </button>
              ))}
            </div>
          </div>

          {/* Auto TTS Audio Speak */}
          <div className="flex items-center justify-between gap-4 p-3.5 rounded-2xl border border-slate-800/80 bg-slate-900/40">
            <div className="space-y-0.5">
              <label className="font-semibold flex items-center gap-2 text-slate-200">
                <Volume2 className="w-4 h-4 text-amber-400" />
                <span>Lectura de Voz en Audio</span>
              </label>
              <p className="text-xs text-slate-400">
                Pronuncia la traducción en voz alta mediante sintetizador al terminar cada frase.
              </p>
            </div>
            <input
              type="checkbox"
              checked={autoSpeak}
              onChange={onToggleAutoSpeak}
              className="w-5 h-5 rounded-md accent-indigo-600 cursor-pointer"
            />
          </div>

          {/* Translation Tone and Localization */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 font-semibold text-slate-300">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>Adaptación Cultural del Idioma</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "friendly", label: "Amistosa y Cercana", desc: "Modismos Colombia & Boston" },
                { id: "neutral", label: "Español Neutro", desc: "Fluidez estándar" },
                { id: "exact", label: "Literal", desc: "Traducción directa" },
              ].map((tone) => (
                <button
                  key={tone.id}
                  type="button"
                  onClick={() => onChangeTone(tone.id as any)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    translationTone === tone.id
                      ? "bg-indigo-600/20 border-indigo-500 text-indigo-300 font-semibold"
                      : isDark
                      ? "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300"
                      : "bg-slate-50 border-slate-200 text-slate-700"
                  }`}
                >
                  <p className="text-xs font-bold">{tone.label}</p>
                  <p className="text-[10px] opacity-80 mt-0.5">{tone.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Connection Info */}
          <div className="p-3.5 rounded-2xl border border-indigo-500/20 bg-indigo-950/20 text-xs text-slate-300 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-indigo-300">
                Optimizado para Colombia ⇄ Boston
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                El motor de Gemini 3.8 Flash detecta automáticamente matices de ambos idiomas para que la conversación fluya sin tropiezos ni malentendidos.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
