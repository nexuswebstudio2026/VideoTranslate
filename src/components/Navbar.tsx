import React, { useState, useEffect } from "react";
import {
  Sun,
  Moon,
  Share2,
  Check,
  Globe,
  Clock,
  Radio,
  FileText,
  Sliders,
  Sparkles,
  User,
  LogOut,
  MapPin,
  FileSpreadsheet,
} from "lucide-react";
import { AppTheme, UserAccount } from "../types";

interface NavbarProps {
  theme: AppTheme;
  onToggleTheme: () => void;
  roomId: string;
  onOpenTranscript: () => void;
  onOpenSettings: () => void;
  onOpenSheets?: () => void;
  transcriptCount: number;
  autoSpeak: boolean;
  onToggleAutoSpeak: () => void;
  currentUser: UserAccount | null;
  onLogout: () => void;
  onSwitchUserPrompt: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  theme,
  onToggleTheme,
  roomId,
  onOpenTranscript,
  onOpenSettings,
  onOpenSheets,
  transcriptCount,
  autoSpeak,
  onToggleAutoSpeak,
  currentUser,
  onLogout,
  onSwitchUserPrompt,
}) => {
  const [copied, setCopied] = useState(false);
  const [timeColombia, setTimeColombia] = useState("");
  const [timeBoston, setTimeBoston] = useState("");

  useEffect(() => {
    const updateTimes = () => {
      const now = new Date();
      setTimeColombia(
        now.toLocaleTimeString("es-CO", {
          timeZone: "America/Bogota",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
      setTimeBoston(
        now.toLocaleTimeString("en-US", {
          timeZone: "America/New_York",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };

    updateTimes();
    const interval = setInterval(updateTimes, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const isDark = theme === "dark";

  return (
    <header
      id="main-navbar"
      className={`w-full border-b transition-colors duration-200 z-30 ${
        isDark
          ? "bg-slate-950/80 border-slate-800/80 text-slate-100 backdrop-blur-md"
          : "bg-white/90 border-slate-200 text-slate-900 backdrop-blur-md shadow-xs"
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Brand & Connection Details */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 text-white shadow-md">
            <Globe className="w-5 h-5 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-base sm:text-lg">
                VozSinFronteras
              </span>
              <span
                className={`hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  isDark
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Traducción IA Activa
              </span>
            </div>
            <p
              className={`text-xs ${
                isDark ? "text-slate-400" : "text-slate-500"
              } hidden md:block`}
            >
              Colombia 🇨🇴 (Español) ⇄ Boston, EE. UU. 🇺🇸 (Inglés)
            </p>
          </div>
        </div>

        {/* Live dual clocks for both cities */}
        <div className="hidden lg:flex items-center gap-4 text-xs font-medium">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
              isDark
                ? "bg-slate-900/60 border-slate-800 text-slate-300"
                : "bg-slate-50 border-slate-200 text-slate-700"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>🇨🇴 Bogotá:</span>
            <span className="font-semibold">{timeColombia || "12:00 PM"}</span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
              isDark
                ? "bg-slate-900/60 border-slate-800 text-slate-300"
                : "bg-slate-50 border-slate-200 text-slate-700"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>🇺🇸 Boston:</span>
            <span className="font-semibold">{timeBoston || "01:00 PM"}</span>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Current User Badge & Switcher */}
          {currentUser && (
            <div className="flex items-center gap-1.5">
              <button
                id="user-profile-badge"
                type="button"
                onClick={onSwitchUserPrompt}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs transition-all ${
                  currentUser.countryCode === "US"
                    ? "bg-indigo-950/60 border-indigo-500/40 text-indigo-200 hover:bg-indigo-900/60"
                    : "bg-emerald-950/60 border-emerald-500/40 text-emerald-200 hover:bg-emerald-900/60"
                }`}
                title="Haz clic para cambiar entre tu cuenta (Colombia) o la de tu amiga (Boston)"
              >
                <span className="text-base">{currentUser.countryCode === "US" ? "🇺🇸" : "🇨🇴"}</span>
                <div className="flex flex-col text-left">
                  <span className="font-bold leading-tight line-clamp-1">{currentUser.displayName}</span>
                  <span className="text-[10px] text-slate-400 leading-tight">
                    {currentUser.city || currentUser.locationName}
                  </span>
                </div>
              </button>

              <button
                id="logout-btn"
                type="button"
                onClick={onLogout}
                className={`p-2 rounded-xl text-slate-400 hover:text-rose-400 transition-colors ${
                  isDark ? "hover:bg-slate-900" : "hover:bg-slate-100"
                }`}
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Share room */}
          <button
            id="copy-room-link-btn"
            onClick={handleCopyLink}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              copied
                ? "bg-emerald-600 text-white shadow-xs"
                : isDark
                ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                : "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300"
            }`}
            title="Compartir enlace para que tu amiga en Boston se conecte"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">¡Enlace Copiado!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Invitar a Boston</span>
              </>
            )}
          </button>

          {/* Transcript History Drawer Button */}
          <button
            id="open-transcript-btn"
            onClick={onOpenTranscript}
            className={`relative p-2 rounded-lg text-sm transition-colors ${
              isDark
                ? "bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
            }`}
            title="Historial de Conversación y Subtítulos"
          >
            <FileText className="w-4 h-4" />
            {transcriptCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-[10px] font-bold text-white rounded-full flex items-center justify-center">
                {transcriptCount > 99 ? "99+" : transcriptCount}
              </span>
            )}
          </button>

          {/* Google Sheets Database */}
          {onOpenSheets && (
            <button
              id="open-sheets-btn"
              onClick={onOpenSheets}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                isDark
                  ? "bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40"
                  : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300"
              }`}
              title="Base de Datos en Google Sheets (Usuario, Contraseña, Ubicación)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden xl:inline">Google Sheets</span>
            </button>
          )}

          {/* Settings modal */}
          <button
            id="open-settings-btn"
            onClick={onOpenSettings}
            className={`p-2 rounded-lg text-sm transition-colors ${
              isDark
                ? "bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
            }`}
            title="Ajustes de traducción y video"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Modo Día / Noche Toggle */}
          <button
            id="theme-toggle-btn"
            onClick={onToggleTheme}
            aria-label="Cambiar entre modo día y noche"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isDark
                ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "bg-slate-900 hover:bg-slate-800 text-slate-100 shadow-xs"
            }`}
            title={isDark ? "Cambiar a Modo Día" : "Cambiar a Modo Noche"}
          >
            {isDark ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Modo Día</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-slate-200" />
                <span className="hidden sm:inline">Modo Noche</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
