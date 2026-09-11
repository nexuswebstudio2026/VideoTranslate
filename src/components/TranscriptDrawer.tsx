import React, { useState } from "react";
import { X, Download, Volume2, Search, Copy, Check, Sparkles } from "lucide-react";
import { SubtitleItem, AppTheme } from "../types";
import { speakTranslation } from "../utils/translator";

interface TranscriptDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  subtitles: SubtitleItem[];
  theme: AppTheme;
}

export const TranscriptDrawer: React.FC<TranscriptDrawerProps> = ({
  isOpen,
  onClose,
  subtitles,
  theme,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const isDark = theme === "dark";

  if (!isOpen) return null;

  const filtered = subtitles.filter(
    (s) =>
      s.originalText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.translatedText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.speakerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopy = (item: SubtitleItem) => {
    const textToCopy = `${item.speakerName} (${item.speakerLocation}): "${item.originalText}"\nTraducción: "${item.translatedText}"`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = () => {
    const lines = subtitles.map(
      (s) =>
        `[${s.timestamp}] ${s.speakerName} (${s.speakerLocation})\nOriginal (${s.sourceLang}): "${s.originalText}"\nTraducción (${s.targetLang}): "${s.translatedText}"\n`
    );
    const content = `Historial de Videollamada - VozSinFronteras\nFecha: ${new Date().toLocaleDateString()}\n-------------------------------------------------\n\n` + lines.join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `videollamada-colombia-boston-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="transcript-drawer"
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-all"
    >
      <div
        className={`w-full max-w-md h-full flex flex-col border-l shadow-2xl transition-all ${
          isDark
            ? "bg-slate-950 border-slate-800 text-slate-100"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="font-bold text-base">Registro de Conversación</h2>
              <p className="text-xs text-slate-400">
                {subtitles.length} frases traducidas en vivo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {subtitles.length > 0 && (
              <button
                id="download-transcript-btn"
                onClick={handleDownload}
                className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all ${
                  isDark
                    ? "bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300"
                    : "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700"
                }`}
                title="Descargar conversación completa"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exportar</span>
              </button>
            )}

            <button
              id="close-transcript-btn"
              onClick={onClose}
              className={`p-2 rounded-xl transition-all ${
                isDark ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-600"
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="p-3 border-b border-slate-800/60">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en la conversación..."
              className={`w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border transition-all focus:outline-hidden ${
                isDark
                  ? "bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-indigo-500"
                  : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500"
              }`}
            />
          </div>
        </div>

        {/* List of Subtitles */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 text-xs">
              <p>Aún no hay frases registradas.</p>
              <p className="mt-1 text-slate-500">
                Habla o usa las frases rápidas para ver la traducción instantánea aquí.
              </p>
            </div>
          ) : (
            filtered.map((item) => {
              const isBoston = item.speakerLocation.toLowerCase().includes("boston") || item.sourceLang === "en";
              const flag = isBoston ? "🇺🇸" : "🇨🇴";
              const targetFlag = isBoston ? "🇨🇴" : "🇺🇸";

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-2xl border transition-all ${
                    isDark
                      ? "bg-slate-900/70 border-slate-800/90"
                      : "bg-slate-50 border-slate-200 shadow-2xs"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                    <span className="font-bold flex items-center gap-1 text-slate-300">
                      <span>{flag}</span>
                      <span>{item.speakerName}</span>
                    </span>
                    <span>{item.timestamp}</span>
                  </div>

                  {/* Spoken original */}
                  <p className="text-xs sm:text-sm font-medium text-slate-300 mb-2">
                    "{item.originalText}"
                  </p>

                  {/* Translation */}
                  <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-indigo-300 flex items-start justify-between gap-2">
                    <div className="text-xs font-semibold">
                      <span className="text-[10px] text-indigo-400 block uppercase tracking-wider mb-0.5">
                        {targetFlag} Traducción:
                      </span>
                      "{item.translatedText}"
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => speakTranslation(item.translatedText, item.targetLang)}
                        className="p-1.5 rounded-lg hover:bg-indigo-900/60 text-indigo-300 transition-all"
                        title="Escuchar"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleCopy(item)}
                        className="p-1.5 rounded-lg hover:bg-indigo-900/60 text-indigo-300 transition-all"
                        title="Copiar texto"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
