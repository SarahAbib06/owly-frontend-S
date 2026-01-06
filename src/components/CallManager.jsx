// frontend/src/components/CallManager.jsx
import React from 'react';
import { useAppel } from '../context/AppelContext';
import AudioCallScreen from './AudioCallScreen';
import VideoCallScreen from './VideoCallScreen';
import IncomingCallModal from './IncomingCallModal';

/**
 * CallManager - Composant global qui gère l'affichage des appels
 * Doit être placé au niveau de App.jsx pour être disponible partout
 */
export default function CallManager() {
  const {
    currentCall,
    incomingCall,
    showCallModal,
    callType,
    acceptIncomingCall,
    rejectIncomingCall,
    endCall
  } = useAppel();

  return (
    <>
      {/* Modal pour appel entrant */}
      {showCallModal && incomingCall && (
        <IncomingCallModal
          call={incomingCall}
          onAccept={acceptIncomingCall}
          onReject={rejectIncomingCall}
        />
      )}

      {/* Écran d'appel audio */}
      {currentCall && callType === 'audio' && (
        <AudioCallScreen 
          callData={currentCall}
          onClose={endCall}
        />
      )}

      {/* Écran d'appel vidéo */}
      {currentCall && callType === 'video' && (
        <VideoCallScreen
          callData={currentCall}
          onClose={endCall}
        />
      )}
    </>
  );
}