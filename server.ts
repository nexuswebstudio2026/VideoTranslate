import express, { Request, Response } from "express";
import http from "http";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;
app.use(express.json({ limit: "25mb" }));

// Server-side Gemini initialization
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    } catch (err) {
      console.warn("Could not initialize Gemini client:", err);
      aiClient = null;
    }
  }
  return aiClient;
}

// Fallback dictionary for common video-call phrases between Spanish (Colombia) and English (Boston/US)
function fallbackTranslate(text: string, sourceLang: string, targetLang: string): string {
  const clean = text.trim().toLowerCase();
  
  const esToEn: Record<string, string> = {
    "hola": "Hello!",
    "hola cómo estás": "Hello, how are you?",
    "hola como estas": "Hello, how are you?",
    "bien y tú": "Good, and you?",
    "bien y tu": "Good, and you?",
    "me escuchas bien": "Can you hear me well?",
    "me ves bien": "Can you see me well?",
    "qué tal el clima en boston": "How is the weather in Boston?",
    "que tal el clima en boston": "How is the weather in Boston?",
    "hace frío acá": "It's cold here",
    "acá en colombia hace buen clima": "Here in Colombia the weather is great",
    "te escucho perfecto": "I can hear you perfectly",
    "sí, te veo muy bien": "Yes, I see you very well",
    "si, te veo muy bien": "Yes, I see you very well",
    "qué gusto verte de nuevo": "So wonderful to see you again!",
    "que gusto verte de nuevo": "So wonderful to see you again!",
    "un abrazo grande": "A big hug!",
    "hasta luego": "See you later!",
    "chao": "Bye bye!",
    "cuídate mucho": "Take care!",
    "parce": "my friend / buddy",
    "todo bien": "everything is good"
  };

  const enToEs: Record<string, string> = {
    "hello": "¡Hola!",
    "hi": "¡Hola!",
    "hey": "¡Hola!",
    "how are you": "¿Cómo estás?",
    "how are you doing": "¿Cómo te va?",
    "can you hear me": "¿Me puedes escuchar?",
    "can you hear me well": "¿Me escuchas bien?",
    "can you see me": "¿Me puedes ver?",
    "yes i can hear you": "Sí, te escucho",
    "it is great to see you": "¡Qué gusto verte!",
    "nice to see you": "¡Gusto en verte!",
    "how is colombia": "¿Cómo está Colombia?",
    "it is chilly in boston today": "Hoy hace bastante frío en Boston",
    "i miss you": "Te extraño mucho",
    "talk to you soon": "Hablamos pronto",
    "goodbye": "Adiós",
    "bye": "¡Chao!",
    "take care": "Cuídate mucho"
  };

  if (targetLang.toLowerCase().startsWith("en")) {
    for (const [key, val] of Object.entries(esToEn)) {
      if (clean === key || clean.includes(key)) return val;
    }
    return `[EN] ${text}`;
  } else {
    for (const [key, val] of Object.entries(enToEs)) {
      if (clean === key || clean.includes(key)) return val;
    }
    return `[ES] ${text}`;
  }
}

