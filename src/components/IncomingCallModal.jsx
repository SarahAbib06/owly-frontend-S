import React from "react";
import { useCall } from "../context/CallContext";
import "./IncomingCallModal.css";

const IncomingCallModal = () => {
  const {
    incomingCall,
    showIncomingCallModal,
    acceptCall,
    rejectCall,
  } = useCall();

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
