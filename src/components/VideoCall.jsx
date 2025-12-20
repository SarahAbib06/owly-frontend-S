// src/components/VideoCall.jsx
import { useEffect, useRef, useState } from "react";
import { useAppel } from "../context/AppelContext";
import { useAuth } from "../hooks/useAuth";
import io from "socket.io-client";

const SIGNALING_SERVER = "http://localhost:5000";

export default function VideoCall() {
  const { user } = useAuth();
  const { currentCall, endCall } = useAppel();
  
  const [status, setStatus] = useState(currentCall?.isInitiator ? "Appel en cours..." : "Appel accepté");
  const [inCall, setInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isRemoteSharing, setIsRemoteSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionError, setConnectionError] = useState(false);
  const [isPeerConnected, setIsPeerConnected] = useState(false);

  const pcRef = useRef(null);
  const socketRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(new MediaStream());
  const durationIntervalRef = useRef(null);

  // Si pas d'appel en cours, ne rien afficher
  if (!currentCall) {
    return null;
  }

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startCallTimer = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    durationIntervalRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const cleanupResources = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      localStreamRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  };

  const handleEndCall = () => {
    // Envoyer l'événement de raccrochage au destinataire
    if (socketRef.current?.connected && currentCall?.targetUserId) {
      socketRef.current.emit("hang-up", {
        conversationId: currentCall.conversation?._id,
        toUserId: currentCall.targetUserId,
        fromUserId: user?._id,
        fromUsername: user?.username
      });
    }
    
    cleanupResources();
    endCall();
  };

  const toggleMute = () => {
    if (!localStreamRef.current) return;
    const audioTracks = localStreamRef.current.getAudioTracks();
    if (audioTracks.length > 0) {
      const newMuteState = !audioTracks[0].enabled;
      audioTracks.forEach(track => {
        track.enabled = newMuteState;
      });
      setIsMuted(!newMuteState);
      
      // Notifier l'autre participant
      if (socketRef.current?.connected && currentCall?.targetUserId) {
        socketRef.current.emit("toggle-audio", {
          conversationId: currentCall.conversation?._id,
          toUserId: currentCall.targetUserId,
          isAudioOn: newMuteState
        });
      }
    }
  };

  const toggleCamera = () => {
    if (!localStreamRef.current) return;
    const videoTracks = localStreamRef.current.getVideoTracks();
    if (videoTracks.length > 0) {
      const newCameraState = !videoTracks[0].enabled;
      videoTracks.forEach(track => {
        track.enabled = newCameraState;
      });
      setCameraOff(!newCameraState);
      
      // Notifier l'autre participant
      if (socketRef.current?.connected && currentCall?.targetUserId) {
        socketRef.current.emit("toggle-video", {
          conversationId: currentCall.conversation?._id,
          toUserId: currentCall.targetUserId,
          isVideoOn: newCameraState
        });
      }
    }
  };

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: "always",
          displaySurface: "monitor"
        },
        audio: false
      });

      // Remplacer la track vidéo
      const videoSender = pcRef.current?.getSenders().find((s) => s.track?.kind === "video");
      if (videoSender && pcRef.current) {
        await videoSender.replaceTrack(screenStream.getVideoTracks()[0]);
      }

      // Mettre à jour le stream local
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      localStreamRef.current = screenStream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
      }

      setIsSharing(true);
      setCameraOff(false);
      setStatus("Partage d'écran actif");

      // Notifier l'autre participant
      if (socketRef.current?.connected && currentCall?.targetUserId) {
        socketRef.current.emit("start-screen-share", {
          conversationId: currentCall.conversation?._id,
          toUserId: currentCall.targetUserId,
          fromUserId: user?._id
        });
      }

      // Gérer l'arrêt du partage
      screenStream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

    } catch (err) {
      console.error("Erreur partage écran:", err);
      setStatus("Partage annulé");
    }
  };

  const stopScreenShare = async () => {
    try {
      // Récupérer la caméra
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      });

      // Remplacer la track vidéo
      const videoSender = pcRef.current?.getSenders().find((s) => s.track?.kind === "video");
      if (videoSender && pcRef.current) {
        await videoSender.replaceTrack(cameraStream.getVideoTracks()[0]);
      }

      // Arrêter l'ancien stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }

      // Mettre à jour le stream local
      localStreamRef.current = cameraStream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = cameraStream;
      }

      setIsSharing(false);
      setStatus("Retour à la caméra");

      // Notifier l'autre participant
      if (socketRef.current?.connected && currentCall?.targetUserId) {
        socketRef.current.emit("stop-screen-share", {
          conversationId: currentCall.conversation?._id,
          toUserId: currentCall.targetUserId,
          fromUserId: user?._id
        });
      }

    } catch (error) {
      console.error("Erreur retour caméra:", error);
    }
  };

  const createPeerConnection = async () => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" }
        ]
      });
      pcRef.current = pc;

      // Configurer le stream distant
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          event.streams[0].getTracks().forEach((track) => {
            if (!remoteStreamRef.current.getTracks().some(t => t.id === track.id)) {
              remoteStreamRef.current.addTrack(track);
            }
          });
          setIsPeerConnected(true);
          setStatus(`Connecté avec ${currentCall.targetUsername || "Utilisateur"}`);
        }
      };

      // Ajouter le stream local
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      // Gestion des ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current?.connected && currentCall?.targetUserId) {
          socketRef.current.emit("ice-candidate", {
            conversationId: currentCall.conversation?._id,
            candidate: event.candidate,
            toUserId: currentCall.targetUserId,
            fromUserId: user?._id
          });
        }
      };

      // Gestion des changements de connexion
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
          setStatus("Connexion instable...");
        } else if (pc.iceConnectionState === 'connected') {
          setIsPeerConnected(true);
        }
      };

      return pc;

    } catch (error) {
      console.error("Erreur PeerConnection:", error);
      throw error;
    }
  };

  // Obtenir le stream média et initialiser WebRTC
  useEffect(() => {
    const initCall = async () => {
      try {
        // Obtenir le token
        const token = localStorage.getItem('token') || user?.token;
        if (!token) {
          setStatus("Token non trouvé");
          setConnectionError(true);
          return;
        }

        // Connexion socket
        socketRef.current = io(SIGNALING_SERVER, {
          auth: { token },
          transports: ['websocket', 'polling']
        });

        socketRef.current.on("connect", () => {
          console.log("Socket VideoCall connecté");
        });

        // Écouter les événements socket
        socketRef.current.on("offer", async ({ sdp }) => {
          if (pcRef.current && !inCall) {
            try {
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
              
              const answer = await pcRef.current.createAnswer();
              await pcRef.current.setLocalDescription(answer);
              
              socketRef.current.emit("answer", {
                conversationId: currentCall.conversation?._id,
                sdp: answer,
                toUserId: currentCall.targetUserId,
                fromUserId: user?._id
              });
              
              setInCall(true);
              startCallTimer();
              setStatus(`Connecté avec ${currentCall.targetUsername || "Utilisateur"}`);
              
            } catch (error) {
              console.error("Erreur traitement offer:", error);
            }
          }
        });

        socketRef.current.on("answer", async ({ sdp }) => {
          if (pcRef.current && !inCall) {
            try {
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
              setInCall(true);
              startCallTimer();
              setStatus(`Connecté avec ${currentCall.targetUsername || "Utilisateur"}`);
            } catch (error) {
              console.error("Erreur traitement answer:", error);
            }
          }
        });

        socketRef.current.on("ice-candidate", async ({ candidate }) => {
          if (pcRef.current && pcRef.current.remoteDescription && candidate) {
            try {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (error) {
              console.error("Erreur ICE candidate:", error);
            }
          }
        });

        socketRef.current.on("hang-up", () => {
          setStatus("Appel terminé par l'autre participant");
          cleanupResources();
          endCall();
        });

        socketRef.current.on("start-screen-share", () => {
          setIsRemoteSharing(true);
          setStatus("L'autre participant partage son écran");
        });

        socketRef.current.on("stop-screen-share", () => {
          setIsRemoteSharing(false);
          setStatus("Retour à l'appel vidéo");
        });

        // Obtenir le stream local
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true
          }
        });
        
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Créer la PeerConnection
        await createPeerConnection();

        // Si on est l'initiateur, créer une offre
        if (currentCall.isInitiator && pcRef.current) {
          const offer = await pcRef.current.createOffer();
          await pcRef.current.setLocalDescription(offer);

          socketRef.current.emit("offer", {
            conversationId: currentCall.conversation?._id,
            sdp: offer,
            toUserId: currentCall.targetUserId,
            fromUserId: user?._id
          });

          setInCall(true);
          startCallTimer();
          setStatus(`Appel de ${currentCall.targetUsername || "Utilisateur"}...`);
        } else {
          setStatus("En attente de connexion...");
        }

      } catch (error) {
        console.error("Erreur initialisation appel:", error);
        setConnectionError(true);
        setStatus(`Erreur: ${error.message}`);
      }
    };

    if (currentCall) {
      initCall();
    }

    return () => {
      cleanupResources();
    };
  }, [currentCall]);

  const otherUser = currentCall.targetUsername || "Utilisateur";

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "white",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'scroll'
    }}>
      {/* En-tête */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "15px 20px",
        background: "rgba(0,0,0,0.2)",
        backdropFilter: "blur(10px)"
      }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>Owly Video Call</h1>
        <button
          onClick={handleEndCall}
          style={{
            background: "#ff4444",
            color: "white",
            padding: "10px 20px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: 14
          }}
        >
          ✕ Fermer
        </button>
      </div>

      {/* Infos statut */}
      <div style={{
        textAlign: "center",
        padding: "20px",
        background: "rgba(0,0,0,0.1)"
      }}>
        <p style={{ fontSize: 18, margin: "5px 0" }}>
          <strong>Statut:</strong> {status}
        </p>
        <p style={{ margin: "5px 0" }}>
          <strong>En appel avec:</strong> {otherUser}
        </p>
        {inCall && (
          <p style={{ margin: "5px 0", fontSize: 20, fontWeight: "bold", color: "#4CAF50" }}>
            Durée: {formatDuration(callDuration)}
          </p>
        )}
        {(isSharing || isRemoteSharing) && (
          <p style={{ margin: "5px 0", color: "#FF9800" }}>
            {isSharing ? "Vous partagez votre écran" : "Écran partagé en cours"}
          </p>
        )}
      </div>

      {/* Vidéos */}
      <div style={{
        display: "flex",
        gap: 20,
        padding: "20px",
        flex: 1,
        boxSizing: "border-box"
      }}>
        {/* Vidéo locale */}
        <div style={{
          flex: 1,
          background: "rgba(0,0,0,0.2)",
          padding: "15px",
          borderRadius: "12px",
          backdropFilter: "blur(10px)",
          display: "flex",
          flexDirection: "column"
        }}>
          <h3 style={{ margin: "0 0 10px 0", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              background: cameraOff ? "#ff4444" : isSharing ? "#FF9800" : "#4CAF50",
              width: 10,
              height: 10,
              borderRadius: "50%"
            }}></span>
            Votre caméra {cameraOff && "(désactivée)"} {isSharing && "(écran partagé)"}
          </h3>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "10px",
              border: "3px solid",
              borderColor: cameraOff ? "#ff4444" : isSharing ? "#FF9800" : "#4CAF50",
              background: "#000",
              objectFit: "cover"
            }}
          />
        </div>

        {/* Vidéo distante */}
        <div style={{
          flex: 1,
          background: "rgba(0,0,0,0.2)",
          padding: "15px",
          borderRadius: "12px",
          backdropFilter: "blur(10px)",
          display: "flex",
          flexDirection: "column"
        }}>
          <h3 style={{ margin: "0 0 10px 0", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              background: isRemoteSharing ? "#FF9800" : isPeerConnected ? "#4CAF50" : "#666",
              width: 10,
              height: 10,
              borderRadius: "50%"
            }}></span>
            Caméra distante {isRemoteSharing && "(écran partagé)"}
          </h3>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "10px",
              border: "3px solid",
              borderColor: isRemoteSharing ? "#FF9800" : "#2196F3",
              background: "#000",
              objectFit: "cover",
              display: isPeerConnected ? "block" : "none"
            }}
          />
          {!isPeerConnected && (
            <div style={{
              width: "100%",
              height: "100%",
              borderRadius: "10px",
              border: "3px solid #666",
              background: "#000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#999",
              fontSize: "18px"
            }}>
              En attente de connexion...
            </div>
          )}
        </div>
      </div>

      {/* Contrôles */}
      <div style={{
        display: "flex",
        gap: "15px",
        justifyContent: "center",
        padding: "20px",
        background: "rgba(0,0,0,0.2)",
        backdropFilter: "blur(10px)",
        flexWrap: "wrap"
      }}>
        {/* Bouton Raccrocher */}
        <button
          onClick={handleEndCall}
          style={{
            background: "#ff4444",
            color: "white",
            padding: "15px 25px",
            borderRadius: "10px",
            border: "none",
            fontSize: "16px",
            cursor: "pointer",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            minWidth: "150px"
          }}
        >
          📞 Raccrocher
        </button>

        {/* Bouton Micro */}
        <button
          onClick={toggleMute}
          style={{
            background: isMuted ? "#666" : "#2196F3",
            color: "white",
            padding: "15px 25px",
            borderRadius: "10px",
            border: "none",
            fontSize: "16px",
            cursor: "pointer",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            minWidth: "150px"
          }}
        >
          {isMuted ? "🎤 Micro coupé" : "🎤 Couper micro"}
        </button>

        {/* Bouton Caméra */}
        <button
          onClick={toggleCamera}
          style={{
            background: cameraOff ? "#666" : "#2196F3",
            color: "white",
            padding: "15px 25px",
            borderRadius: "10px",
            border: "none",
            fontSize: "16px",
            cursor: "pointer",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            minWidth: "150px"
          }}
        >
          {cameraOff ? "📷 Caméra coupée" : "📷 Couper caméra"}
        </button>

        {/* Bouton Partage d'écran */}
        <button
          onClick={isSharing ? stopScreenShare : startScreenShare}
          style={{
            background: isSharing ? "#FF9800" : "#9C27B0",
            color: "white",
            padding: "15px 25px",
            borderRadius: "10px",
            border: "none",
            fontSize: "16px",
            cursor: "pointer",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            minWidth: "150px"
          }}
        >
          {isSharing ? "🖥️ Arrêter partage" : "🖥️ Partager écran"}
        </button>
      </div>
    </div>
  );
}