// API: Instant Translation endpoint using Gemini 3.8 Flash
app.post("/api/translate", async (req: Request, res: Response) => {
  try {
    const { text, sourceLang = "auto", targetLang = "es", persona = "friend" } = req.body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Missing or invalid text parameter" });
    }

    const ai = getGeminiClient();

    // If Gemini is available, produce contextual, accurate spoken-conversation translation
    if (ai) {
      try {
        const prompt = `You are a real-time live video call subtitle translator between two close friends: one in Colombia (speaking Colombian Spanish) and one in Boston, United States (speaking American English).
Translate the following spoken conversational sentence into natural, fluent ${targetLang === "es" ? "Spanish (natural Latin American / Colombian Spanish)" : "English (natural American English)"}.
Sentence to translate: "${text}"
Rules:
- Provide ONLY the direct translated sentence.
- Do NOT output quotation marks, explanations, greetings, or prefixes.
- Keep the natural friendly conversational spoken tone.
- If it contains Colombian expressions (like "parce", "chévere", "bacano", "listo"), translate them naturally to American English.
- If it contains Boston/American expressions (like "wicked", "cool", "super chilly"), translate them naturally into friendly Spanish.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
        });

        const translated = response.text?.trim() || fallbackTranslate(text, sourceLang, targetLang);
        return res.json({
          translatedText: translated,
          originalText: text,
          detectedLanguage: sourceLang === "auto" ? (targetLang === "es" ? "en" : "es") : sourceLang,
          targetLanguage: targetLang,
          provider: "gemini",
        });
      } catch (geminiError) {
        console.warn("Gemini call failed, using fallback:", geminiError);
      }
    }

    // Fallback if no API key or rate limited
    const translatedText = fallbackTranslate(text, sourceLang, targetLang);
    return res.json({
      translatedText,
      originalText: text,
      detectedLanguage: sourceLang === "auto" ? (targetLang === "es" ? "en" : "es") : sourceLang,
      targetLanguage: targetLang,
      provider: "local-rule",
    });
  } catch (err: any) {
    console.error("Translation error:", err);
    return res.status(500).json({ error: err.message || "Translation error" });
  }
});

// API: Direct AI Audio Listening and Automatic Translation using Gemini 3.8 Flash
app.post("/api/ai/listen-audio", async (req: Request, res: Response) => {
  try {
    const { audioBase64, mimeType = "audio/webm", expectedLanguage = "auto" } = req.body;

    if (!audioBase64 || typeof audioBase64 !== "string") {
      return res.status(400).json({ error: "Missing or invalid audioBase64" });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: "Gemini AI not initialized. Please ensure GEMINI_API_KEY is available.",
      });
    }

    // Clean up mimeType and base64 string
    const cleanMime = (mimeType.split(";")[0] || "audio/webm").trim();
    const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, "");

    const prompt = `You are an AI real-time audio listener and live translator in a video call between a person in Colombia (speaking Colombian Spanish) and a person in Boston, USA (speaking American English).
Listen carefully to the spoken voice in this audio:
1. Transcribe the exact human speech spoken in the audio in its original language.
2. Detect the spoken language: "es" for Spanish, "en" for English.
3. Automatically translate what was spoken:
   - If spoken in Spanish (Colombia) -> translate into natural conversational American English.
   - If spoken in English (Boston) -> translate into natural conversational Colombian Spanish.
4. If there is no audible human speech (only silence, clicks, or background static), set "hasSpeech" to false and return empty strings.

Return ONLY a JSON object with this exact schema:
{
  "hasSpeech": boolean,
  "originalText": string,
  "detectedLanguage": "es" | "en",
  "translatedText": string,
  "targetLanguage": "es" | "en"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [
        {
          inlineData: {
            mimeType: cleanMime,
            data: cleanBase64,
          },
        },
        {
          text: prompt,
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text?.trim() || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        parsed = { hasSpeech: false };
      }
    }

    if (!parsed.hasSpeech || !parsed.originalText?.trim()) {
      return res.json({
        hasSpeech: false,
        originalText: "",
        translatedText: "",
        detectedLanguage: expectedLanguage === "auto" ? "es" : expectedLanguage,
        targetLanguage: expectedLanguage === "es" ? "en" : "es",
        provider: "gemini-3.8-flash",
      });
    }

    return res.json({
      hasSpeech: true,
      originalText: parsed.originalText.trim(),
      detectedLanguage: parsed.detectedLanguage === "en" ? "en" : "es",
      translatedText: (parsed.translatedText || "").trim(),
      targetLanguage: parsed.detectedLanguage === "en" ? "es" : "en",
      provider: "gemini-3.8-flash",
    });
  } catch (err: any) {
    console.error("Audio processing with Gemini error:", err);
    return res.status(500).json({ error: err.message || "Failed to process audio with Gemini" });
  }
});

// In-memory persistent accounts database with initial profiles for Colombia and Boston
interface StoredUser {
  id: string;
  username: string;
  passwordHash: string; // Plain/simple comparison for session matching
  displayName: string;
  role: "colombia" | "boston" | "guest";
  locationName: string;
  city: string;
  countryCode: "CO" | "US";
  nativeLanguage: "es" | "en";
  targetLanguage: "es" | "en";
  avatarUrl: string;
  latitude?: number;
  longitude?: number;
  lastLoginAt?: string;
}

const usersDatabase: Map<string, StoredUser> = new Map([
  [
    "colombia",
    {
      id: "user-colombia",
      username: "colombia",
      passwordHash: "123456",
      displayName: "Tú (Colombia)",
      role: "colombia",
      locationName: "Bogotá, Colombia",
      city: "Bogotá",
      countryCode: "CO",
      nativeLanguage: "es",
      targetLanguage: "en",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
    },
  ],
  [
    "sarah",
    {
      id: "user-boston",
      username: "sarah",
      passwordHash: "123456",
      displayName: "Sarah Miller (Boston)",
      role: "boston",
      locationName: "Boston, Massachusetts, EE. UU.",
      city: "Boston, MA",
      countryCode: "US",
      nativeLanguage: "en",
      targetLanguage: "es",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80",
    },
  ],
  [
    "boston",
    {
      id: "user-boston",
      username: "boston",
      passwordHash: "123456",
      displayName: "Sarah Miller (Boston)",
      role: "boston",
      locationName: "Boston, Massachusetts, EE. UU.",
      city: "Boston, MA",
      countryCode: "US",
      nativeLanguage: "en",
      targetLanguage: "es",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80",
    },
  ],
]);

// Auth API: Login
app.post("/api/auth/login", (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Por favor ingresa usuario y contraseña." });
  }

  const cleanUser = String(username).trim().toLowerCase();
  const user = usersDatabase.get(cleanUser);

  if (!user || user.passwordHash !== String(password).trim()) {
    return res.status(401).json({ error: "Usuario o contraseña incorrectos. (Prueba con 'colombia' / '123456' o 'sarah' / '123456')" });
  }

  user.lastLoginAt = new Date().toISOString();
  return res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      locationName: user.locationName,
      city: user.city,
      countryCode: user.countryCode,
      nativeLanguage: user.nativeLanguage,
      targetLanguage: user.targetLanguage,
      avatarUrl: user.avatarUrl,
      latitude: user.latitude,
      longitude: user.longitude,
      lastLoginAt: user.lastLoginAt,
    },
  });
});

