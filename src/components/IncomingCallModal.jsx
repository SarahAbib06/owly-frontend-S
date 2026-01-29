// 🔥 CORRECTION - IncomingCallModal.jsx
// Gérer TOUS les cas de fin d'appel (timeout, annulation, rejet)

import React, { useEffect } from "react";
import { Phone, Video, X, Check } from "lucide-react";
import { useCall } from "../context/CallContext";
import socketService from "../services/socketService";
import "./IncomingCallModal.css";

const IncomingCallModal = () => {
  const {
    incomingCall,
    showIncomingCallModal,
    acceptCall,
    rejectCall,
    setShowIncomingCallModal,
    setIncomingCall
  } = useCall();

  const stopRingtone = () => {
    const audio = document.querySelector('audio');
    if (audio) audio.pause();
  };

  // 🔥 ÉCOUTER TOUS LES ÉVÉNEMENTS DE FIN D'APPEL
  useEffect(() => {
    const socket = socketService.socket;
    if (!socket) return;

    // 1️⃣ Annulation par l'appelant (avant que tu acceptes)
    const handleCallCancelled = (data) => {
      console.log("📴 [call-cancelled] Appel annulé par l'appelant", data);
      
      // Vérifier que c'est bien notre appel
      if (incomingCall && data.callId === incomingCall.callId) {
        setShowIncomingCallModal(false);
        stopRingtone();
        setIncomingCall(null);
      }
    };

    // 2️⃣ Fin d'appel (timeout, ou autre raison)
    const handleCallEnded = (data) => {
      console.log("📴 [call:ended] Appel terminé", data);
      
      // Vérifier que c'est notre appel
      if (incomingCall && data.callId === incomingCall.callId) {
        setShowIncomingCallModal(false);
        stopRingtone();
        setIncomingCall(null);
      }
    };

    // 3️⃣ Échec de l'appel (utilisateur hors ligne, etc.)
    const handleCallFailed = (data) => {
      console.log("❌ [call-failed] Appel échoué", data);
      
      if (incomingCall && data.callId === incomingCall.callId) {
        setShowIncomingCallModal(false);
        stopRingtone();
        setIncomingCall(null);
      }
    };

    // 4️⃣ Erreur d'appel
    const handleCallError = (data) => {
      console.log("💥 [call-error] Erreur d'appel", data);
      
      setShowIncomingCallModal(false);
      stopRingtone();
      setIncomingCall(null);
    };

    // Écouter tous les événements
    socket.on("call-cancelled", handleCallCancelled);
    socket.on("call:ended", handleCallEnded);
    socket.on("call-failed", handleCallFailed);
    socket.on("call-error", handleCallError);

    return () => {
      socket.off("call-cancelled", handleCallCancelled);
      socket.off("call:ended", handleCallEnded);
      socket.off("call-failed", handleCallFailed);
      socket.off("call-error", handleCallError);
    };
  }, [incomingCall, setShowIncomingCallModal, setIncomingCall]);

  if (!showIncomingCallModal || !incomingCall) return null;

  // 🔥 DIFFÉRENCIATION AUDIO/VIDÉO
  const isVideoCall = incomingCall.callType === "video";

  return (
    <div className="incoming-call-overlay">
      <div className="incoming-call-modal">
        {/* Icône animée selon le type d'appel */}
        <div className={`call-icon ${isVideoCall ? 'video' : 'audio'}`}>
          {isVideoCall ? (
            <Video size={48} strokeWidth={1.5} />
          ) : (
            <Phone size={48} strokeWidth={1.5} />
          )}
        </div>

        {/* Titre selon le type */}
        <h3>
          {isVideoCall ? " Appel vidéo entrant" : " Appel audio entrant"}
        </h3>
        
        <p className="caller-name">{incomingCall.callerName}</p>
        <p className="call-type-label">
          {isVideoCall ? "Souhaite vous appeler en vidéo" : "Souhaite vous appeler"}
        </p>

        <div className="incoming-call-actions">
          <button 
            onClick={rejectCall} 
            className="reject"
            aria-label="Refuser l'appel"
          >
            <X size={24} />
            <span>Refuser</span>
          </button>

          <button 
            onClick={acceptCall} 
            className="accept"
            aria-label="Accepter l'appel"
          >
            <Check size={24} />
            <span>Accepter</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
