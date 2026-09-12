import { useState, useEffect, useRef, useCallback } from "react";
import { RoomConnectionState, SubtitleItem, PermissionsState } from "../types";

interface UseWebRTCOptions {
  roomId: string;
  userId: string;
  userName: string;
  location: string;
  language: string;
  onRemoteSubtitleReceived?: (item: SubtitleItem) => void;
  onRemoteUserUpdate?: (user: { userId: string; userName: string; location: string; language: string }) => void;
}

export function useWebRTC({
  roomId,
  userId,
  userName,
  location,
  language,
  onRemoteSubtitleReceived,
  onRemoteUserUpdate,
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

  const [permissions, setPermissions] = useState<PermissionsState>({
    camera: "prompt",
    microphone: "prompt",
    location: "prompt",
  });

  const [connectionState, setConnectionState] = useState<RoomConnectionState>({
    roomId,
    connected: false,
    peerConnected: false,
    isConnecting: true,
    participantCount: 1,
  });

  const [remotePeerInfo, setRemotePeerInfo] = useState<{
    userId: string;
    userName: string;
    location: string;
    language: string;
  } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const onRemoteSubtitleRef = useRef(onRemoteSubtitleReceived);
  onRemoteSubtitleRef.current = onRemoteSubtitleReceived;

  const onRemoteUserUpdateRef = useRef(onRemoteUserUpdate);
  onRemoteUserUpdateRef.current = onRemoteUserUpdate;

  // Request All 3 Permissions: Camera, Microphone, Geolocation
  const requestMediaAndPermissions = useCallback(async () => {
    setIsCameraLoading(true);
    setCameraError(null);

    let stream: MediaStream | null = null;
    let cameraGranted = false;
    let micGranted = false;
    let locationGranted = false;

    // 1. Request Camera & Mic
    try {
      stream = await navigator.mediaDevices.getUserMedia({
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
      cameraGranted = true;
      micGranted = true;

      // Setup audio level analyzer
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateMeter = () => {
            if (analyserRef.current && stream?.getAudioTracks()[0]?.enabled) {
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
        }
      } catch (audioErr) {
        console.warn("Audio meter setup note:", audioErr);
      }
    } catch (err: any) {
      console.warn("Media permission not fully granted:", err);
      setCameraError(err.message || "Permiso de cámara o micrófono no concedido");
    }

    // 2. Request Geolocation
    if (typeof navigator !== "undefined" && "geolocation" in navigator) {
      try {
        const geoPromise = new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              resolve({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              });
            },
            (err) => reject(err),
            { timeout: 8000, enableHighAccuracy: false }
          );
        });

        const coords = await geoPromise;
        locationGranted = true;

        setPermissions((prev) => ({
          ...prev,
          camera: cameraGranted ? "granted" : "denied",
          microphone: micGranted ? "granted" : "denied",
          location: "granted",
          coordinates: coords,
          locationName: `${coords.latitude.toFixed(2)}°, ${coords.longitude.toFixed(2)}°`,
        }));

        // Send location update to server
        fetch("/api/auth/update-location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: userId,
            latitude: coords.latitude,
            longitude: coords.longitude,
          }),
        }).catch(() => {});
      } catch (geoErr) {
        console.warn("Geolocation permission note:", geoErr);
        setPermissions((prev) => ({
          ...prev,
          camera: cameraGranted ? "granted" : "denied",
          microphone: micGranted ? "granted" : "denied",
          location: "denied",
        }));
      }
    } else {
      setPermissions((prev) => ({
        ...prev,
        camera: cameraGranted ? "granted" : "denied",
        microphone: micGranted ? "granted" : "denied",
        location: "denied",
      }));
    }

    setIsCameraLoading(false);
    return stream;
  }, [userId]);

  // Set up WebRTC PeerConnection and Signaling over WebSocket
  const setupPeerConnection = useCallback((peerWs: WebSocket, isCaller: boolean) => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:global.stun.twilio.com:3478" },
        ],
      });

      peerConnectionRef.current = pc;

      // Add local stream tracks to PeerConnection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // Handle remote tracks
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
          setConnectionState((prev) => ({ ...prev, peerConnected: true }));
        }
      };

      // Handle ICE Candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && peerWs.readyState === WebSocket.OPEN) {
          peerWs.send(
            JSON.stringify({
              type: "signal:ice-candidate",
              roomId,
              payload: { candidate: event.candidate },
            })
          );
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setConnectionState((prev) => ({ ...prev, peerConnected: true }));
        } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          setConnectionState((prev) => ({ ...prev, peerConnected: false }));
        }
      };

      // If caller, create and send WebRTC offer
      if (isCaller) {
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            if (peerWs.readyState === WebSocket.OPEN) {
              peerWs.send(
                JSON.stringify({
                  type: "signal:offer",
                  roomId,
                  payload: { sdp: pc.localDescription },
                })
              );
            }
          })
          .catch((err) => console.warn("Create offer error:", err));
      }
    } catch (e) {
      console.warn("RTCPeerConnection setup error:", e);
    }
  }, [roomId]);

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
        // Join room with user credentials
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

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === "joined") {
            const participants = msg.payload.participants || [];
            const count = participants.length + 1;
            setConnectionState((prev) => ({
              ...prev,
              participantCount: count,
              peerConnected: count > 1,
            }));

            if (participants.length > 0) {
              const peer = participants[0];
              setRemotePeerInfo(peer);
              onRemoteUserUpdateRef.current?.(peer);
              // Second user to enter connects as caller to existing peer
              setupPeerConnection(ws, true);
            }
          } else if (msg.type === "peer:joined") {
            const peer = msg.payload;
            setRemotePeerInfo(peer);
            onRemoteUserUpdateRef.current?.(peer);
            setConnectionState((prev) => ({
              ...prev,
              participantCount: prev.participantCount + 1,
              peerConnected: true,
            }));
            // Existing user prepares peer connection receiver
            setupPeerConnection(ws, false);
          } else if (msg.type === "peer:left") {
            setRemotePeerInfo(null);
            setRemoteStream(null);
            setConnectionState((prev) => ({
              ...prev,
              participantCount: Math.max(1, prev.participantCount - 1),
              peerConnected: false,
            }));
          } else if (msg.type === "signal:offer") {
            const pc = peerConnectionRef.current;
            if (pc) {
              await pc.setRemoteDescription(new RTCSessionDescription(msg.payload.sdp));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              ws.send(
                JSON.stringify({
                  type: "signal:answer",
                  roomId,
                  payload: { sdp: answer },
                })
              );
            }
          } else if (msg.type === "signal:answer") {
            const pc = peerConnectionRef.current;
            if (pc) {
              await pc.setRemoteDescription(new RTCSessionDescription(msg.payload.sdp));
            }
          } else if (msg.type === "signal:ice-candidate") {
            const pc = peerConnectionRef.current;
            if (pc && msg.payload.candidate) {
              await pc.addIceCandidate(new RTCIceCandidate(msg.payload.candidate));
            }
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
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    };
  }, [roomId, userId, userName, location, language, setupPeerConnection]);

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
          requestMediaAndPermissions();
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
      requestMediaAndPermissions();
    }
  }, [isScreenSharing, requestMediaAndPermissions]);

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
    permissions,
    remotePeerInfo,
    connectionState,
    toggleCamera,
    toggleMic,
    toggleScreenShare,
    broadcastSubtitle,
    requestMediaAndPermissions,
    reconnectCamera: requestMediaAndPermissions,
    setRemoteAudioLevel,
  };
}
