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
app.use(express.json({ limit: "10mb" }));

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
