import React, { useState } from "react";
import { Camera, Mic, MapPin, CheckCircle, AlertCircle, ShieldAlert, Sparkles } from "lucide-react";
import { PermissionsState } from "../types";

interface PermissionRequestModalProps {
  isOpen: boolean;
  permissions: PermissionsState;
  onRequestPermissions: () => Promise<void>;
  onSkip?: () => void;
  isDark?: boolean;
}

export const PermissionRequestModal: React.FC<PermissionRequestModalProps> = ({
  isOpen,
  permissions,
  onRequestPermissions,
  onSkip,
  isDark = true,
}) => {
  const [isRequesting, setIsRequesting] = useState(false);

  if (!isOpen) return null;

  const handleGrant = async () => {
    setIsRequesting(true);
    try {
      await onRequestPermissions();
    } finally {
      setIsRequesting(false);
    }
  };

  const isAllGranted =
    permissions.camera === "granted" &&
    permissions.microphone === "granted" &&
    permissions.location === "granted";

  return (
    <div
      id="permission-prompt-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <div
        className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden transition-all duration-300 ${
          isDark
            ? "bg-slate-950/95 border-slate-800 text-slate-100"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border-b border-slate-800 text-white text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-500 flex items-center justify-center shadow-lg text-white mb-3">
            <Sparkles className="w-7 h-7 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Permisos de Videollamada</h2>
          <p className="text-xs text-slate-300 mt-1">
            Para la traducción instantánea bilateral y verificación de ciudad
          </p>
        </div>

        {/* Permissions list */}
        <div className="p-6 space-y-3">
          {/* Cámara */}
          <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-800 bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Cámara de Video</p>
                <p className="text-[11px] text-slate-400">Para verte con tu compañera en tiempo real</p>
              </div>
            </div>
            {permissions.camera === "granted" ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : permissions.camera === "denied" ? (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            ) : (
              <span className="text-[10px] uppercase font-bold text-amber-400 px-2 py-0.5 rounded-full bg-amber-400/10">
                Requerido
              </span>
            )}
          </div>

          {/* Micrófono */}
          <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-800 bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Micrófono & Voz</p>
                <p className="text-[11px] text-slate-400">Para transcripción y traducción IA instantánea</p>
              </div>
            </div>
            {permissions.microphone === "granted" ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : permissions.microphone === "denied" ? (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            ) : (
              <span className="text-[10px] uppercase font-bold text-amber-400 px-2 py-0.5 rounded-full bg-amber-400/10">
                Requerido
              </span>
            )}
          </div>

          {/* Ubicación */}
          <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-800 bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Ubicación (GPS / Ciudad)</p>
                <p className="text-[11px] text-slate-400">
                  {permissions.locationName || "Sincroniza zona horaria (Bogotá / Boston)"}
                </p>
              </div>
            </div>
            {permissions.location === "granted" ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : permissions.location === "denied" ? (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            ) : (
              <span className="text-[10px] uppercase font-bold text-amber-400 px-2 py-0.5 rounded-full bg-amber-400/10">
                Requerido
              </span>
            )}
          </div>

          <div className="pt-2">
            <button
              id="grant-all-permissions-btn"
              type="button"
              disabled={isRequesting}
              onClick={handleGrant}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:opacity-95 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isRequesting ? (
                <span>Solicitando permisos en tu navegador...</span>
              ) : isAllGranted ? (
                <span>¡Permisos Concedidos! Entrar</span>
              ) : (
                <span>Permitir Cámara, Micrófono y Ubicación</span>
              )}
            </button>

            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="w-full mt-2 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Continuar con permisos predeterminados
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
