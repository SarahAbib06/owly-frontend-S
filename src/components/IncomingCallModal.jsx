import React from 'react';
import { Phone, X } from 'lucide-react';
import './IncomingCallModal.css';

const IncomingCallModal = ({ callData, onAccept, onReject }) => {
  if (!callData) return null;

  return (
    <div className="incoming-call-modal-overlay">
      <div className="incoming-call-modal">
        <div className="modal-content">
          <div className="caller-avatar">
            {callData.callerName?.charAt(0).toUpperCase() || 'U'}
          </div>
          
          <div className="caller-info">
            <h3>Appel vidéo entrant</h3>
            <p className="caller-name">{callData.callerName}</p>
            <p className="call-type">Appel vidéo</p>
          </div>
          
          <div className="modal-controls">
            <button 
              className="accept-btn"
              onClick={onAccept}
            >
              <Phone size={24} />
              <span>Accepter</span>
            </button>
            
            <button 
              className="reject-btn"
              onClick={onReject}
            >
              <X size={24} />
              <span>Refuser</span>
            </button>
          </div>
          
          <div className="ringing-animation">
            <div className="ring-ring"></div>
            <div className="ring-ring"></div>
            <div className="ring-ring"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;