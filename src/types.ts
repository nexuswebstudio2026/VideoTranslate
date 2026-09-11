export type LanguageCode = "es" | "en";

export interface Participant {
  id: string;
  name: string;
  location: string;
  countryCode: "CO" | "US";
  city: string;
  nativeLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  avatarUrl?: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeaking: boolean;
  audioLevel: number; // 0 to 100
}

export interface SubtitleItem {
  id: string;
  speakerId: string;
  speakerName: string;
  speakerLocation: string;
  originalText: string;
  sourceLang: LanguageCode;
  translatedText: string;
  targetLang: LanguageCode;
  timestamp: string;
  isFinal: boolean;
}

export type ViewLayout = "split" | "pip" | "remote-focus" | "local-focus";

export type AppTheme = "light" | "dark";

export interface RoomConnectionState {
  roomId: string;
  connected: boolean;
  peerConnected: boolean;
  isConnecting: boolean;
  participantCount: number;
}
