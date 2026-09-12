import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  Shield,
  MapPin,
  Lock,
  User,
} from "lucide-react";
import {
  googleSignIn,
  logoutGoogle,
  getAccessToken,
  initAuth,
} from "../lib/firebaseAuth";
import {
  getOrCreateSpreadsheet,
  fetchUsersFromSheet,
  saveUserToSheet,
  SheetUserRow,
  getSavedSpreadsheetId,
} from "../lib/googleSheetsService";

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark?: boolean;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  isDark = true,
}) => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(getSavedSpreadsheetId());
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(null);
  const [rows, setRows] = useState<SheetUserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form for manual row insertion
  const [newUsuario, setNewUsuario] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newUbicacion, setNewUbicacion] = useState("Bogotá, Colombia");
  const [newPais, setNewPais] = useState("Colombia (CO)");

  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        setIsSignedIn(true);
        setUserEmail(user.email);
        loadSpreadsheetData();
      },
      () => {
        setIsSignedIn(false);
        setUserEmail(null);
      }
    );

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  const loadSpreadsheetData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const sheetInfo = await getOrCreateSpreadsheet(token);
      setSpreadsheetId(sheetInfo.id);
      setSpreadsheetUrl(sheetInfo.url);

      const users = await fetchUsersFromSheet(token, sheetInfo.id);
      setRows(users);
      setActionMessage(
        sheetInfo.isNew
          ? "¡Hoja de cálculo creada exitosamente en tu Google Drive!"
          : "Datos sincronizados desde Google Sheets."
      );
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      console.error("Error loading Google Sheets:", err);
      setErrorMessage(err.message || "No se pudo conectar a Google Sheets.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setIsSignedIn(true);
        setUserEmail(result.user.email);
        await loadSpreadsheetData();
      }
    } catch (err: any) {
      console.error("Google sign in failed:", err);
      setErrorMessage(err.message || "Error al autenticar con Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await logoutGoogle();
    setIsSignedIn(false);
    setUserEmail(null);
    setRows([]);
  };

  const handleAddUserRow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsuario || !newPassword) return;

    // Confirmation dialog as mandated by Google Workspace guidelines
    const confirmed = window.confirm(
      `¿Deseas agregar el usuario "${newUsuario}" con ubicación "${newUbicacion}" a la tabla en Google Sheets?`
    );
    if (!confirmed) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const token = await getAccessToken();
      if (!token || !spreadsheetId) {
        throw new Error("Debes conectar tu cuenta de Google primero.");
      }

      await saveUserToSheet(token, spreadsheetId, {
        usuario: newUsuario,
        contrasena: newPassword,
        ubicacion: newUbicacion,
        pais: newPais,
      });

      setNewUsuario("");
      setNewPassword("");
      await loadSpreadsheetData();
      setActionMessage("Usuario agregado exitosamente a la hoja de Google Sheets.");
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "Error al agregar a Google Sheets");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="google-sheets-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
    >
      <div
        className={`w-full max-w-3xl my-auto rounded-3xl border shadow-2xl overflow-hidden transition-all duration-200 ${
          isDark
            ? "bg-slate-950 border-slate-800 text-slate-100"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 border-b border-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg text-white">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">Base de Datos en Google Sheets</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Tabla: Usuario, Contraseña, Ubicación
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Almacenamiento directo y persistente en hojas de cálculo de Google
              </p>
            </div>
          </div>

          <button
            id="close-sheets-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Notifications */}
          {actionMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{actionMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Connection State Card */}
          <div
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
              isDark ? "bg-slate-900/70 border-slate-800" : "bg-slate-50 border-slate-200"
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isSignedIn ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                  }`}
                />
                <span className="text-sm font-bold">
                  {isSignedIn
                    ? `Conectado a Google: ${userEmail || ""}`
                    : "Conexión a Google Sheets Requerida"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {isSignedIn
                  ? "Las cuentas creadas y sus ubicaciones (Colombia / USA) se sincronizan en tu Google Sheet."
                  : "Conecta tu cuenta de Google para sincronizar y editar la tabla directamente en Google Sheets."}
              </p>
            </div>

            {isSignedIn ? (
              <div className="flex items-center gap-2">
                <button
                  id="sheets-refresh-btn"
                  onClick={loadSpreadsheetData}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                  <span>Sincronizar</span>
                </button>

                {spreadsheetUrl && (
                  <a
                    id="open-google-sheet-external-link"
                    href={spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <span>Abrir en Google Sheets</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                <button
                  id="sheets-disconnect-btn"
                  onClick={handleSignOut}
                  className="px-3 py-1.5 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  Desconectar
                </button>
              </div>
            ) : (
              /* Google Sign In Official Styled Button */
              <button
                id="connect-google-sheets-button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="flex items-center gap-2.5 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 font-medium text-xs rounded-xl shadow-md border border-slate-300 transition-all cursor-pointer disabled:opacity-50"
              >
                <svg
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  className="w-4 h-4"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                  <path fill="none" d="M0 0h48v48H0z" />
                </svg>
                <span>Conectar con Google Sheets</span>
              </button>
            )}
          </div>

          {/* Table display */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                Tabla en Google Sheets: Usuario, Contraseña y Ubicación ({rows.length} registros)
              </span>
              {spreadsheetId && (
                <span className="text-[10px] text-slate-500 font-mono truncate max-w-[200px]">
                  ID: {spreadsheetId}
                </span>
              )}
            </div>

            <div
              className={`rounded-2xl border overflow-hidden ${
                isDark ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr
                      className={`border-b font-semibold ${
                        isDark
                          ? "bg-slate-900 border-slate-800 text-slate-300"
                          : "bg-slate-100 border-slate-200 text-slate-700"
                      }`}
                    >
                      <th className="p-3">#</th>
                      <th className="p-3">Usuario</th>
                      <th className="p-3">Contraseña</th>
                      <th className="p-3">Ubicación</th>
                      <th className="p-3">País Detectado</th>
                      <th className="p-3">Fecha de Registro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 font-mono text-[11px]">
                    {rows.length > 0 ? (
                      rows.map((row, idx) => (
                        <tr
                          key={idx}
                          className={`transition-colors ${
                            isDark ? "hover:bg-slate-850" : "hover:bg-white"
                          }`}
                        >
                          <td className="p-3 text-slate-500">{idx + 1}</td>
                          <td className="p-3 font-semibold text-emerald-400 font-sans">
                            {row.usuario}
                          </td>
                          <td className="p-3 text-slate-400">
                            <span className="bg-slate-800/70 px-2 py-0.5 rounded text-[10px]">
                              {row.contrasena}
                            </span>
                          </td>
                          <td className="p-3 font-sans">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                              {row.ubicacion}
                            </span>
                          </td>
                          <td className="p-3 font-sans">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                row.pais.includes("US") || row.pais.includes("Estados Unidos")
                                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              }`}
                            >
                              {row.pais.includes("US") || row.pais.includes("Estados Unidos")
                                ? "🇺🇸 EE. UU."
                                : "🇨🇴 Colombia"}
                            </span>
                          </td>
                          <td className="p-3 text-slate-400 text-[10px]">{row.fechaRegistro}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-8 text-center text-slate-500 font-sans text-xs"
                        >
                          {loading
                            ? "Cargando registros desde Google Sheets..."
                            : isSignedIn
                            ? "Aún no hay filas en la hoja. Agrega una abajo o regístrate en el login."
                            : "Conecta tu cuenta de Google arriba para ver y editar los registros de la tabla."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Form to append user to sheet */}
          {isSignedIn && (
            <form
              onSubmit={handleAddUserRow}
              className={`p-4 rounded-2xl border space-y-3 ${
                isDark ? "bg-slate-900/70 border-slate-800" : "bg-slate-50 border-slate-200"
              }`}
            >
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-400" />
                Agregar Usuario Directamente a la Hoja de Cálculo
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                    Usuario
                  </label>
                  <input
                    type="text"
                    required
                    value={newUsuario}
                    onChange={(e) => setNewUsuario(e.target.value)}
                    placeholder="ej: laura"
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                    Contraseña
                  </label>
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••"
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                    Ubicación
                  </label>
                  <input
                    type="text"
                    required
                    value={newUbicacion}
                    onChange={(e) => setNewUbicacion(e.target.value)}
                    placeholder="Bogotá, Colombia"
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                    País
                  </label>
                  <select
                    value={newPais}
                    onChange={(e) => setNewPais(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  >
                    <option value="Colombia (CO)">🇨🇴 Colombia</option>
                    <option value="Estados Unidos (US)">🇺🇸 Estados Unidos</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Insertar en Google Sheets</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
