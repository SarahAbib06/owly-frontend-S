import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import socketService from '../services/socketService';

const CallContext = createContext();

export const useCall = () => useContext(CallContext);

export const CallProvider = ({ children }) => {
  const [incomingCall, setIncomingCall] = useState(null);
  const [showIncomingCallModal, setShowIncomingCallModal] = useState(false);
  const [callToAccept, setCallToAccept] = useState(null);

  useEffect(() => {
    const initializeSocket = async () => {
      const token = localStorage.getItem('token');
      if (token && (!socketService.socket || !socketService.socket.connected)) {
        socketService.connect(token);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const socket = socketService.socket;
      if (!socket) return;

      // Écouter les appels entrants
      socket.on('incoming-video-call', (data) => {
        console.log('📞 [CONTEXTE] Appel entrant reçu:', data);
        
        // CRITIQUE : Sauvegarder les données d'appel
        setIncomingCall(data);
        
        // CRITIQUE : Stocker aussi dans localStorage pour récupération
        localStorage.setItem('pendingVideoCall', JSON.stringify({
          ...data,
          receivedAt: Date.now()
        }));
        
        setShowIncomingCallModal(true);
        
        // Jouer une sonnerie
        playRingtone();
      });

      // Écouter l'acceptation d'appel pour le cas où on est déjà dans VideoCallScreen
      socket.on('video-call-accepted', (data) => {
        console.log('✅ [CONTEXTE] Notre appel a été accepté:', data);
        // Ici, on pourrait déclencher l'ouverture de VideoCallScreen
        // si l'utilisateur est sur une autre page
      });

      return () => {
        socket.off('incoming-video-call');
        socket.off('video-call-accepted');
      };
    };

    initializeSocket();
  }, []);

  const playRingtone = () => {
    const audio = new Audio('/sounds/ringtone.mp3');
    audio.loop = true;
    audio.play().catch(e => console.log('Sonnerie non jouée:', e));
  };

  const stopRingtone = () => {
    // Implémentez l'arrêt de la sonnerie si nécessaire
  };

  // FONCTION MODIFIÉE : Doit aussi émettre l'événement socket
  const acceptCall = useCallback(async () => {
    console.log('✅ [CONTEXTE] acceptCall() appelé');
    
    if (!incomingCall) {
      console.error('❌ Aucun appel à accepter');
      return null;
    }
    
    // 1. Arrêter la sonnerie
    stopRingtone();
    
    // 2. Cacher le modal
    setShowIncomingCallModal(false);
    
    // 3. CRITIQUE : Émettre l'événement socket pour informer l'appelant
    if (socketService.socket) {
      socketService.socket.emit('accept-video-call', {
        channelName: incomingCall.channelName,
        callerId: incomingCall.callerId,
        callerSocketId: incomingCall.callerSocketId,
        recipientId: localStorage.getItem('userId') || 'unknown',
        recipientName: localStorage.getItem('username') || 'Utilisateur',
        chatId: incomingCall.chatId
      });
    }
    
    // 4. CRITIQUE : Sauvegarder pour redirection
    setCallToAccept(incomingCall);
    
    // 5. CRITIQUE : Stocker dans un état global accessible
    window.pendingVideoCall = incomingCall;
    
    console.log('📤 [CONTEXTE] Acceptation envoyée, données:', incomingCall);
    
    // 6. Retourner les données pour le composant qui va gérer l'appel
    return incomingCall;
  }, [incomingCall]);

  const rejectCall = useCallback(() => {
    console.log('❌ [CONTEXTE] rejectCall() appelé');
    
    if (incomingCall && socketService.socket) {
      socketService.socket.emit('reject-video-call', {
        channelName: incomingCall.channelName,
        callerId: incomingCall.callerId,
        callerSocketId: incomingCall.callerSocketId,
        reason: 'declined'
      });
    }
    
    // Nettoyer le localStorage
    localStorage.removeItem('pendingVideoCall');
    
    setShowIncomingCallModal(false);
    setIncomingCall(null);
    setCallToAccept(null);
    stopRingtone();
  }, [incomingCall]);

  // Fonction pour récupérer l'appel en attente
  const getPendingCall = useCallback(() => {
    return callToAccept || JSON.parse(localStorage.getItem('pendingVideoCall') || 'null');
  }, [callToAccept]);

  // Fonction pour nettoyer après acceptation
  const clearPendingCall = useCallback(() => {
    setCallToAccept(null);
    localStorage.removeItem('pendingVideoCall');
    window.pendingVideoCall = null;
  }, []);

  return (
    <CallContext.Provider value={{
      incomingCall,
      showIncomingCallModal,
      callToAccept,
      acceptCall,
      rejectCall,
      getPendingCall,
      clearPendingCall,
      setShowIncomingCallModal
    }}>
      {children}
    </CallContext.Provider>
  );
};