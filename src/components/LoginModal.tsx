import React, { useState } from "react";
import { UserAccount } from "../types";
import {
  Globe,
  Lock,
  User,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Languages,
  Video,
  Sparkles,
} from "lucide-react";

interface LoginModalProps {
  isOpen: boolean;
  onLoginSuccess: (user: UserAccount) => void;
  isDark?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onLoginSuccess,
  isDark = true,
}) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"colombia" | "boston">("colombia");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleQuickLogin = async (quickUser: string, quickPass: string) => {
    setUsername(quickUser);
    setPassword(quickPass);
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: quickUser, password: quickPass }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al iniciar sesión");
      }
      onLoginSuccess(data.user);
    } catch (err: any) {
      setErrorMessage(err.message || "No se pudo conectar");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    const endpoint = isRegistering ? "/api/auth/register" : "/api/auth/login";
    const payload = isRegistering
      ? {
          username,
          password,
          displayName: displayName || (role === "boston" ? "Sarah (Boston)" : "Tú (Colombia)"),
          role,
          city: city || (role === "boston" ? "Boston, MA" : "Bogotá"),
          countryCode: role === "boston" ? "US" : "CO",
        }
      : { username, password };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error en la autenticación");
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      setErrorMessage(err.message || "Error al procesar la solicitud");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="login-auth-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
    >
      <div
        className={`w-full max-w-md my-auto rounded-3xl border shadow-2xl overflow-hidden transition-all duration-300 ${
          isDark
            ? "bg-slate-950/95 border-slate-800 text-slate-100"
            : "bg-white border-slate-200 text-slate-900 shadow-xl"
        }`}
      >
        {/* Header Hero */}
        <div className="relative p-6 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border-b border-slate-800 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-500 flex items-center justify-center shadow-lg text-white">
              <Globe className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">VozSinFronteras</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Acceso Seguro
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Videollamadas con Traducción Instantánea en Vivo
              </p>
            </div>
          </div>
        </div>

        {/* Preset Instant Switchers (Demo accounts) */}
        <div className="p-4 bg-slate-900/60 border-b border-slate-800/80">
          <p className="text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Conexión Rápida (Selecciona tu lado o de tu amiga):
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              id="preset-login-colombia"
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin("colombia", "123456")}
              className="flex items-center gap-2.5 p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/30 hover:bg-emerald-900/40 text-left transition-all group"
            >
              <span className="text-2xl">🇨🇴</span>
              <div className="overflow-hidden">
                <span className="block text-xs font-bold text-emerald-300 group-hover:text-emerald-200">
                  Tu lado (Colombia)
                </span>
                <span className="block text-[10px] text-slate-400 truncate">
                  Español ⇄ Inglés
                </span>
              </div>
            </button>

            <button
              id="preset-login-boston"
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin("sarah", "123456")}
              className="flex items-center gap-2.5 p-2.5 rounded-xl border border-indigo-500/30 bg-indigo-950/30 hover:bg-indigo-900/40 text-left transition-all group"
            >
              <span className="text-2xl">🇺🇸</span>
              <div className="overflow-hidden">
                <span className="block text-xs font-bold text-indigo-300 group-hover:text-indigo-200">
                  Ella (Boston)
                </span>
                <span className="block text-[10px] text-slate-400 truncate">
                  Inglés ⇄ Español
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-slate-300">
              {isRegistering ? "Crear Nueva Cuenta" : "Iniciar Sesión con Usuario"}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setErrorMessage(null);
              }}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline"
            >
              {isRegistering ? "¿Ya tienes cuenta? Ingresar" : "¿Nuevo usuario? Regístrate"}
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nombre de Usuario
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                id="login-username-input"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="colombia o sarah"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:outline-hidden text-sm text-white"
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
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:outline-hidden text-sm text-white"
              />
            </div>
          </div>

          {isRegistering && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre a Mostrar
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ej: Laura o John"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:outline-hidden text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ubicación & Idioma Nativo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRole("colombia");
                      setCity("Bogotá");
                    }}
                    className={`p-2.5 rounded-xl border text-xs text-left transition-all ${
                      role === "colombia"
                        ? "bg-emerald-950/40 border-emerald-500 text-emerald-300"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1">
                      <span>🇨🇴 Colombia</span>
                    </div>
                    <div className="text-[10px] mt-0.5">Español nativo</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRole("boston");
                      setCity("Boston, MA");
                    }}
                    className={`p-2.5 rounded-xl border text-xs text-left transition-all ${
                      role === "boston"
                        ? "bg-indigo-950/40 border-indigo-500 text-indigo-300"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1">
                      <span>🇺🇸 Boston (EE.UU.)</span>
                    </div>
                    <div className="text-[10px] mt-0.5">English native</div>
                  </button>
                </div>
              </div>
            </>
          )}

          <button
            id="login-submit-button"
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-amber-500 hover:opacity-95 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2"
          >
            {loading ? (
              <span>Conectando...</span>
            ) : (
              <>
                <span>{isRegistering ? "Crear y Entrar a la Sala" : "Entrar a la Videollamada"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-[11px] text-center text-slate-500 mt-2">
            Al ingresar, el sistema solicitará automáticamente acceso a tu cámara, micrófono y ubicación.
          </p>
        </form>
      </div>
    </div>
  );
};
