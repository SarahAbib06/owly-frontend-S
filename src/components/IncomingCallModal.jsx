// frontend/src/components/IncomingCallModal.jsx
import React from 'react';
import { X, Phone } from 'lucide-react';
import socketService from '../services/socketService';
import agoraService from '../services/agoraService';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';

const IncomingCallModal = ({ incomingCallData, onAccept, onReject }) => {
  if (!incomingCallData) return null;

  return (
    <div className="incoming-call-modal">
      <div className="modal-content">
        <div className="caller-avatar">
          {incomingCallData.callerName?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="caller-info">
          <h3>Appel entrant</h3>
          <p>{incomingCallData.callerName} vous appelle</p>
        </div>
        <div className="modal-controls">
          <button className="btn-accept-call" onClick={onAccept}>
            <Phone size={24} /> Accepter
          </button>
          <button className="btn-reject-call" onClick={onReject}>
            <X size={24} /> Refuser
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
