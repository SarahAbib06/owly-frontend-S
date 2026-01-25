// frontend/src/components/GlobalIncomingCall.jsx
import React, { useState } from 'react';
import IncomingCallModal from './IncomingCallModal';
import { useIncomingCall } from '../hooks/useIncomingCall';
import VideoCallScreen from './VideoCallScreen';

const GlobalIncomingCall = () => {
  const { incomingCallData, acceptCall, rejectCall } = useIncomingCall();
  const [activeCall, setActiveCall] = useState(null);

  const handleAccept = () => {
    const channelName = acceptCall();
    if (channelName) {
      // Simuler un chat pour l'appel
      const callChat = {
        _id: incomingCallData.chatId || 'call-' + Date.now(),
        participants: [
          {
            _id: incomingCallData.callerId,
            username: incomingCallData.callerName
          }
        ]
      };
      
      setActiveCall({
        channelName,
        incomingCallData,
        callChat
      });
    }
  };

  const handleReject = () => {
    rejectCall();
  };

  const handleCloseCall = () => {
    setActiveCall(null);
  };

  return (
    <>
      {/* Modal d'appel entrant (s'affiche partout) */}
      {incomingCallData && !activeCall && (
        <IncomingCallModal
          incomingCallData={incomingCallData}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      )}

      {/* Écran d'appel si accepté */}
      {activeCall && (
        <VideoCallScreen
          selectedChat={activeCall.callChat}
          channelName={activeCall.channelName}
          onClose={handleCloseCall}
        />
      )}
    </>
  );
};

export default GlobalIncomingCall;