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

  // Écoute l'annulation par l'appelant
  useEffect(() => {
    const socket = socketService.socket;
    if (!socket) return;

    const handleCallCancelled = (data) => {
      console.log("📴 [call-cancelled] Appel annulé par l'appelant", data);
      setShowIncomingCallModal(false);
      stopRingtone();
      setIncomingCall(null);
    };

    socket.on("call-cancelled", handleCallCancelled);

    return () => {
      socket.off("call-cancelled", handleCallCancelled);
    };
  }, [setShowIncomingCallModal, setIncomingCall]);

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
          {isVideoCall ? " Appel vidéo entrant" : "Appel audio entrant"}
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