// Auth API: Register
app.post("/api/auth/register", (req: Request, res: Response) => {
  const { username, password, displayName, role, city, countryCode } = req.body;
  if (!username || !password || !displayName) {
    return res.status(400).json({ error: "Completa los campos requeridos." });
  }

  const cleanUser = String(username).trim().toLowerCase();
  if (usersDatabase.has(cleanUser)) {
    return res.status(400).json({ error: "Este nombre de usuario ya existe." });
  }

  const isBoston = role === "boston" || countryCode === "US";
  const newUser: StoredUser = {
    id: `user-${Date.now()}`,
    username: cleanUser,
    passwordHash: String(password).trim(),
    displayName: String(displayName).trim(),
    role: isBoston ? "boston" : "colombia",
    locationName: isBoston ? `${city || "Boston"}, EE. UU.` : `${city || "Bogotá"}, Colombia`,
    city: city || (isBoston ? "Boston" : "Bogotá"),
    countryCode: isBoston ? "US" : "CO",
    nativeLanguage: isBoston ? "en" : "es",
    targetLanguage: isBoston ? "es" : "en",
    avatarUrl: isBoston
      ? "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80"
      : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
    lastLoginAt: new Date().toISOString(),
  };

  usersDatabase.set(cleanUser, newUser);

  return res.json({
    success: true,
    user: {
      id: newUser.id,
      username: newUser.username,
      displayName: newUser.displayName,
      role: newUser.role,
      locationName: newUser.locationName,
      city: newUser.city,
      countryCode: newUser.countryCode,
      nativeLanguage: newUser.nativeLanguage,
      targetLanguage: newUser.targetLanguage,
      avatarUrl: newUser.avatarUrl,
      lastLoginAt: newUser.lastLoginAt,
    },
  });
});

