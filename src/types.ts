export type LanguageCode = "es" | "en";

export interface UserAccount {
  id: string;
  username: string;
  displayName: string;
  role: "colombia" | "boston" | "guest";
  locationName: string;
  city: string;
  countryCode: "CO" | "US";
  nativeLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  avatarUrl?: string;
  latitude?: number;
  longitude?: number;
  lastLoginAt?: string;
}

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
  latitude?: number;
  longitude?: number;
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

export interface PermissionsState {
  camera: "prompt" | "granted" | "denied";
  microphone: "prompt" | "granted" | "denied";
  location: "prompt" | "granted" | "denied";
  coordinates?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  locationName?: string;
}
