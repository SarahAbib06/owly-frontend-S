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
      // Ne pas cacher la modal ici, laisser VideoCall s'afficher
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

  const startCall = useCallback((conversation) => {
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

    console.log('📞 Démarrage appel vers:', otherParticipant._id);

    // Émettre l'événement d'appel
    socketRef.current.emit('initiate-call', {
      conversationId: conversation._id,
      toUserId: otherParticipant._id,
      callType: 'video',
      fromUserId: user._id,
      fromUsername: user.username
    });

    // Définir l'appel en cours
    setCurrentCall({
      conversation,
      isInitiator: true,
      targetUserId: otherParticipant._id,
      targetUsername: otherParticipant.username
    });
  }, [user]);

  const acceptIncomingCall = useCallback(() => {
    if (!incomingCall || !socketRef.current?.connected) return;

    console.log('✅ Acceptation appel de:', incomingCall.fromUserId);

    // Arrêter le son
    stopRingtone();

    // Répondre à l'appel
    socketRef.current.emit('answer-call', {
      conversationId: incomingCall.conversationId,
      toUserId: incomingCall.fromUserId,
      fromUserId: user?._id
    });

    // Définir l'appel en cours
    setCurrentCall({
      conversation: {
        _id: incomingCall.conversationId,
        participants: [{ _id: incomingCall.fromUserId, username: incomingCall.fromUsername }]
      },
      isInitiator: false,
      targetUserId: incomingCall.fromUserId,
      targetUsername: incomingCall.fromUsername
    });

    // Fermer le modal
    setShowCallModal(false);
    setIncomingCall(null);
  }, [incomingCall, user]);

  const rejectIncomingCall = useCallback(() => {
    if (!incomingCall || !socketRef.current?.connected) return;

    console.log('❌ Refus appel de:', incomingCall.fromUserId);

    // Émettre le refus
    socketRef.current.emit('reject-call', {
      conversationId: incomingCall.conversationId,
      toUserId: incomingCall.fromUserId,
      fromUserId: user?._id
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
        toUserId: currentCall.targetUserId,
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
    socket: socketRef.current
  };

  return (
    <AppelContext.Provider value={value}>
      {children}
    </AppelContext.Provider>
  );
};

export const useAppel = () => useContext(AppelContext);