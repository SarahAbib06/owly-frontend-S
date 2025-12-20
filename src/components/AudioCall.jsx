// src/components/AudioCall.jsx
import { useEffect, useRef, useState } from "react";
import { useAppel } from "../context/AppelContext";
import { useAuth } from "../hooks/useAuth";

export default function AudioCall() {
  const { user } = useAuth();
  const { 
    currentCall, 
    endCall, 
    socket: globalSocket, 
    setCurrentCall, 
    stopRingtone, 
    callType,
    answerCall, // <-- Important: fonction pour accepter l'appel
    declineCall // <-- Important: fonction pour refuser l'appel
  } = useAppel();
  
  const [status, setStatus] = useState("Initialisation...");
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isPeerConnected, setIsPeerConnected] = useState(false);
  const [showIncomingCallModal, setShowIncomingCallModal] = useState(false);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(new MediaStream());
  const durationIntervalRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);
  const isInitializedRef = useRef(false);
  const remoteAudioRef = useRef(null);

  // Si pas d'appel en cours ou mauvais type, ne rien afficher
  if (!currentCall || callType !== 'audio') {
    return null;
  }

  // Afficher le modal d'appel entrant si on n'est pas l'initiateur
  useEffect(() => {
    if (currentCall && !currentCall.isInitiator && !isInitializedRef.current) {
      setShowIncomingCallModal(true);
      setStatus("Appel entrant...");
    }
  }, [currentCall]);

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
    console.log("🔴 Nettoyage des ressources audio...");
    
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      localStreamRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    pendingIceCandidatesRef.current = [];
    isInitializedRef.current = false;
    setShowIncomingCallModal(false);
  };

  const handleEndCall = () => {
    console.log("📞 Raccrochage de l'appel vocal...");
    
    if (globalSocket?.connected) {
      globalSocket.emit("hang-up", {
        conversationId: currentCall.conversation?._id,
        toUserId: currentCall.targetUserId
      });
    }
    
    cleanupResources();
    stopRingtone();
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
      
      if (globalSocket?.connected && currentCall?.targetUserId) {
        globalSocket.emit("toggle-audio", {
          conversationId: currentCall.conversation?._id,
          toUserId: currentCall.targetUserId,
          isAudioOn: newMuteState
        });
      }
    }
  };

  // Fonction pour accepter l'appel entrant
  const handleAcceptCall = async () => {
    console.log("✅ Acceptation de l'appel entrant");
    setShowIncomingCallModal(false);
    await answerCall(); // Appelle la fonction du contexte
    
    // Initialiser l'appel après acceptation
    initializeCall();
  };

  // Fonction pour refuser l'appel entrant
  const handleDeclineCall = () => {
    console.log("❌ Refus de l'appel entrant");
    
    if (globalSocket?.connected) {
      globalSocket.emit("reject-call", {
        conversationId: currentCall.conversation?._id,
        toUserId: currentCall.callerId || currentCall.targetUserId
      });
    }
    
    cleanupResources();
    stopRingtone();
    declineCall(); // Appelle la fonction du contexte
  };

  const createPeerConnection = () => {
    try {
      console.log("🔗 Création de PeerConnection audio...");
      
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" }
        ]
      });
      
      pcRef.current = pc;

      // Écouter les tracks distantes
      pc.ontrack = (event) => {
        console.log("🎬 Track audio distant reçue");
        
        if (event.streams && event.streams[0]) {
          remoteStreamRef.current.getTracks().forEach(track => {
            remoteStreamRef.current.removeTrack(track);
          });
          
          event.streams[0].getTracks().forEach((track) => {
            console.log("➕ Ajout track audio distant");
            remoteStreamRef.current.addTrack(track);
          });
          
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remoteStreamRef.current;
          }
          
          setIsPeerConnected(true);
          setStatus("Connecté");
        }
      };

      // Ajouter les tracks locales
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      // Gestion ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("❄️ ICE candidate généré");
          globalSocket?.emit("ice-candidate", {
            conversationId: currentCall.conversation?._id,
            candidate: event.candidate,
            fromUserId: user?._id
          });
        }
      };

      // Suivi de l'état ICE
      pc.oniceconnectionstatechange = () => {
        console.log("🔗 État ICE:", pc.iceConnectionState);
        if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
          setIsPeerConnected(true);
          startCallTimer();
          setStatus(`Appel avec ${currentCall.targetUsername}`);
        } else if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
          setIsPeerConnected(false);
          setStatus("Connexion perdue");
        }
      };

      console.log("✅ PeerConnection audio créée avec succès");
      return pc;

    } catch (error) {
      console.error("❌ Erreur création PeerConnection:", error);
      throw error;
    }
  };

  const processPendingIceCandidates = async () => {
    if (!pcRef.current || !pcRef.current.remoteDescription) {
      console.log("⏳ Pas de remoteDescription pour traiter les ICE candidates");
      return;
    }
    
    console.log("🔄 Traitement de", pendingIceCandidatesRef.current.length, "ICE candidates en attente");
    
    while (pendingIceCandidatesRef.current.length > 0) {
      const candidate = pendingIceCandidatesRef.current.shift();
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        console.log("✅ ICE candidate traité (en attente)");
      } catch (error) {
        console.error("❌ Erreur ajout ICE candidate:", error);
      }
    }
  };

  // Fonction d'initialisation de l'appel (séparée pour réutiliser)
  const initializeCall = async () => {
    if (isInitializedRef.current || !globalSocket) {
      return;
    }

    try {
      isInitializedRef.current = true;
      console.log("🚀 Initialisation de l'appel vocal...");

      // Vérifier que le socket est connecté
      if (!globalSocket.connected) {
        console.log("⏳ En attente de connexion socket...");
        await new Promise((resolve) => {
          globalSocket.once("connect", resolve);
        });
      }

      // Obtenir le stream audio
      console.log("🎤 Demande du micro...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      localStreamRef.current = stream;
      console.log("✅ Stream audio obtenu");

      // Créer la PeerConnection
      createPeerConnection();

      // Si on est l'initiateur, envoyer l'OFFER
      if (currentCall.isInitiator && pcRef.current) {
        console.log("📞 Création de l'OFFER (initiateur audio)...");
        try {
          const offerOptions = {
            offerToReceiveAudio: 1,
            offerToReceiveVideo: 0
          };
          
          const offer = await pcRef.current.createOffer(offerOptions);
          console.log("📦 OFFER audio créée");
          
          await pcRef.current.setLocalDescription(offer);
          console.log("📋 LocalDescription définie");
          
          console.log("📤 Envoi de l'OFFER à:", currentCall.targetUserId);
          
          globalSocket.emit("offer", {
            conversationId: currentCall.conversation?._id,
            sdp: offer,
            fromUserId: user?._id
          });
          
          setStatus(`Appel de ${currentCall.targetUsername}...`);
        } catch (error) {
          console.error("❌ Erreur création/envoi OFFER:", error);
          setStatus("Erreur lors de l'appel");
        }
      } else {
        console.log("📞 Appel accepté, en attente de connexion...");
        setStatus("Connexion en cours...");
      }

    } catch (error) {
      console.error("❌ Erreur initialisation appel audio:", error);
      isInitializedRef.current = false;
      setStatus(`Erreur: ${error.message}`);
    }
  };

  // Écouter les événements socket
  useEffect(() => {
    if (!globalSocket || !currentCall || callType !== 'audio') {
      console.log("⏳ En attente du socket global et de l'appel audio...");
      return;
    }

    const socket = globalSocket;
    console.log("🔗 Configuration des écouteurs socket audio...");

    const handleOffer = async ({ sdp, fromUserId }) => {
      console.log("📨 OFFER reçue de:", fromUserId);
      
      if (!pcRef.current) {
        console.log("🔗 Création PeerConnection (récepteur audio)...");
        createPeerConnection();
      }

      try {
        console.log("📥 Définition de remoteDescription...");
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
        console.log("✅ RemoteDescription définie");
        
        await processPendingIceCandidates();
        
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        
        console.log("📤 Envoi de ANSWER...");
        
        socket.emit("answer", {
          conversationId: currentCall.conversation?._id,
          sdp: answer,
          fromUserId: user?._id
        });
        
        setStatus("Appel établi");
        
      } catch (error) {
        console.error("❌ Erreur traitement OFFER:", error);
        setStatus("Erreur de connexion");
      }
    };

    const handleAnswer = async ({ sdp, fromUserId }) => {
      console.log("📥 ANSWER reçue de:", fromUserId);
      
      if (!pcRef.current) {
        console.error("❌ PeerConnection non initialisée");
        return;
      }

      try {
        if (pcRef.current.signalingState === "have-local-offer") {
          console.log("📥 Définition de remoteDescription depuis answer...");
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
          console.log("✅ RemoteDescription définie depuis answer");
          
          await processPendingIceCandidates();
          
          console.log("✅ Connexion WebRTC audio établie");
        }
      } catch (error) {
        console.error("❌ Erreur traitement ANSWER:", error);
      }
    };

    const handleIceCandidate = async ({ candidate, fromUserId }) => {
      if (!candidate) return;
      
      try {
        if (pcRef.current.remoteDescription) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          console.log("✅ ICE candidate ajouté immédiatement");
        } else {
          pendingIceCandidatesRef.current.push(candidate);
          console.log("⏳ ICE candidate en attente (pas de remoteDescription)");
        }
      } catch (error) {
        console.error("❌ Erreur ajout ICE candidate:", error);
      }
    };

    const handleHangUp = ({ fromUserId }) => {
      console.log("📞 Appel vocal raccroché par:", fromUserId);
      setStatus("Appel terminé par l'autre participant");
      cleanupResources();
      stopRingtone();
      endCall();
    };

    // Configurer les écouteurs
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("hang-up", handleHangUp);

    // Nettoyer les écouteurs
    return () => {
      console.log("🧹 Nettoyage des écouteurs socket audio");
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("hang-up", handleHangUp);
    };
  }, [currentCall, endCall, user, globalSocket, callType, stopRingtone]);

  // Initialisation automatique si on est l'initiateur
  useEffect(() => {
    if (currentCall?.isInitiator && !isInitializedRef.current && globalSocket) {
      initializeCall();
    }
  }, [currentCall, globalSocket]);

  const otherUser = currentCall.targetUsername || "Utilisateur";

  // =====================================
  // MODAL D'APPEL ENTRANT
  // =====================================
  if (showIncomingCallModal) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000,
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #4F46E5 0%, #7E69AB 100%)',
          borderRadius: '20px',
          padding: '40px',
          textAlign: 'center',
          color: 'white',
          maxWidth: '400px',
          width: '90%',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          animation: 'slideIn 0.3s ease-out'
        }}>
          {/* Icône d'appel */}
          <div style={{
            fontSize: '80px',
            marginBottom: '20px',
            animation: 'pulse 1.5s infinite'
          }}>
            📞
          </div>
          
          {/* Nom de l'appelant */}
          <h2 style={{
            margin: '0 0 10px 0',
            fontSize: '28px',
            fontWeight: 'bold'
          }}>
            {currentCall.callerName || "Appel entrant"}
          </h2>
          
          <p style={{
            marginBottom: '30px',
            fontSize: '16px',
            opacity: 0.8
          }}>
            Appel vocal
          </p>
          
          {/* Boutons d'action */}
          <div style={{
            display: 'flex',
            gap: '20px',
            justifyContent: 'center'
          }}>
            {/* Bouton Refuser (rouge) */}
            <button
              onClick={handleDeclineCall}
              style={{
                background: '#FF4444',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '70px',
                height: '70px',
                fontSize: '24px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 15px rgba(255, 68, 68, 0.3)',
                transition: 'transform 0.2s'
              }}
              onMouseOver={(e) => e.target.style.transform = 'scale(1.1)'}
              onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
            >
              ✕
            </button>
            
            {/* Bouton Accepter (vert) */}
            <button
              onClick={handleAcceptCall}
              style={{
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '70px',
                height: '70px',
                fontSize: '24px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
                transition: 'transform 0.2s'
              }}
              onMouseOver={(e) => e.target.style.transform = 'scale(1.1)'}
              onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
            >
              ✓
            </button>
          </div>
          
          {/* Légende */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '20px',
            fontSize: '14px'
          }}>
            <span style={{ color: '#FF4444' }}>Refuser</span>
            <span style={{ color: '#4CAF50' }}>Accepter</span>
          </div>
        </div>
        
        {/* Animations CSS */}
        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
          
          @keyframes slideIn {
            from { transform: translateY(-50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // =====================================
  // INTERFACE D'APPEL EN COURS
  // =====================================
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "linear-gradient(135deg, #FF6B6B 0%, #FF8C42 100%)",
      color: "white",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      {/* Contenu principal */}
      <div style={{
        textAlign: "center",
        padding: "40px",
        maxWidth: "600px"
      }}>
        {/* Icône de profil */}
        <div style={{
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.2)",
          margin: "0 auto 30px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 60
        }}>
          🎤
        </div>

        {/* Nom du contact */}
        <h1 style={{ 
          margin: "0 0 10px 0", 
          fontSize: 32,
          fontWeight: "bold"
        }}>
          {otherUser}
        </h1>

        {/* Statut */}
        <p style={{ 
          fontSize: 18, 
          margin: "10px 0",
          opacity: 0.9
        }}>
          {status}
        </p>

        {/* Durée */}
        {isPeerConnected && (
          <p style={{ 
            margin: "15px 0", 
            fontSize: 24, 
            fontWeight: "bold", 
            color: "#FFE66D" 
          }}>
            Durée: {formatDuration(callDuration)}
          </p>
        )}

        {!isPeerConnected && (
          <div style={{
            marginTop: "20px",
            fontSize: "16px",
            display: "flex",
            justifyContent: "center",
            gap: "10px",
            alignItems: "center"
          }}>
            <div style={{
              display: "inline-block",
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              background: "#FFE66D",
              animation: "pulse 1.5s infinite"
            }}></div>
            Connexion en cours...
          </div>
        )}
      </div>

      {/* Contrôles */}
      <div style={{
        display: "flex",
        gap: "20px",
        justifyContent: "center",
        padding: "30px",
        position: "absolute",
        bottom: "40px",
        flexWrap: "wrap"
      }}>
        {/* Bouton Raccrocher */}
        <button
          onClick={handleEndCall}
          style={{
            background: "#FF1744",
            color: "white",
            padding: "15px 30px",
            borderRadius: "50px",
            border: "none",
            fontSize: "16px",
            cursor: "pointer",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            minWidth: "150px",
            justifyContent: "center",
            boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
            transition: "transform 0.2s",
            transform: "scale(1)"
          }}
          onMouseOver={(e) => e.target.style.transform = "scale(1.1)"}
          onMouseOut={(e) => e.target.style.transform = "scale(1)"}
        >
          📞 Raccrocher
        </button>

        {/* Bouton Micro */}
        <button
          onClick={toggleMute}
          style={{
            background: isMuted ? "#757575" : "#2196F3",
            color: "white",
            padding: "15px 30px",
            borderRadius: "50px",
            border: "none",
            fontSize: "16px",
            cursor: "pointer",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            minWidth: "150px",
            justifyContent: "center",
            boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
            transition: "transform 0.2s",
            transform: "scale(1)"
          }}
          onMouseOver={(e) => e.target.style.transform = "scale(1.1)"}
          onMouseOut={(e) => e.target.style.transform = "scale(1)"}
        >
          {isMuted ? "🎤 Micro coupé" : "🎤 Couper micro"}
        </button>
      </div>

      {/* Audio element pour recevoir l'audio distant */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        style={{ display: "none" }}
      />
    </div>
  );
}