// Update location coordinate profile
app.post("/api/auth/update-location", (req: Request, res: Response) => {
  const { username, latitude, longitude, locationName, city } = req.body;
  if (!username) return res.status(400).json({ error: "Missing username" });

  const cleanUser = String(username).trim().toLowerCase();
  const user = usersDatabase.get(cleanUser);
  if (user) {
    if (typeof latitude === "number") user.latitude = latitude;
    if (typeof longitude === "number") user.longitude = longitude;
    if (locationName) user.locationName = locationName;
    if (city) user.city = city;
    return res.json({ success: true, user });
  }
  return res.status(404).json({ error: "User not found" });
});

// API: Health check
app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

async function startServer() {
  const server = http.createServer(app);

  // WebSocket Server for Real-Time signaling & multi-user caption broadcast
  const wss = new WebSocketServer({ server, path: "/ws" });

  interface UserSession {
    ws: WebSocket;
    roomId: string;
    userId: string;
    userName: string;
    location: string;
    language: string;
  }

  const rooms = new Map<string, Map<string, UserSession>>();

  wss.on("connection", (ws: WebSocket) => {
    let currentRoomId: string | null = null;
    let currentUserId: string | null = null;

    ws.on("message", (raw: string) => {
      try {
        const message = JSON.parse(raw.toString());
        const { type, roomId, payload } = message;

        if (type === "join") {
          currentRoomId = roomId || "boston-colombia";
          currentUserId = payload.userId || `user-${Date.now()}`;

          if (!rooms.has(currentRoomId)) {
            rooms.set(currentRoomId, new Map());
          }

          const room = rooms.get(currentRoomId)!;
          const userSession: UserSession = {
            ws,
            roomId: currentRoomId,
            userId: currentUserId,
            userName: payload.userName || "Invitado",
            location: payload.location || "Colombia",
            language: payload.language || "es",
          };

          room.set(currentUserId, userSession);

          // Notify joined user
          const existingUsers = Array.from(room.values())
            .filter((u) => u.userId !== currentUserId)
            .map((u) => ({
              userId: u.userId,
              userName: u.userName,
              location: u.location,
              language: u.language,
            }));

          ws.send(
            JSON.stringify({
              type: "joined",
              payload: {
                userId: currentUserId,
                roomId: currentRoomId,
                participants: existingUsers,
              },
            })
          );

          // Broadcast to other peers in room
          for (const [id, peer] of room.entries()) {
            if (id !== currentUserId && peer.ws.readyState === WebSocket.OPEN) {
              peer.ws.send(
                JSON.stringify({
                  type: "peer:joined",
                  payload: {
                    userId: currentUserId,
                    userName: userSession.userName,
                    location: userSession.location,
                    language: userSession.language,
                  },
                })
              );
            }
          }
        } else if (currentRoomId && rooms.has(currentRoomId)) {
          // Broadcast all other events (WebRTC offer, answer, ice, subtitle, reaction) to other peers in the room
          const room = rooms.get(currentRoomId)!;
          for (const [id, peer] of room.entries()) {
            if (id !== currentUserId && peer.ws.readyState === WebSocket.OPEN) {
              peer.ws.send(
                JSON.stringify({
                  type,
                  payload: {
                    ...payload,
                    fromUserId: currentUserId,
                  },
                })
              );
            }
          }
        }
      } catch (err) {
        console.error("WS message parse error:", err);
      }
    });

    ws.on("close", () => {
      if (currentRoomId && currentUserId && rooms.has(currentRoomId)) {
        const room = rooms.get(currentRoomId)!;
        room.delete(currentUserId);

        for (const peer of room.values()) {
          if (peer.ws.readyState === WebSocket.OPEN) {
            peer.ws.send(
              JSON.stringify({
                type: "peer:left",
                payload: { userId: currentUserId },
              })
            );
          }
        }

        if (room.size === 0) {
          rooms.delete(currentRoomId);
        }
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Live Video Translation Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
