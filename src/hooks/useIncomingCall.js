// frontend/src/hooks/useIncomingCall.js
import { useState, useEffect } from 'react';
import socketService from '../services/socketService';
import { useAuth } from '../hooks/useAuth';

export const useIncomingCall = () => {
  const { user } = useAuth();
  const [incomingCallData, setIncomingCallData] = useState(null);

  useEffect(() => {
    const socket = socketService.socket;
    if (!socket || !user) return;

    const handleIncomingCall = (data) => {
      console.log('📞 Appel entrant reçu dans hook:', data);
      
      // Vérifier que l'appel est pour l'utilisateur courant
      const currentUserId = user._id || user.id;
      if (data.recipientId === currentUserId) {
        console.log('✅ Appel destiné à cet utilisateur');
        setIncomingCallData(data);
      } else {
        console.log('❌ Appel pas pour cet utilisateur:', {
          recipientId: data.recipientId,
          currentUserId
        });
      }
    };

    // Écouter l'événement
    socket.on('incoming-video-call', handleIncomingCall);

    // Nettoyer
    return () => {
      socket.off('incoming-video-call', handleIncomingCall);
    };
  }, [user]);

  const acceptCall = () => {
    if (!incomingCallData) return null;
    
    console.log('✅ Acceptation appel:', incomingCallData);
    
    socketService.socket.emit('accept-video-call', {
      channelName: incomingCallData.channelName,
      callerId: incomingCallData.callerId,
      callerSocketId: incomingCallData.callerSocketId,
    });
    
    const channelName = incomingCallData.channelName;
    setIncomingCallData(null);
    return channelName;
  };

  const rejectCall = () => {
    if (!incomingCallData) return;
    
    console.log('❌ Rejet appel:', incomingCallData);
    
    socketService.socket.emit('reject-video-call', {
      channelName: incomingCallData.channelName,
      callerId: incomingCallData.callerId,
      callerSocketId: incomingCallData.callerSocketId,
      reason: 'declined',
    });
    
    setIncomingCallData(null);
  };

  return { incomingCallData, acceptCall, rejectCall };
};