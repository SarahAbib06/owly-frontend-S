// src/components/VideoCall.jsx
import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { useAuth } from "../hooks/useAuth";

const SIGNALING_SERVER = "http://localhost:5000";

export default function VideoCall({ selectedChat, onClose }) {
  const { user } = useAuth();
  const [myUserId, setMyUserId] = useState(user?._id || user?.id || user?.userId);
  const [targetUserId, setTargetUserId] = useState(null);
  const [conversationId, setConversationId] = useState(selectedChat?._id);
  const [status, setStatus] = useState("Connexion...");
  const [incomingCall, setIncomingCall] = useState(null);
  const [inCall, setInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [callDisabled, setCallDisabled] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isRemoteSharing, setIsRemoteSharing] = useState(false);
  const [shareDisabled, setShareDisabled] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isInitiating, setIsInitiating] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  const socketRef = useRef();
  const pcRef = useRef();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);

  const durationIntervalRef = useRef(null);

  // ========================
  // Récupérer le token JWT
  // ========================
  const getToken = () => {
    // Essayer plusieurs méthodes pour récupérer le token
    const token = 
      localStorage.getItem('token') ||
      localStorage.getItem('jwt') ||
      localStorage.getItem('authToken') ||
      sessionStorage.getItem('token') ||
      sessionStorage.getItem('jwt') ||
      (user?.token) ||
      (document.cookie.match(/token=([^;]+)/)?.[1]);
    
    console.log("🔍 Token trouvé:", token ? `${token.substring(0, 20)}...` : "NON");
    return token;
  };

  // ========================
  // Connect to signaling server
  // ========================
  useEffect(() => {
    const token = getToken();
    
    if (!token) {
      setStatus("❌ Token non trouvé - Veuillez vous reconnecter");
      setConnectionError(true);
      return;
    }

    if (!user) {
      setStatus("❌ Utilisateur non connecté");
      return;
    }

    console.log("🔗 Connexion au serveur d'appel...");
    setStatus("Connexion au serveur...");

    socketRef.current = io(SIGNALING_SERVER, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    // CONNECTION
    socketRef.current.on("connect", () => {
      console.log("✅ Socket vidéo connecté:", socketRef.current.id);
      setStatus("Connecté au serveur d'appel");
      setConnectionError(false);
    });

    // AUTH SUCCESS
    socketRef.current.on("video-auth-success", ({ userId, username }) => {
      setMyUserId(userId);
      setStatus("Authentifié ✅ Prêt pour les appels");
      console.log("✅ Authentifié:", userId, "-", username);
    });

    // APPEL ENTRANT
    socketRef.current.on("incoming-call", ({ fromUserId, fromUsername, conversationId, callType }) => {
      setIncomingCall({ 
        fromUserId, 
        fromUsername,
        conversationId,
        callType 
      });
      setStatus(`Appel entrant de ${fromUsername || fromUserId}...`);
      setCallDisabled(true);
      
      // Jouer un son d'appel (optionnel)
      const ringtone = new Audio('/sounds/ringtone.mp3');
      ringtone.loop = true;
      ringtone.play().catch(e => console.log("Son d'appel ignoré"));
      
      // Arrêter le son après 30 secondes
      setTimeout(() => ringtone.pause(), 30000);
    });

    // APPEL INITIÉ
    socketRef.current.on("call-initiated", ({ targetUserId, conversationId }) => {
      setTargetUserId(targetUserId);
      setConversationId(conversationId);
      setStatus("Appel en cours d'établissement...");
    });

    // APPEL ACCEPTÉ
    socketRef.current.on("call-answered", ({ fromUserId, fromUsername, conversationId }) => {
      setStatus(`Appel accepté par ${fromUsername || fromUserId} ✅`);
      setInCall(true);
      setCallDisabled(false);
      
      // Démarrer le chronomètre
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      durationIntervalRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    });

    // APPEL REFUSÉ
    socketRef.current.on("call-rejected", ({ fromUserId, fromUsername }) => {
      setStatus(`Appel refusé par ${fromUsername || fromUserId} ❌`);
      setIncomingCall(null);
      setCallDisabled(false);
      endCall();
    });

    // APPEL ANNULÉ
    socketRef.current.on("call-cancelled", ({ fromUserId, fromUsername }) => {
      setStatus(`Appel annulé par ${fromUsername || fromUserId}`);
      setIncomingCall(null);
      setCallDisabled(false);
    });

    // OFFER (WebRTC)
    socketRef.current.on("offer", async ({ fromUserId, fromUsername, conversationId, sdp }) => {
      console.log("📥 Offer reçu de:", fromUserId);
      
      if (!inCall && !incomingCall) {
        setTargetUserId(fromUserId);
        setConversationId(conversationId);
        
        try {
          await createPeerConnection(fromUserId, conversationId);
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
          
          const answer = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(answer);
          
          socketRef.current.emit("answer", {
            conversationId,
            sdp: answer,
            fromUserId: myUserId
          });
          
          setStatus(`Appel avec ${fromUsername || fromUserId} ✅`);
          setInCall(true);
          
          if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
          }
          durationIntervalRef.current = setInterval(() => {
            setCallDuration((prev) => prev + 1);
          }, 1000);
          
        } catch (error) {
          console.error("❌ Erreur traitement offer:", error);
          setStatus("Erreur lors de l'acceptation de l'appel");
        }
      }
    });

    // ANSWER (WebRTC)
    socketRef.current.on("answer", async ({ fromUserId, fromUsername, conversationId, sdp }) => {
      console.log("📥 Answer reçu de:", fromUserId);
      
      if (pcRef.current) {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
          setStatus(`Appel avec ${fromUsername || fromUserId} connecté ✅`);
          setInCall(true);
          setCallDisabled(false);

          if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
          }
          durationIntervalRef.current = setInterval(() => {
            setCallDuration((prev) => prev + 1);
          }, 1000);
        } catch (error) {
          console.error("❌ Erreur traitement answer:", error);
        }

      }
    });

    // ICE CANDIDATE
    socketRef.current.on("ice-candidate", async ({ fromUserId, conversationId, candidate }) => {
      if (candidate && pcRef.current && pcRef.current.remoteDescription) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error("❌ Erreur ajout ICE candidate:", error);
        }
      }
    });

    // PARTAGE D'ÉCRAN DÉMARRÉ
    socketRef.current.on("start-screen-share", ({ fromUserId, fromUsername }) => {
      setIsRemoteSharing(true);
      setShareDisabled(true);
      setStatus(`${fromUsername || fromUserId} partage son écran 🖥️`);
    });

    // PARTAGE D'ÉCRAN ARRÊTÉ
    socketRef.current.on("stop-screen-share", ({ fromUserId, fromUsername }) => {
      setIsRemoteSharing(false);
      setShareDisabled(false);
      setStatus("Retour à l'appel vidéo");
    });

    // APPEL RACCRÔCHÉ
    socketRef.current.on("hang-up", ({ fromUserId, fromUsername }) => {
      setStatus(`Appel terminé par ${fromUsername || fromUserId}`);
      endCall();
      setCallDisabled(false);
    });

    // ERREUR D'APPEL
    socketRef.current.on("call-error", ({ message }) => {
      setStatus(`❌ Erreur: ${message}`);
      setCallDisabled(false);
      setIsInitiating(false);
    });

    // ERREUR D'AUTH
    socketRef.current.on("auth-error", ({ message }) => {
      setStatus(`❌ Erreur d'authentification: ${message}`);
      setConnectionError(true);
    });

    // ERREUR DE CONNEXION
    socketRef.current.on("connect_error", (error) => {
      console.error("❌ Erreur connexion socket:", error);
      setStatus("❌ Impossible de se connecter au serveur");
      setConnectionError(true);
    });

    // DÉCONNEXION
    socketRef.current.on("disconnect", (reason) => {
      console.log("🔴 Socket déconnecté:", reason);
      if (reason !== "io client disconnect") {
        setStatus("Déconnecté du serveur - Reconnexion...");
      }
    });

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [user]); // Dépendre uniquement de user

  // ========================
  // Démarrer un appel depuis une conversation
  // ========================
  const startCallFromConversation = async () => {
    if (!selectedChat || !socketRef.current) {
      setStatus("❌ Aucune conversation sélectionnée");
      return;
    }
    
    try {
      setIsInitiating(true);
      setStatus("Initialisation de l'appel...");
      setCallDisabled(true);

      // Pour les conversations privées, trouver l'autre participant
      let otherParticipantId = null;
      let otherParticipantName = null;
      
      if (selectedChat.type === "private") {
        // Chercher l'autre participant
        const otherParticipant = selectedChat.participants?.find(
          participant => participant._id.toString() !== myUserId.toString()
        );
        
        if (!otherParticipant) {
          setStatus("❌ Impossible de trouver l'autre participant");
          setCallDisabled(false);
          setIsInitiating(false);
          return;
        }
        
        otherParticipantId = otherParticipant._id;
        otherParticipantName = otherParticipant.username;
        setTargetUserId(otherParticipantId);
      } /*else if (selectedChat.type === "group") {
        setStatus("❌ Les appels de groupe ne sont pas encore supportés");
        setCallDisabled(false);
        setIsInitiating(false);
        return;
      }*/

      // Initier l'appel via le socket
      socketRef.current.emit("initiate-call", {
        conversationId: selectedChat._id,
        callType: "video"
      });

      // Créer la connexion peer
      await createPeerConnection(otherParticipantId, selectedChat._id);
      
    } catch (error) {
      console.error("❌ Erreur démarrage appel:", error);
      setStatus(`❌ Erreur: ${error.message}`);
      setCallDisabled(false);
      setIsInitiating(false);
    }
  };

  // ========================
  // Créer une connexion Peer
  // ========================
  const createPeerConnection = async (otherUserId, convId) => {
    try {
      const pc = new RTCPeerConnection({ 
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" }
        ] 
      });
      pcRef.current = pc;

      // Configuration du stream distant
      const remoteStream = new MediaStream();
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          event.streams[0].getTracks().forEach((track) => {
            if (!remoteStream.getTracks().some(t => t.id === track.id)) {
              remoteStream.addTrack(track);
            }
          });
        }
      };

      // Obtenir le stream local
      const localStream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        }, 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      localStreamRef.current = localStream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
      
      // Ajouter les tracks au PeerConnection
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      // Gestion des ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && otherUserId) {
          socketRef.current.emit("ice-candidate", {
            conversationId: convId,
            candidate: event.candidate,
            fromUserId: otherUserId, // On envoie à l'autre utilisateur
          });
        }
      };

      // Gestion des changements de connexion
      pc.oniceconnectionstatechange = () => {
        console.log("ICE connection state:", pc.iceConnectionState);
        if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
          setStatus("Connexion instable...");
        }
      };

      // Créer l'offer si on est l'initiateur
      if (otherUserId) {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        await pc.setLocalDescription(offer);

        // Envoyer l'offer via socket
        socketRef.current.emit("offer", {
          conversationId: convId,
          sdp: offer,
          fromUserId: otherUserId, // On envoie à l'autre utilisateur
        });
      }

      console.log("✅ PeerConnection créée");
      return pc;
      
    } catch (error) {
      console.error("❌ Erreur création PeerConnection:", error);
      setStatus(`❌ Erreur: ${error.message}`);
      throw error;
    }
  };

  // ========================
  // Accepter un appel entrant
  // ========================
  const acceptIncomingCall = async () => {
    if (!incomingCall) return;
    
    try {
      setTargetUserId(incomingCall.fromUserId);
      setConversationId(incomingCall.conversationId);
      
      // Créer la PeerConnection
      await createPeerConnection(incomingCall.fromUserId, incomingCall.conversationId);
      
      // Informer l'appelant qu'on accepte
      socketRef.current.emit("answer-call", {
        conversationId: incomingCall.conversationId,
        fromUserId: incomingCall.fromUserId
      });
      
      setIncomingCall(null);
      setInCall(true);
      setCallDisabled(false);
      
      // Démarrer le chronomètre
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      durationIntervalRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
      
      setStatus(`Appel avec ${incomingCall.fromUsername || incomingCall.fromUserId} ✅`);
      
    } catch (error) {
      console.error("❌ Erreur acceptation appel:", error);
      setStatus(`❌ Erreur: ${error.message}`);
    }
  };

  // ========================
  // Refuser un appel entrant
  // ========================
  const rejectIncomingCall = () => {
    if (!incomingCall) return;
    
    socketRef.current.emit("reject-call", {
      conversationId: incomingCall.conversationId,
      fromUserId: incomingCall.fromUserId
    });
    
    setIncomingCall(null);
    setCallDisabled(false);
    setStatus("Appel refusé");
  };

  // ========================
  // Raccrocher
  // ========================
  const endCall = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    setCallDuration(0);
    setStatus("Appel terminé 📴");
    setInCall(false);
    setIncomingCall(null);
    setIsInitiating(false);
    setIsSharing(false);
    setIsRemoteSharing(false);
    setShareDisabled(false);

    // Arrêter tous les streams locaux
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      localStreamRef.current = null;
    }
    
    // Fermer la PeerConnection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    // Notifier l'autre participant
    if (targetUserId && socketRef.current && conversationId) {
      socketRef.current.emit("hang-up", {
        conversationId: conversationId,
        fromUserId: targetUserId,
      });
    }

    // Réinitialiser les états
    setTargetUserId(null);
    setCallDisabled(false);
    
    // Réinitialiser les vidéos
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  };

  // ========================
  // Screen Share
  // ========================
  const startScreenShare = async () => {
    if (!targetUserId || !conversationId || !pcRef.current) return;
    
    try {
      socketRef.current.emit("start-screen-share", { 
        conversationId, 
        toUserId: targetUserId 
      });

      const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
        video: {
          cursor: "always",
          displaySurface: "monitor"
        }, 
        audio: false 
      });
      
      const videoSender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
      if (videoSender) {
        await videoSender.replaceTrack(screenStream.getVideoTracks()[0]);
      }

      // Quand l'utilisateur arrête le partage via le navigateur
      screenStream.getVideoTracks()[0].onended = () => {
        stopScreenShare(true);
      };

      localStreamRef.current = screenStream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
      }
      setIsSharing(true);
      setStatus("Partage d'écran actif 🖥️");
      
    } catch (err) {
      console.error("❌ Erreur partage écran:", err);
      setIsSharing(false);
      socketRef.current.emit("stop-screen-share", { 
        conversationId, 
        toUserId: targetUserId 
      });
      setStatus("Partage d'écran annulé");
    }
  };

  const stopScreenShare = async (emitSignal = true) => {
    if (!pcRef.current) return;
    
    try {
      // Arrêter l'ancien stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      // Récupérer la caméra
      const cameraStream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      const videoSender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
      const audioSender = pcRef.current.getSenders().find((s) => s.track?.kind === "audio");

      if (videoSender) {
        await videoSender.replaceTrack(cameraStream.getVideoTracks()[0]);
      }
      if (audioSender) {
        await audioSender.replaceTrack(cameraStream.getAudioTracks()[0]);
      }

      localVideoRef.current.srcObject = cameraStream;
      localStreamRef.current = cameraStream;
      setIsSharing(false);
      setCameraOff(false);

      if (emitSignal && targetUserId && conversationId) {
        socketRef.current.emit("stop-screen-share", { 
          conversationId, 
          toUserId: targetUserId 
        });
      }
      
      setStatus("Retour à la caméra");
      
    } catch (error) {
      console.error("❌ Erreur retour caméra:", error);
      setStatus("Erreur lors du retour à la caméra");
    }
  };

  // ========================
  // Contrôles
  // ========================
  const toggleMute = () => {
    if (!localStreamRef.current) return;
    const audioTracks = localStreamRef.current.getAudioTracks();
    if (audioTracks.length > 0) {
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted((prev) => !prev);
      
      // Notifier l'autre participant
      if (targetUserId && conversationId) {
        socketRef.current.emit("toggle-audio", {
          conversationId,
          toUserId: targetUserId,
          isAudioOn: !isMuted
        });
      }
    }
  };

  const toggleCamera = () => {
    if (!localStreamRef.current) return;
    const videoTracks = localStreamRef.current.getVideoTracks();
    if (videoTracks.length > 0) {
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setCameraOff((prev) => !prev);
      
      // Notifier l'autre participant
      if (targetUserId && conversationId) {
        socketRef.current.emit("toggle-video", {
          conversationId,
          toUserId: targetUserId,
          isVideoOn: !cameraOff
        });
      }
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // ========================
  // UI
  // ========================
  return (
    <div style={{ 
      padding: 20, 
      maxWidth: 1200, 
      margin: "0 auto",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      minHeight: "100vh",
      color: "white"
    }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: 20,
        background: "rgba(0,0,0,0.3)",
        padding: "15px 20px",
        borderRadius: 12,
        backdropFilter: "blur(10px)"
      }}>
        <h1 style={{ margin: 0 }}>🎥 Owly Video Call</h1>
        <button 
          onClick={onClose} 
          style={{ 
            background: "#ff4444", 
            color: "white", 
            padding: "10px 20px", 
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            fontWeight: "bold"
          }}
        >
          ✕ Fermer
        </button>
      </div>
      
      <div style={{ 
        background: "rgba(255,255,255,0.1)", 
        padding: 20, 
        borderRadius: 12,
        marginBottom: 20,
        backdropFilter: "blur(10px)"
      }}>
        <p style={{ fontSize: 18, margin: "5px 0" }}>
          <strong>Statut:</strong> {status}
        </p>
        <p style={{ margin: "5px 0" }}>
          <strong>Conversation:</strong> {selectedChat?.name || selectedChat?.groupName || "Non spécifiée"}
        </p>
        <p style={{ margin: "5px 0" }}>
          <strong>Votre ID:</strong> {myUserId ? `${myUserId.substring(0, 8)}...` : "Non connecté"}
        </p>
        {targetUserId && (
          <p style={{ margin: "5px 0" }}>
            <strong>En appel avec:</strong> {targetUserId.substring(0, 8)}...
          </p>
        )}
        {inCall && (
          <p style={{ margin: "5px 0", fontSize: 20, fontWeight: "bold" }}>
            ⏱️ Durée: {formatDuration(callDuration)}
          </p>
        )}
      </div>
      
      {/* Bouton pour démarrer l'appel */}
      {!inCall && !incomingCall && (
        <div style={{ 
          marginTop: 20, 
          textAlign: "center",
          background: "rgba(255,255,255,0.1)",
          padding: 30,
          borderRadius: 12,
          backdropFilter: "blur(10px)"
        }}>
          <button 
            onClick={startCallFromConversation} 
            disabled={callDisabled || !selectedChat || connectionError}
            style={{ 
              background: callDisabled || connectionError ? "#666" : "#4CAF50", 
              color: "white", 
              padding: "15px 30px", 
              borderRadius: 10,
              fontSize: 18,
              cursor: callDisabled || connectionError ? "not-allowed" : "pointer",
              border: "none",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              margin: "0 auto",
              minWidth: 250
            }}
          >
            {isInitiating ? (
              <>
                <span className="spinner"></span> Initialisation...
              </>
            ) : connectionError ? (
              "❌ Connexion échouée"
            ) : (
              "📞 Démarrer l'appel vidéo"
            )}
          </button>
          
          {!selectedChat && (
            <p style={{ color: "#ffcc00", marginTop: 15 }}>
              ⚠️ Aucune conversation sélectionnée
            </p>
          )}
          
          {connectionError && (
            <p style={{ color: "#ff9999", marginTop: 15 }}>
              🔄 Vérifiez votre connexion et rechargez la page
            </p>
          )}
        </div>
      )}

      {/* Notification d'appel entrant */}
      {incomingCall && !inCall && (
        <div style={{ 
          background: "linear-gradient(135deg, #ff9966 0%, #ff5e62 100%)", 
          color: "white", 
          padding: 25, 
          borderRadius: 15,
          marginTop: 20,
          textAlign: "center",
          animation: "pulse 2s infinite"
        }}>
          <h2 style={{ marginTop: 0 }}>📞 Appel entrant !</h2>
          <p style={{ fontSize: 20 }}>
            <strong>{incomingCall.fromUsername || "Utilisateur"}</strong> vous appelle
          </p>
          <div style={{ display: "flex", gap: 20, marginTop: 25, justifyContent: "center" }}>
            <button 
              onClick={acceptIncomingCall}
              style={{ 
                background: "#4CAF50", 
                color: "white", 
                padding: "12px 30px", 
                borderRadius: 8,
                border: "none",
                fontSize: 16,
                cursor: "pointer",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                gap: 8
              }}
            >
              ✔ Accepter
            </button>
            <button 
              onClick={rejectIncomingCall}
              style={{ 
                background: "#ff4444", 
                color: "white", 
                padding: "12px 30px", 
                borderRadius: 8,
                border: "none",
                fontSize: 16,
                cursor: "pointer",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                gap: 8
              }}
            >
              ❌ Refuser
            </button>
          </div>
        </div>
      )}

      {/* Vidéos */}
      <div style={{ 
        display: "flex", 
        gap: 20, 
        marginTop: 30, 
        flexWrap: "wrap",
        justifyContent: "center" 
      }}>
        <div style={{ 
          flex: "1 1 400px", 
          minWidth: 300,
          background: "rgba(0,0,0,0.3)",
          padding: 15,
          borderRadius: 12,
          backdropFilter: "blur(10px)"
        }}>
          <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ background: isMuted ? "#ff4444" : "#4CAF50", width: 10, height: 10, borderRadius: "50%" }}></span>
            Votre vidéo {cameraOff && "(caméra désactivée)"}
          </h3>
          <video 
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted 
            style={{ 
              width: "100%", 
              borderRadius: 10,
              border: "3px solid",
              borderColor: cameraOff ? "#ff4444" : isSharing ? "#9C27B0" : "#4CAF50",
              background: "#000",
              aspectRatio: "16/9"
            }} 
          />
        </div>
        <div style={{ 
          flex: "1 1 400px", 
          minWidth: 300,
          background: "rgba(0,0,0,0.3)",
          padding: 15,
          borderRadius: 12,
          backdropFilter: "blur(10px)"
        }}>
          <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ background: isRemoteSharing ? "#ff9800" : "#4CAF50", width: 10, height: 10, borderRadius: "50%" }}></span>
            Vidéo distante {isRemoteSharing && "(partage d'écran)"}
          </h3>
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            style={{ 
              width: "100%", 
              borderRadius: 10,
              border: "3px solid",
              borderColor: isRemoteSharing ? "#ff9800" : "#2196F3",
              background: "#000",
              aspectRatio: "16/9"
            }} 
          />
        </div>
      </div>

      {/* Contrôles pendant l'appel */}
      {inCall && (
        <div style={{ 
          display: "flex", 
          gap: 15, 
          marginTop: 30, 
          flexWrap: "wrap",
          justifyContent: "center",
          background: "rgba(0,0,0,0.3)",
          padding: 20,
          borderRadius: 12,
          backdropFilter: "blur(10px)"
        }}>
          <button 
            onClick={endCall} 
            style={{ 
              background: "#ff4444", 
              color: "white", 
              padding: "15px 25px", 
              borderRadius: 10,
              border: "none",
              fontSize: 16,
              cursor: "pointer",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: 8,
              minWidth: 150
            }}
          >
            📞 Raccrocher
          </button>
          <button 
            onClick={toggleMute}
            style={{ 
              background: isMuted ? "#666" : "#2196F3", 
              color: "white", 
              padding: "15px 25px", 
              borderRadius: 10,
              border: "none",
              fontSize: 16,
              cursor: "pointer",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: 8,
              minWidth: 150
            }}
          >
            {isMuted ? "🔇 Micro coupé" : "🎙️ Couper micro"}
          </button>
          <button 
            onClick={toggleCamera}
            style={{ 
              background: cameraOff ? "#666" : "#2196F3", 
              color: "white", 
              padding: "15px 25px", 
              borderRadius: 10,
              border: "none",
              fontSize: 16,
              cursor: "pointer",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: 8,
              minWidth: 150
            }}
          >
            {cameraOff ? "📷 Caméra coupée" : "🚫 Couper caméra"}
          </button>
          <button 
            onClick={isSharing ? stopScreenShare : startScreenShare} 
            disabled={shareDisabled}
            style={{ 
              background: isSharing ? "#ff9800" : "#9C27B0", 
              color: "white", 
              padding: "15px 25px", 
              borderRadius: 10,
              border: "none",
              fontSize: 16,
              cursor: shareDisabled ? "not-allowed" : "pointer",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: 8,
              minWidth: 150,
              opacity: shareDisabled ? 0.5 : 1
            }}
          >
            {isSharing ? "🖥️ Arrêter partage" : "🖥️ Partager écran"}
          </button>

        </div>
      )}

      {/* Styles pour l'animation */}
      <style jsx>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }
        
        .spinner {
          display: inline-block;
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255,255,255,.3);
          border-radius: 50%;
          border-top-color: #fff;
          animation: spin 1s ease-in-out infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );

}



/*
***********************************
***********************************
***********************************
***********************************
***********************************
***********************************
***********************************
***********************************
***********************************
***********************************
***********************************
***********************************
***********************************
***********************************
***********************************
***********************************
***********************************
***********************************
***********************************
***********************************
***********************************
***********************************
***********************************
*/


