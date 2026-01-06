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
  const [callType, setCallType] = useState('video'); // 'video' ou 'audio'
  const [callAccepted, setCallAccepted] = useState(false); // indique si l'appel a été accepté par la cible
  const socketRef = React.useRef(null);
  const ringtoneRef = React.useRef(null);
  const currentCallRef = React.useRef(null);

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

    // Appel accepté (notification UI : la cible a accepté l'appel)
    socketRef.current.on('call-answered', (data) => {
      console.log('✅ Appel accepté (notif):', data);
      // Vérifier callId correspond en utilisant la ref à jour
      const activeCall = currentCallRef.current;
      if (activeCall && data.callId && activeCall.callId && data.callId === activeCall.callId) {
        setCallAccepted(true);
      } else if (!activeCall) {
        console.log('⚠️ call-answered reçu mais pas de currentCall actif');
      } else {
        console.log('⚠️ call-answered reçu pour un autre callId', data.callId, activeCall.callId);
      }
    });

    // Appel refusé
    socketRef.current.on('call-rejected', (data) => {
      console.log('❌ Appel refusé:', data);
      // Nettoyage si l'appel rejeté correspond à l'appel courant
      const active = currentCallRef.current;
      if (active && data.callId && active.callId && data.callId === active.callId) {
        console.log('🧹 call-rejected correspond au currentCall actif — nettoyage');
        setCurrentCall(null);
        setCallAccepted(false);
        stopRingtone();
      }
      setShowCallModal(false);
      setIncomingCall(null);
    });

    // Appel annulé
    socketRef.current.on('call-cancelled', (data) => {
      console.log('📴 Appel annulé:', data);
      if (incomingCall?.fromUserId === data.fromUserId) {
        setShowCallModal(false);
        setIncomingCall(null);
        setCallAccepted(false);
        stopRingtone();
      }
    });

    // Raccroché (relay depuis serveur)
    socketRef.current.on('hang-up', (data) => {
      console.log('📴 Hang-up reçu:', data);
      const active = currentCallRef.current;
      if (active && data.callId && active.callId && data.callId === active.callId) {
        console.log('🧹 hang-up correspond au currentCall actif — nettoyage');
        setCurrentCall(null);
        setIncomingCall(null);
        setShowCallModal(false);
        setCallAccepted(false);
        stopRingtone();
      } else if (!data.callId) {
        // Best-effort cleanup si pas de callId fourni
        setCurrentCall(null);
        setIncomingCall(null);
        setShowCallModal(false);
        setCallAccepted(false);
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

  // Garder une ref du currentCall pour que les handlers socket voient la valeur la plus récente
  useEffect(() => {
    currentCallRef.current = currentCall;
  }, [currentCall]);

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

  const startCall = useCallback((conversation, type = 'video') => {
    console.log('🔍 startCall appelé avec:', {
      conversation: conversation?._id,
      type,
      hasParticipants: !!conversation?.participants,
      participantCount: conversation?.participants?.length,
      userID: user?._id
    });

    if (!socketRef.current?.connected || !user) {
      console.error('❌ Socket non connecté ou utilisateur non authentifié');
      return;
    }

    // Trouver l'autre participant
    const otherParticipant = conversation.participants?.find(
      p => {
        console.log('🔍 Checking participant:', { pId: p._id, userId: user._id, match: p._id !== user._id });
        return p._id !== user._id;
      }
    );

    if (!otherParticipant) {
      console.error('❌ Participant introuvable. Participants:', conversation.participants);
      return;
    }

    console.log('✅ Autre participant trouvé:', {
      id: otherParticipant._id,
      username: otherParticipant.username
    });

    console.log('📞 Démarrage appel ' + type + ' vers:', otherParticipant._id);

    // Générer un callId unique et envoyer au backend
    const callId = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    // Envoyer le type d'appel au backend
    socketRef.current.emit('initiate-call', {
      conversationId: conversation._id,
      callType: type,
      callId
    });

    // Définir l'appel en cours
    setCallType(type);
    const callObject = {
      conversation,
      isInitiator: true,
      callId,
      targetUserId: otherParticipant._id,
      targetUsername: otherParticipant.username,
      callType: type
    };
    // Tant que la cible n'a pas accepté, callAccepted reste false
    setCallAccepted(false);
    console.log('📋 Setting currentCall:', callObject);
    setCurrentCall(callObject);
  }, [user]);

  const acceptIncomingCall = useCallback(() => {
    if (!incomingCall || !socketRef.current?.connected) {
      console.log("⛔ acceptIncomingCall bloquée:", { hasIncomingCall: !!incomingCall, socketConnected: socketRef.current?.connected });
      return;
    }

    console.log('✅ Acceptation appel de:', {
      fromUserId: incomingCall.fromUserId,
      fromUsername: incomingCall.fromUsername,
      conversationId: incomingCall.conversationId,
      callType: incomingCall.callType
    });

    // Arrêter le son
    stopRingtone();

    // Définir l'appel en cours
    const callObject = {
      conversation: {
        _id: incomingCall.conversationId,
        participants: [{ _id: incomingCall.fromUserId, username: incomingCall.fromUsername }]
      },
      isInitiator: false,
      targetUserId: incomingCall.fromUserId,
      targetUsername: incomingCall.fromUsername,
      callId: incomingCall.callId,
      callType: incomingCall.callType || 'video'
    };
    console.log('📋 Setting currentCall (incoming) avec isInitiator=false:', callObject);
    setCallType(incomingCall.callType || 'video');
    setCurrentCall(callObject);

    // Ne PAS émettre answer-call ici : on attend que le composant d'appel (Audio/Video)
    // ait préparé son PeerConnection et son stream. L'émission sera faite depuis
    // le composant d'appel une fois prêt (évite la race entre accept et handlers).
    setShowCallModal(false);
    setIncomingCall(null);
  }, [incomingCall, user]);

  const rejectIncomingCall = useCallback(() => {
    if (!incomingCall || !socketRef.current?.connected) return;

    console.log('❌ Refus appel de:', incomingCall.fromUserId);

    // CORRECTION: Envoyer les bons paramètres
    socketRef.current.emit('reject-call', {
      conversationId: incomingCall.conversationId,
      fromUserId: incomingCall.fromUserId,
      callId: incomingCall.callId
    });

    // Arrêter le son et fermer
    stopRingtone();
    setShowCallModal(false);
    setIncomingCall(null);
    setCallAccepted(false);
    // Si un composant d'appel est déjà initialisé, forcer le nettoyage
    setCurrentCall(null);
  }, [incomingCall, user]);

  const endCall = useCallback(() => {
    if (currentCall && socketRef.current?.connected) {
      socketRef.current.emit('hang-up', {
        conversationId: currentCall.conversation?._id,
        toUserId: currentCall.targetUserId,
        callId: currentCall.callId
      });
    }
    
    setCurrentCall(null);
    setIncomingCall(null);
    setShowCallModal(false);
    setCallAccepted(false);
  }, [currentCall, user]);

  const value = {
    currentCall,
    setCurrentCall,
    incomingCall,
    showCallModal,
    callType,
    setCallType,
    callAccepted,
    setCallAccepted,
    startCall,
    acceptIncomingCall,
    rejectIncomingCall,
    endCall,
    socket: socketRef.current,
    stopRingtone
  };

  return (
    <AppelContext.Provider value={value}>
      {children}
    </AppelContext.Provider>
  );
};

export const useAppel = () => useContext(AppelContext);