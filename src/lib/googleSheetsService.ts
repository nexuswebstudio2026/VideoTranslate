import { getAccessToken } from "./firebaseAuth";

export interface SheetUserRow {
  usuario: string;
  contrasena: string;
  ubicacion: string;
  pais: string;
  fechaRegistro: string;
}

export const INITIAL_USERS: SheetUserRow[] = [
  {
    usuario: "camilo",
    contrasena: "123456",
    ubicacion: "Bogotá, Colombia",
    pais: "Colombia (CO)",
    fechaRegistro: new Date().toLocaleDateString("es-CO"),
  },
  {
    usuario: "diana",
    contrasena: "123456",
    ubicacion: "Boston, Massachusetts, EE. UU.",
    pais: "Estados Unidos (US)",
    fechaRegistro: new Date().toLocaleDateString("es-CO"),
  },
];

const SPREADSHEET_TITLE = "VozSinFronteras - Base de Datos de Usuarios";
const SHEET_NAME = "Usuarios";
const SAVED_SHEET_ID_KEY = "voz_google_sheet_id";

/**
 * Retrieves the stored spreadsheet ID or returns null
 */
export function getSavedSpreadsheetId(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(SAVED_SHEET_ID_KEY);
  }
  return null;
}

export function saveSpreadsheetId(id: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(SAVED_SHEET_ID_KEY, id);
  }
}

/**
 * Searches Google Drive for an existing spreadsheet or creates a new one
 */
export async function getOrCreateSpreadsheet(accessToken: string): Promise<{
  id: string;
  url: string;
  isNew: boolean;
}> {
  // 1. Check if we already have a saved ID that is valid
  const savedId = getSavedSpreadsheetId();
  if (savedId) {
    try {
      const checkRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${savedId}?fields=spreadsheetId,properties.title`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (checkRes.ok) {
        return {
          id: savedId,
          url: `https://docs.google.com/spreadsheets/d/${savedId}/edit`,
          isNew: false,
        };
      }
    } catch (e) {
      console.warn("Saved spreadsheet check error:", e);
    }
  }

  // 2. Search Drive for file by name
  try {
    const q = encodeURIComponent(
      `name = '${SPREADSHEET_TITLE}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`
    );
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        const file = data.files[0];
        saveSpreadsheetId(file.id);
        // Ensure Camilo and Diana exist in the sheet
        await ensureInitialUsersInSheet(accessToken, file.id);
        return {
          id: file.id,
          url: file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}/edit`,
          isNew: false,
        };
      }
    }
  } catch (err) {
    console.warn("Drive search error:", err);
  }

  // 3. Create a brand new Spreadsheet
  const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        title: SPREADSHEET_TITLE,
      },
      sheets: [
        {
          properties: {
            title: SHEET_NAME,
            gridProperties: {
              frozenRowCount: 1,
              columnCount: 6,
            },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const errData = await createRes.json().catch(() => ({}));
    throw new Error(
      errData.error?.message || "No se pudo crear la hoja de cálculo en Google Sheets"
    );
  }

  const newSheet = await createRes.json();
  const spreadsheetId = newSheet.spreadsheetId;
  saveSpreadsheetId(spreadsheetId);

  // Initialize Header row and default records: Camilo (Colombia) and Diana (USA)
  const nowStr = new Date().toLocaleDateString("es-CO");
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEET_NAME}!A1:E3?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        range: `${SHEET_NAME}!A1:E3`,
        majorDimension: "ROWS",
        values: [
          ["Usuario", "Contraseña", "Ubicación", "País", "Fecha Registro"],
          ["camilo", "123456", "Bogotá, Colombia", "Colombia (CO)", nowStr],
          ["diana", "123456", "Boston, Massachusetts, EE. UU.", "Estados Unidos (US)", nowStr],
        ],
      }),
    }
  );

  return {
    id: spreadsheetId,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    isNew: true,
  };
}

/**
 * Fetches all registered user records from the Google Sheet
 */
export async function fetchUsersFromSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<SheetUserRow[]> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEET_NAME}!A2:E`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || "Error al leer filas de Google Sheets");
  }

  const data = await res.json();
  const rows: any[][] = data.values || [];

  return rows
    .filter((row) => row[0]) // Must have username
    .map((row) => ({
      usuario: String(row[0] || "").trim(),
      contrasena: String(row[1] || "").trim(),
      ubicacion: String(row[2] || "").trim(),
      pais: String(row[3] || "").trim(),
      fechaRegistro: String(row[4] || "").trim(),
    }));
}

