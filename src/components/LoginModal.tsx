import React, { useState, useEffect } from "react";
import { UserAccount } from "../types";
import {
  Globe,
  Lock,
  User,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Languages,
  Sparkles,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import {
  detectUserLocation,
  DetectedLocation,
} from "../utils/geoDetector";
import {
  getAccessToken,
  googleSignIn,
} from "../lib/firebaseAuth";
import {
  getOrCreateSpreadsheet,
  saveUserToSheet,
  fetchUsersFromSheet,
  getSavedSpreadsheetId,
} from "../lib/googleSheetsService";

interface LoginModalProps {
  isOpen: boolean;
  onLoginSuccess: (user: UserAccount) => void;
  isDark?: boolean;
  onOpenSheetsModal?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onLoginSuccess,
  isDark = true,
  onOpenSheetsModal,
}) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Geolocation detection state
  const [detectedLocation, setDetectedLocation] = useState<DetectedLocation | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Google Sheets state
  const [sheetsSyncActive, setSheetsSyncActive] = useState(false);
  const [sheetsMessage, setSheetsMessage] = useState<string | null>(null);

  // Automatically request GPS location as soon as Login screen appears
  useEffect(() => {
    if (isOpen) {
      triggerLocationDetection();
    }
  }, [isOpen]);

  const triggerLocationDetection = async () => {
    setIsDetectingLocation(true);
    setLocationError(null);
    try {
      const loc = await detectUserLocation();
      setDetectedLocation(loc);
    } catch (err: any) {
      console.warn("Location error:", err);
      setLocationError("No se pudo obtener el GPS; se usó detección de zona horaria.");
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleManualLocationSwitch = (country: "Colombia" | "Estados Unidos") => {
    if (country === "Colombia") {
      setDetectedLocation({
        country: "Colombia",
        countryCode: "CO",
        city: "Bogotá",
        locationName: "Bogotá, Colombia",
        role: "colombia",
        nativeLanguage: "es",
        targetLanguage: "en",
        flag: "🇨🇴",
        method: "timezone",
      });
    } else {
      setDetectedLocation({
        country: "Estados Unidos",
        countryCode: "US",
        city: "Boston, MA",
        locationName: "Boston, Massachusetts, EE. UU.",
        role: "boston",
        nativeLanguage: "en",
        targetLanguage: "es",
        flag: "🇺🇸",
        method: "timezone",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    const activeLoc = detectedLocation || {
      country: "Colombia",
      countryCode: "CO",
      city: "Bogotá",
      locationName: "Bogotá, Colombia",
      role: "colombia",
      nativeLanguage: "es",
      targetLanguage: "en",
      flag: "🇨🇴",
    };

    const isBoston = activeLoc.countryCode === "US" || activeLoc.country === "Estados Unidos";

    const payload = isRegistering
      ? {
          username: username.trim(),
          password: password.trim(),
          displayName:
            displayName.trim() ||
            (isBoston ? `${username.trim()} (USA)` : `${username.trim()} (Colombia)`),
          role: isBoston ? "boston" : "colombia",
          city: activeLoc.city,
          locationName: activeLoc.locationName,
          countryCode: isBoston ? "US" : "CO",
          latitude: activeLoc.latitude,
          longitude: activeLoc.longitude,
        }
      : {
          username: username.trim(),
          password: password.trim(),
          locationName: activeLoc.locationName,
          city: activeLoc.city,
          countryCode: isBoston ? "US" : "CO",
          latitude: activeLoc.latitude,
          longitude: activeLoc.longitude,
        };

    const endpoint = isRegistering ? "/api/auth/register" : "/api/auth/login";

    try {
      // 1. Authenticate with backend
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al procesar la solicitud.");
      }

      // 2. If Google Sheets access token is available, automatically record/sync user to Google Sheets
      try {
        const token = await getAccessToken();
        if (token) {
          const sheetInfo = await getOrCreateSpreadsheet(token);
          await saveUserToSheet(token, sheetInfo.id, {
            usuario: username.trim(),
            contrasena: password.trim(),
            ubicacion: activeLoc.locationName,
            pais: activeLoc.country,
          });
        }
      } catch (sheetErr) {
        console.warn("Google Sheets background sync notice:", sheetErr);
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      setErrorMessage(err.message || "Error en el inicio de sesión");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="login-auth-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto"
    >
      <div
        className={`w-full max-w-lg my-auto rounded-3xl border shadow-2xl overflow-hidden transition-all duration-300 ${
          isDark
            ? "bg-slate-950 border-slate-800 text-slate-100"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Header Banner */}
        <div className="p-6 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border-b border-slate-800 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center shadow-lg text-white">
                <Globe className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold tracking-tight">VozSinFronteras</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    GPS Activo
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Videollamadas Colombia 🇨🇴 ⇄ Boston EE. UU. 🇺🇸
                </p>
              </div>
            </div>

            {onOpenSheetsModal && (
              <button
                type="button"
                onClick={onOpenSheetsModal}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900 text-xs font-semibold transition-colors"
                title="Ver Base de Datos en Google Sheets"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Google Sheets</span>
              </button>
            )}
          </div>
        </div>

        {/* GPS Geolocation Auto-Detection Card */}
        <div className="p-4 bg-slate-900/80 border-b border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
              <span className="text-xs font-bold text-slate-200">
                Ubicación Detectada por el Navegador
              </span>
            </div>
            <button
              id="refresh-gps-button"
              type="button"
              onClick={triggerLocationDetection}
              disabled={isDetectingLocation}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
            >
              <RefreshCw
                className={`w-3 h-3 ${isDetectingLocation ? "animate-spin" : ""}`}
              />
              <span>{isDetectingLocation ? "Detectando..." : "Actualizar GPS"}</span>
            </button>
          </div>

          {isDetectingLocation ? (
            <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 text-xs flex items-center gap-3 animate-pulse">
              <MapPin className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />
              <div>
                <p className="font-semibold">Solicitando acceso a tu ubicación GPS...</p>
                <p className="text-[10px] text-slate-400">
                  El navegador determinará automáticamente si estás en Colombia o en EE. UU.
                </p>
              </div>
            </div>
          ) : detectedLocation ? (
            <div
              className={`p-3.5 rounded-2xl border transition-all ${
                detectedLocation.countryCode === "US"
                  ? "bg-indigo-950/50 border-indigo-500/40 text-indigo-200"
                  : "bg-emerald-950/50 border-emerald-500/40 text-emerald-200"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-3xl">{detectedLocation.flag}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">
                        {detectedLocation.countryCode === "US"
                          ? "Estás en Estados Unidos"
                          : "Estás en Colombia"}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 uppercase">
                        {detectedLocation.countryCode}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-400" />
                      <span>{detectedLocation.locationName}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right text-[10px] text-slate-400">
                  <span className="block font-semibold text-slate-200">
                    {detectedLocation.countryCode === "US" ? "Inglés (en)" : "Español (es)"}
                  </span>
                  <span>Traducción a: {detectedLocation.countryCode === "US" ? "Español" : "Inglés"}</span>
                </div>
              </div>

              {/* Selector to manually adjust if GPS proxy or VPN applies */}
              <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">¿Cambiar país detectado?</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleManualLocationSwitch("Colombia")}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      detectedLocation.countryCode === "CO"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    🇨🇴 Colombia
                  </button>
                  <button
                    type="button"
                    onClick={() => handleManualLocationSwitch("Estados Unidos")}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      detectedLocation.countryCode === "US"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    🇺🇸 USA (Boston)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700 text-xs text-slate-300 flex items-center justify-between">
              <span>Ubicación por defecto: Colombia 🇨🇴</span>
              <button
                type="button"
                onClick={triggerLocationDetection}
                className="text-xs text-indigo-400 hover:underline"
              >
                Permitir GPS
              </button>
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-slate-200">
              {isRegistering ? "Registro de Nuevo Usuario" : "Iniciar Sesión"}
            </span>
            <button
              id="toggle-register-btn"
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
            >
              {isRegistering ? "¿Ya tienes cuenta? Iniciar Sesión" : "¿No tienes cuenta? Regístrate"}
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Usuario
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                id="login-username-input"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingresa tu nombre de usuario"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:outline-hidden text-sm text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                id="login-password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:outline-hidden text-sm text-white"
              />
            </div>
          </div>

          {isRegistering && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nombre para mostrar (Opcional)
              </label>
              <input
                id="register-displayname-input"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ej: Daniel o Sarah"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:outline-hidden text-sm text-white"
              />
            </div>
          )}

          {/* Database indicator */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Base de datos: <strong>Google Sheets</strong> (Usuario, Contraseña, Ubicación)</span>
            </span>
            {onOpenSheetsModal && (
              <button
                type="button"
                onClick={onOpenSheetsModal}
                className="text-emerald-400 hover:text-emerald-300 font-semibold underline text-[11px]"
              >
                Ver Tabla
              </button>
            )}
          </div>

          <button
            id="login-submit-button"
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-amber-500 hover:opacity-95 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-1 cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Verificando y Conectando...</span>
              </span>
            ) : (
              <>
                <span>{isRegistering ? "Crear Cuenta e Ingresar" : "Entrar a la Videollamada"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
