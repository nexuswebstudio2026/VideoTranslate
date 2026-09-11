import { useState, useEffect, useRef, useCallback } from "react";
import { RoomConnectionState, SubtitleItem } from "../types";

interface UseWebRTCOptions {
  roomId: string;
  userId: string;
  userName: string;
  location: string;
  language: string;
  onRemoteSubtitleReceived?: (item: SubtitleItem) => void;
}

export function useWebRTC({
  roomId,
  userId,
  userName,
  location,
  language,
  onRemoteSubtitleReceived,
}: UseWebRTCOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [localAudioLevel, setLocalAudioLevel] = useState(0);
  const [remoteAudioLevel, setRemoteAudioLevel] = useState(0);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [connectionState, setConnectionState] = useState<RoomConnectionState>({
    roomId,
    connected: false,
    peerConnected: false,
    isConnecting: true,
    participantCount: 1,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const onRemoteSubtitleRef = useRef(onRemoteSubtitleReceived);
  onRemoteSubtitleRef.current = onRemoteSubtitleReceived;

  // Initialize Local Media Stream
  const initLocalStream = useCallback(async () => {
    setIsCameraLoading(true);
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsCameraActive(true);
      setIsMicMuted(false);

      // Setup audio analyzer for volume meter
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);

        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateMeter = () => {
          if (analyserRef.current && !stream.getAudioTracks()[0]?.enabled === false) {
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            setLocalAudioLevel(Math.min(100, Math.round((average / 128) * 100)));
          } else {
            setLocalAudioLevel(0);
          }
          animFrameRef.current = requestAnimationFrame(updateMeter);
        };
        updateMeter();
      } catch (audioErr) {
        console.warn("Audio meter setup warning:", audioErr);
      }
    } catch (err: any) {
      console.warn("Could not access camera/mic:", err);
      setCameraError(err.message || "Permiso de cámara o micrófono no concedido");
    } finally {
      setIsCameraLoading(false);
    }
  }, []);

  // Initialize WebSocket connection for room signaling
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionState((prev) => ({ ...prev, connected: true, isConnecting: false }));
        // Join room
        ws.send(
          JSON.stringify({
            type: "join",
            roomId,
            payload: {
              userId,
              userName,
              location,
              language,
            },
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "joined") {
            const count = (msg.payload.participants?.length || 0) + 1;
            setConnectionState((prev) => ({
              ...prev,
              participantCount: count,
              peerConnected: count > 1,
            }));
          } else if (msg.type === "peer:joined") {
            setConnectionState((prev) => ({
              ...prev,
              participantCount: prev.participantCount + 1,
              peerConnected: true,
            }));
          } else if (msg.type === "peer:left") {
            setConnectionState((prev) => ({
              ...prev,
              participantCount: Math.max(1, prev.participantCount - 1),
              peerConnected: prev.participantCount - 1 > 1,
            }));
          } else if (msg.type === "subtitle:broadcast") {
            onRemoteSubtitleRef.current?.(msg.payload);
          }
        } catch (e) {
          console.warn("WS onmessage error:", e);
        }
      };

      ws.onclose = () => {
        setConnectionState((prev) => ({ ...prev, connected: false, isConnecting: false }));
      };

      ws.onerror = () => {
        setConnectionState((prev) => ({ ...prev, connected: false, isConnecting: false }));
      };
    } catch (e) {
      console.warn("WebSocket init failed:", e);
    }

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [roomId, userId, userName, location, language]);

  // Toggle Camera
  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraActive(videoTrack.enabled);
      }
    }
  }, []);

  // Toggle Microphone
  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
        if (!audioTrack.enabled) {
          setLocalAudioLevel(0);
        }
      }
    }
  }, []);

  // Toggle Screen Share
  const toggleScreenShare = useCallback(async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        const screenTrack = screenStream.getVideoTracks()[0];
        
        screenTrack.onended = () => {
          setIsScreenSharing(false);
          initLocalStream();
        };

        if (localStreamRef.current) {
          const videoTrack = localStreamRef.current.getVideoTracks()[0];
          if (videoTrack) {
            localStreamRef.current.removeTrack(videoTrack);
            localStreamRef.current.addTrack(screenTrack);
            setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
          }
        }
        setIsScreenSharing(true);
      } catch (err) {
        console.warn("Screen share error:", err);
      }
    } else {
      setIsScreenSharing(false);
      initLocalStream();
    }
  }, [isScreenSharing, initLocalStream]);

  // Broadcast subtitle to peer via WebSocket
  const broadcastSubtitle = useCallback(
    (subtitle: SubtitleItem) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "subtitle:broadcast",
            roomId,
            payload: subtitle,
          })
        );
      }
    },
    [roomId]
  );

  // Initialize camera on mount
  useEffect(() => {
    initLocalStream();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [initLocalStream]);

  return {
    localStream,
    remoteStream,
    isCameraActive,
    isMicMuted,
    isScreenSharing,
    localAudioLevel,
    remoteAudioLevel,
    isCameraLoading,
    cameraError,
    connectionState,
    toggleCamera,
    toggleMic,
    toggleScreenShare,
    broadcastSubtitle,
    reconnectCamera: initLocalStream,
    setRemoteAudioLevel,
  };
}
