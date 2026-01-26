import React, { useEffect } from "react";
import { useCall } from "../context/CallContext";
import socketService from "../services/socketService"; // ← AJOUTE CETTE IMPORTATION
import "./IncomingCallModal.css";

const IncomingCallModal = () => {
  const {
    incomingCall,
    showIncomingCallModal,
    acceptCall,
    rejectCall,
    setShowIncomingCallModal,     // ← AJOUTE ÇA si pas déjà présent
    setIncomingCall               // ← AJOUTE ÇA si pas déjà présent
  } = useCall();

  // Arrêt sonnerie (si tu as une fonction stopRingtone dans CallContext)
  const stopRingtone = () => {
    // Implémente ici ou récupère depuis context
    const audio = document.querySelector('audio');
    if (audio) audio.pause();
  };

  // ÉCOUTE L'ANNULATION PAR L'APPELANT
  useEffect(() => {
    const socket = socketService.socket;
    if (!socket) return;

    const handleCallCancelled = (data) => {
      console.log("📴 [call-cancelled] Appel annulé par l'appelant", data);

      // Ferme le modal
      setShowIncomingCallModal(false);

      // Arrête la sonnerie
      stopRingtone();

      // Nettoie l'état
      setIncomingCall(null);

      // Optionnel : notification visible
      // alert("L'appel a été annulé par l'autre personne");
    };

    socket.on("call-cancelled", handleCallCancelled);

    return () => {
      socket.off("call-cancelled", handleCallCancelled);
    };
  }, [setShowIncomingCallModal, setIncomingCall]);

  if (!showIncomingCallModal || !incomingCall) return null;

  return (
    <div className="incoming-call-overlay">
      <div className="incoming-call-modal">
        <h3>📞 Appel entrant</h3>
        <p>{incomingCall.callerName}</p>

        <div className="incoming-call-actions">
          <button onClick={acceptCall} className="accept">
            Accepter
          </button>

          <button onClick={rejectCall} className="reject">
            Refuser
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;