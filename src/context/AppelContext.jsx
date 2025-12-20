// src/context/AppelContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import io from 'socket.io-client';

const AppelContext = createContext({});

const SIGNALING_SERVER = "http://localhost:5000";

export const AppelProvider = ({ children }) => {
  const { user } = useAuth();
  const [currentCall, setCurrentCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const socketRef = React.useRef(null);
  const ringtoneRef = React.useRef(null);

  // Initialiser la connexion socket globale
  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('token') || user?.token;
    if (!token) return;

    console.log('Initialisation socket d\'appel global...');
    
    socketRef.current = io(SIGNALING_SERVER, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Socket d\'appel global connecté:', socketRef.current.id);
    });

    // Écouter les appels entrants
    socketRef.current.on('incoming-call', (data) => {
      console.log('📞 Appel entrant reçu:', data);
      setIncomingCall(data);
      setShowCallModal(true);
      
      // Jouer le son d'appel
      playRingtone();
    });

    // Appel accepté
    socketRef.current.on('call-answered', (data) => {
      console.log('✅ Appel accepté:', data);
    });

    // Appel refusé
    socketRef.current.on('call-rejected', (data) => {
      console.log('❌ Appel refusé:', data);
      setShowCallModal(false);
      setIncomingCall(null);
      stopRingtone();
    });

    // Appel annulé
    socketRef.current.on('call-cancelled', (data) => {
      console.log('📴 Appel annulé:', data);
      if (incomingCall?.fromUserId === data.fromUserId) {
        setShowCallModal(false);
        setIncomingCall(null);
        stopRingtone();
      }
    });

    // Événements WebRTC (à transmettre au VideoCall)
    socketRef.current.on('offer', (data) => {
      console.log('📞 OFFER reçue via contexte:', data);
    });

    socketRef.current.on('answer', (data) => {
      console.log('📥 ANSWER reçue via contexte:', data);
    });

    socketRef.current.on('ice-candidate', (data) => {
      console.log('🧊 ICE candidate reçu via contexte:', data);
    });

    // Gestion des erreurs
    socketRef.current.on('connect_error', (error) => {
      console.error('❌ Erreur connexion socket:', error);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      stopRingtone();
    };
  }, [user]);

  const playRingtone = () => {
    try {
      ringtoneRef.current = new Audio('/sounds/ringtone.mp3');
      ringtoneRef.current.loop = true;
      ringtoneRef.current.play().catch(e => console.log('Son d\'appel ignoré'));
    } catch (e) {
      console.log('Impossible de jouer le son d\'appel');
    }
  };

  const stopRingtone = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
      ringtoneRef.current = null;
    }
  };

  const startCall = useCallback((conversation, callType = 'video') => {
    if (!socketRef.current?.connected || !user) {
      console.error('Socket non connecté ou utilisateur non authentifié');
      return;
    }

    // Trouver l'autre participant
    const otherParticipant = conversation.participants?.find(
      p => p._id !== user._id
    );

    if (!otherParticipant) {
      console.error('Participant introuvable');
      return;
    }

    console.log('📞 Démarrage appel vers:', otherParticipant._id, 'type:', callType);

    // Envoyer les paramètres
    socketRef.current.emit('initiate-call', {
      conversationId: conversation._id,
      callType: callType
    });

    // Définir l'appel en cours
    setCurrentCall({
      conversation,
      isInitiator: true,
      targetUserId: otherParticipant._id,
      targetUsername: otherParticipant.username,
      callType: callType
    });
  }, [user]);

  const acceptIncomingCall = useCallback(() => {
    if (!incomingCall || !socketRef.current?.connected) return;

    console.log('✅ Acceptation appel de:', incomingCall.fromUserId);

    // Arrêter le son
    stopRingtone();

    // Envoyer les bons paramètres
    socketRef.current.emit('answer-call', {
      conversationId: incomingCall.conversationId,
      fromUserId: incomingCall.fromUserId
    });

    // Définir l'appel en cours
    setCurrentCall({
      conversation: {
        _id: incomingCall.conversationId,
        participants: [{ _id: incomingCall.fromUserId, username: incomingCall.fromUsername }]
      },
      isInitiator: false,
      targetUserId: incomingCall.fromUserId,
      targetUsername: incomingCall.fromUsername,
      callType: incomingCall.callType || 'video'
    });

    // Fermer le modal
    setShowCallModal(false);
    setIncomingCall(null);
  }, [incomingCall, user]);

  const rejectIncomingCall = useCallback(() => {
    if (!incomingCall || !socketRef.current?.connected) return;

    console.log('❌ Refus appel de:', incomingCall.fromUserId);

    socketRef.current.emit('reject-call', {
      conversationId: incomingCall.conversationId,
      fromUserId: incomingCall.fromUserId
    });

    // Arrêter le son et fermer
    stopRingtone();
    setShowCallModal(false);
    setIncomingCall(null);
  }, [incomingCall, user]);

  const endCall = useCallback(() => {
    if (currentCall && socketRef.current?.connected) {
      socketRef.current.emit('hang-up', {
        conversationId: currentCall.conversation?._id,
        fromUserId: user?._id
      });
    }
    
    setCurrentCall(null);
    setIncomingCall(null);
    setShowCallModal(false);
  }, [currentCall, user]);

  const value = {
    currentCall,
    incomingCall,
    showCallModal,
    startCall,
    acceptIncomingCall,
    rejectIncomingCall,
    endCall,
    socket: socketRef.current,
    callType: currentCall?.callType || incomingCall?.callType
  };

  return (
    <AppelContext.Provider value={value}>
      {children}
    </AppelContext.Provider>
  );
};

export const useAppel = () => useContext(AppelContext);