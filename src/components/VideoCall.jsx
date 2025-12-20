// src/components/VideoCall.jsx
import { useEffect, useRef, useState } from "react";
import { useAppel } from "../context/AppelContext";
import { useAuth } from "../hooks/useAuth";

export default function VideoCall() {
  const { user } = useAuth();
  const { currentCall, endCall, socket: contextSocket } = useAppel();
  
  const [status, setStatus] = useState(currentCall?.isInitiator ? "Appel en cours..." : "Appel accepté");
  const [isMuted, setIsMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isRemoteSharing, setIsRemoteSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isPeerConnected, setIsPeerConnected] = useState(false);

  const pcRef = useRef(null);
  const socketRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(new MediaStream());
  const durationIntervalRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);
  const isInitializedRef = useRef(false);
  const offerSentRef = useRef(false);

  // Si pas d'appel en cours, ne rien afficher
  if (!currentCall) {
    return null;
  }

  // Utiliser le socket du contexte
  useEffect(() => {
    if (contextSocket && !socketRef.current) {
      socketRef.current = contextSocket;
      console.log("✅ Socket du contexte utilisé pour WebRTC:", contextSocket.id);
    }
  }, [contextSocket]);

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
    console.log("🔴 Nettoyage des ressources...");
    
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

    // Ne pas fermer le socket (utilisé par le contexte)
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    pendingIceCandidatesRef.current = [];
    isInitializedRef.current = false;
    offerSentRef.current = false;
  };

  const handleEndCall = () => {
    console.log("📞 Raccrochage de l'appel...");
    
    if (socketRef.current?.connected) {
      socketRef.current.emit("hang-up", {
        conversationId: currentCall.conversation?._id,
        fromUserId: user?._id,
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
        video: true,
        audio: false
      });

      const videoSender = pcRef.current?.getSenders().find((s) => s.track?.kind === "video");
      if (videoSender && pcRef.current) {
        await videoSender.replaceTrack(screenStream.getVideoTracks()[0]);
      }

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

      if (socketRef.current?.connected && currentCall?.targetUserId) {
        socketRef.current.emit("start-screen-share", {
          conversationId: currentCall.conversation?._id,
          toUserId: currentCall.targetUserId
        });
      }

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
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });

      const videoSender = pcRef.current?.getSenders().find((s) => s.track?.kind === "video");
      if (videoSender && pcRef.current) {
        await videoSender.replaceTrack(cameraStream.getVideoTracks()[0]);
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }

      localStreamRef.current = cameraStream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = cameraStream;
      }

      setIsSharing(false);
      setStatus("Retour à la caméra");

      if (socketRef.current?.connected && currentCall?.targetUserId) {
        socketRef.current.emit("stop-screen-share", {
          conversationId: currentCall.conversation?._id,
          toUserId: currentCall.targetUserId
        });
      }

    } catch (error) {
      console.error("Erreur retour caméra:", error);
    }
  };

  const createPeerConnection = () => {
    try {
      console.log("🔗 Création de PeerConnection...");
      
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

      // Écouter les tracks distantes
      pc.ontrack = (event) => {
        console.log("🎬 Track distant reçue:", event.track.kind);
        console.log("📊 Nombre de streams:", event.streams?.length);
        
        if (event.streams && event.streams[0]) {
          // Nettoyer les anciennes tracks
          remoteStreamRef.current.getTracks().forEach(track => {
            remoteStreamRef.current.removeTrack(track);
          });
          
          // Ajouter les nouvelles tracks
          event.streams[0].getTracks().forEach((track) => {
            console.log("➕ Ajout track distant:", track.kind, "état:", track.readyState);
            remoteStreamRef.current.addTrack(track);
          });
          
          // Mettre à jour la source vidéo
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStreamRef.current;
          }
          
          setIsPeerConnected(true);
          console.log("✅ PeerConnection établie - Stream distant prêt");
          setStatus(`Connecté avec ${currentCall.targetUsername || "Utilisateur"}`);
        }
      };

      // Ajouter les tracks locales
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          const sender = pc.addTrack(track, localStreamRef.current);
          console.log("🎤 Track locale ajoutée:", track.kind);
        });
      }

      // Gestion ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current?.connected) {
          console.log("🧊 ICE candidate généré:", event.candidate.type);
          
          socketRef.current.emit("ice-candidate", {
            conversationId: currentCall.conversation?._id,
            candidate: event.candidate,
            fromUserId: user?._id
          });
        } else if (!event.candidate) {
          console.log("✅ Fin de la collecte ICE");
        }
      };

      // Suivi de l'état ICE
      pc.oniceconnectionstatechange = () => {
        console.log("🔄 ICE state:", pc.iceConnectionState);
        
        if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
          setIsPeerConnected(true);
          startCallTimer();
          setStatus(`Connecté avec ${currentCall.targetUsername || "Utilisateur"}`);
        } else if (pc.iceConnectionState === "disconnected") {
          setIsPeerConnected(false);
          setStatus("Connexion instable...");
        } else if (pc.iceConnectionState === "failed") {
          console.error("❌ ICE connection failed");
          setIsPeerConnected(false);
          setStatus("Échec de connexion");
        }
      };

      console.log("✅ PeerConnection créée avec succès");
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
        console.error("❌ Erreur traitement ICE candidate en attente:", error);
      }
    }
  };

  // Écouter les événements socket
  useEffect(() => {
    if (!socketRef.current || !currentCall) return;

    const socket = socketRef.current;

    const handleOffer = async ({ sdp, fromUserId }) => {
      console.log("📞 OFFER reçue de:", fromUserId);
      console.log("📦 SDP reçu:", sdp?.type, sdp?.sdp?.substring(0, 100));
      
      if (!pcRef.current) {
        console.error("❌ PeerConnection non initialisée");
        return;
      }

      try {
        console.log("📥 Définition de remoteDescription...");
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
        console.log("✅ RemoteDescription définie");
        
        // Traiter les candidates en attente
        await processPendingIceCandidates();
        
        // Créer et envoyer la réponse
        console.log("📤 Création de answer...");
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        
        console.log("📤 Envoi de ANSWER à:", fromUserId);
        
        socket.emit("answer", {
          conversationId: currentCall.conversation?._id,
          sdp: answer
        });
        
        setStatus("Connexion en cours...");
        
      } catch (error) {
        console.error("❌ Erreur traitement OFFER:", error);
        setStatus("Erreur de connexion");
      }
    };

    const handleAnswer = async ({ sdp, fromUserId }) => {
      console.log("📥 ANSWER reçue de:", fromUserId);
      console.log("📦 SDP reçu:", sdp?.type);
      
      if (!pcRef.current) {
        console.error("❌ PeerConnection non initialisée");
        return;
      }

      try {
        if (pcRef.current.signalingState === "have-local-offer") {
          console.log("📥 Définition de remoteDescription depuis answer...");
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
          console.log("✅ RemoteDescription définie depuis answer");
          
          // Traiter les candidates en attente
          await processPendingIceCandidates();
          
          console.log("✅ Connexion WebRTC établie");
        } else {
          console.warn("⚠️ Mauvais état signaling pour answer:", pcRef.current.signalingState);
        }
      } catch (error) {
        console.error("❌ Erreur traitement ANSWER:", error);
      }
    };

    const handleIceCandidate = async ({ candidate, fromUserId }) => {
      console.log("🧊 ICE candidate reçu de:", fromUserId);
      
      if (!pcRef.current) {
        console.error("❌ PeerConnection non initialisée");
        return;
      }

      try {
        if (pcRef.current.remoteDescription) {
          console.log("➕ Ajout ICE candidate immédiat");
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          console.log("⏳ ICE candidate mis en attente");
          pendingIceCandidatesRef.current.push(candidate);
        }
      } catch (error) {
        console.error("❌ Erreur ajout ICE candidate:", error);
      }
    };

    const handleHangUp = ({ fromUserId }) => {
      console.log("📞 Appel raccroché par:", fromUserId);
      setStatus("Appel terminé par l'autre participant");
      cleanupResources();
      endCall();
    };

    const handleScreenShareStart = () => {
      console.log("🖥️ L'autre participant partage son écran");
      setIsRemoteSharing(true);
      setStatus("L'autre participant partage son écran");
    };

    const handleScreenShareStop = () => {
      console.log("📹 Retour à la caméra");
      setIsRemoteSharing(false);
      setStatus("Retour à l'appel vidéo");
    };

    // Configurer les écouteurs
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("hang-up", handleHangUp);
    socket.on("start-screen-share", handleScreenShareStart);
    socket.on("stop-screen-share", handleScreenShareStop);

    // Nettoyer les écouteurs
    return () => {
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("hang-up", handleHangUp);
      socket.off("start-screen-share", handleScreenShareStart);
      socket.off("stop-screen-share", handleScreenShareStop);
    };
  }, [currentCall, endCall, user]);

  // Initialisation principale
  useEffect(() => {
    if (isInitializedRef.current) {
      console.log("⚠️ Déjà initialisé, skip...");
      return;
    }

    const initCall = async () => {
      try {
        isInitializedRef.current = true;
        console.log("🚀 Initialisation de l'appel...");
        console.log("👤 Utilisateur:", user?._id, user?.username);
        console.log("📱 Appel courant:", currentCall);
        console.log("🎯 Cible:", currentCall?.targetUserId);
        console.log("🔌 Socket:", socketRef.current?.id, "connecté:", socketRef.current?.connected);

        // Vérifier le socket
        if (!socketRef.current) {
          console.error("❌ Socket non disponible");
          setStatus("Erreur de connexion");
          return;
        }

        // Attendre que le socket soit connecté
        if (!socketRef.current.connected) {
          console.log("⏳ En attente de connexion socket...");
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("Timeout connexion socket"));
            }, 5000);

            if (socketRef.current.connected) {
              clearTimeout(timeout);
              resolve();
            } else {
              socketRef.current.once("connect", () => {
                clearTimeout(timeout);
                resolve();
              });
              socketRef.current.once("connect_error", (error) => {
                clearTimeout(timeout);
                reject(error);
              });
            }
          });
        }

        console.log("✅ Socket connecté:", socketRef.current.id);

        // Obtenir le stream média local
        console.log("🎥 Demande des permissions média...");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 24 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        console.log("✅ Stream local obtenu avec", stream.getTracks().length, "tracks");

        // Créer la PeerConnection
        createPeerConnection();

        // Si on est l'initiateur, créer et envoyer une OFFER
        if (currentCall.isInitiator && pcRef.current) {
          console.log("📞 Création de l'OFFER (initiateur)...");
          try {
            const offerOptions = {
              offerToReceiveAudio: 1,
              offerToReceiveVideo: 1
            };
            
            const offer = await pcRef.current.createOffer(offerOptions);
            console.log("📦 OFFER créée:", offer.type);
            console.log("📝 SDP:", offer.sdp?.substring(0, 200));
            
            await pcRef.current.setLocalDescription(offer);
            console.log("📋 LocalDescription définie");
            
            console.log("📤 Envoi de l'OFFER...");
            
            socketRef.current.emit("offer", {
              conversationId: currentCall.conversation?._id,
              sdp: offer
            });
            
            offerSentRef.current = true;
            console.log("✅ OFFER envoyée avec succès");
            
            setStatus(`Appel de ${currentCall.targetUsername || "Utilisateur"}...`);
          } catch (error) {
            console.error("❌ Erreur création/envoi OFFER:", error);
            setStatus("Erreur lors de l'appel");
          }
        } else {
          console.log("📞 En attente d'appel entrant...");
          console.log("👂 En attente de l'OFFER de l'appelant...");
          setStatus("En attente d'appel entrant...");
        }

      } catch (error) {
        console.error("❌ Erreur initialisation appel:", error);
        isInitializedRef.current = false;
        setStatus(`Erreur: ${error.message}`);
      }
    };

    initCall();

    return () => {
      console.log("🧹 Nettoyage du composant VideoCall");
      if (!isInitializedRef.current) {
        cleanupResources();
      }
    };
  }, [currentCall, user]);

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
        {isPeerConnected && (
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