/**
 * Appends or updates a user row in the Google Sheet
 */
export async function saveUserToSheet(
  accessToken: string,
  spreadsheetId: string,
  user: {
    usuario: string;
    contrasena: string;
    ubicacion: string;
    pais: string;
  }
): Promise<{ success: boolean; rowUpdated?: boolean }> {
  // First, read existing rows to see if user exists
  const existingUsers = await fetchUsersFromSheet(accessToken, spreadsheetId).catch(() => []);
  const existingIndex = existingUsers.findIndex(
    (u) => u.usuario.toLowerCase() === user.usuario.toLowerCase()
  );

  const nowStr = new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" });

  if (existingIndex >= 0) {
    // Row index in Sheets is 1-based + 1 for header: row = existingIndex + 2
    const rowIndex = existingIndex + 2;
    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEET_NAME}!A${rowIndex}:E${rowIndex}?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          range: `${SHEET_NAME}!A${rowIndex}:E${rowIndex}`,
          majorDimension: "ROWS",
          values: [
            [
              user.usuario,
              user.contrasena,
              user.ubicacion,
              user.pais,
              existingUsers[existingIndex].fechaRegistro || nowStr,
            ],
          ],
        }),
      }
    );

    if (!updateRes.ok) {
      const err = await updateRes.json().catch(() => ({}));
      throw new Error(err.error?.message || "No se pudo actualizar la fila en Google Sheets");
    }

    return { success: true, rowUpdated: true };
  } else {
    // Append new row
    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEET_NAME}!A:E:append?valueInputOption=USER_ENTERED`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          range: `${SHEET_NAME}!A:E`,
          majorDimension: "ROWS",
          values: [[user.usuario, user.contrasena, user.ubicacion, user.pais, nowStr]],
        }),
      }
    );

    if (!appendRes.ok) {
      const err = await appendRes.json().catch(() => ({}));
      throw new Error(err.error?.message || "No se pudo agregar la fila a Google Sheets");
    }

    return { success: true, rowUpdated: false };
  }
}

/**
 * Ensures that the default users Camilo (Colombia) and Diana (USA) are always in the sheet
 */
export async function ensureInitialUsersInSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<void> {
  try {
    const existingUsers = await fetchUsersFromSheet(accessToken, spreadsheetId).catch(() => []);
    const hasCamilo = existingUsers.some((u) => u.usuario.toLowerCase() === "camilo");
    const hasDiana = existingUsers.some((u) => u.usuario.toLowerCase() === "diana");

    const rowsToAppend: string[][] = [];
    const nowStr = new Date().toLocaleDateString("es-CO");

    if (!hasCamilo) {
      rowsToAppend.push(["camilo", "123456", "Bogotá, Colombia", "Colombia (CO)", nowStr]);
    }
    if (!hasDiana) {
      rowsToAppend.push(["diana", "123456", "Boston, Massachusetts, EE. UU.", "Estados Unidos (US)", nowStr]);
    }

    if (rowsToAppend.length > 0) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEET_NAME}!A:E:append?valueInputOption=USER_ENTERED`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            range: `${SHEET_NAME}!A:E`,
            majorDimension: "ROWS",
            values: rowsToAppend,
          }),
        }
      );
    }
  } catch (e) {
    console.warn("Could not check/seed initial users into sheet:", e);
  }
}
