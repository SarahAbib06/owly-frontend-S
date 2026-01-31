// src/context/AppelContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import socketService from '../services/socketService';

const AppelContext = createContext({});

export const AppelProvider = ({ children }) => {
  const { user } = useAuth();
  const [currentCall, setCurrentCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [callType, setCallType] = useState('video'); // 'video' ou 'audio'
  const [callAccepted, setCallAccepted] = useState(false); // indique si l'appel a été accepté par la cible
  const [callState, setCallState] = useState('idle'); // idle, initiating, ringing, connecting, connected, ended
  const socketRef = React.useRef(null);
  const ringtoneRef = React.useRef(null);
  const currentCallRef = React.useRef(null);
  const callAcceptedRef = React.useRef(false);

  // Utiliser la connexion socket globale depuis socketService
  useEffect(() => {
    if (!user) return;

    const socket = socketService.socket;
    if (!socket) {
      console.warn('⚠️ AppelContext: socketService.socket non disponible');
      return;
    }

    socketRef.current = socket;
    console.log('✅ AppelContext utilise socketService.socket:', socket.id);
    console.log('🔌 [AppelContext] Installation des listeners socket à:', new Date().toISOString());

    // Écouter les appels entrants
    const handleIncomingCall = (data) => {
      const timestamp = new Date().toISOString();
      console.log('📞 [AppelContext] Appel entrant reçu à', timestamp, ':', data);

      // Validation des données
      if (!data || !data.callId || !data.fromUserId) {
        console.error('❌ Données d\'appel invalides:', data);
        return;
      }

      // Jouer la sonnerie IMMÉDIATEMENT (avant setState)
      console.log('🎵 Déclenchement sonnerie immédiat');
      playRingtone();

      // Mettre à jour les états
      console.log('→ setIncomingCall:', data);
      setIncomingCall(data);

      console.log('→ setShowCallModal: true');
      setShowCallModal(true);

      console.log('→ setCallState: ringing');
      setCallState('ringing');

      // Log de confirmation après 100ms
      setTimeout(() => {
        console.log('📊 [AppelContext] États après incoming-call:', {
          hasIncomingCall: !!data,
          showCallModal: true,
          callState: 'ringing',
          timestamp
        });
      }, 100);
    };

    // Appel accepté (notification UI : la cible a accepté l'appel)
    const handleCallAnswered = (data) => {
      console.log('✅ [AppelContext] call-answered reçu:', data);
      setCallState('connecting');

      // Vérifier callId correspond en utilisant la ref à jour
      const activeCall = currentCallRef.current;
      if (activeCall && data.callId && activeCall.callId && data.callId === activeCall.callId) {
        setCallAccepted(true);
      } else if (!activeCall) {
        console.log('⚠️ call-answered reçu mais pas de currentCall actif');
      } else {
        console.log('⚠️ call-answered reçu pour un autre callId', data.callId, activeCall.callId);
      }
    };

    // Destinataire prêt pour WebRTC (NOUVEAU ÉVÉNEMENT)
    const handleCallReady = (data) => {
      console.log('🔔 [AppelContext] call-ready reçu:', data);
      setCallState('connecting');

      const activeCall = currentCallRef.current;
      if (activeCall && data.callId === activeCall.callId) {
        // L'appelant peut maintenant envoyer l'OFFER
        // Cet événement sera capturé par VideoCall.jsx
        console.log('✅ call-ready reçu pour l\'appel en cours');
      } else {
        console.log('⚠️ call-ready: pas de currentCall actif ou callId ne correspond pas', { dataCallId: data.callId, activeCallId: activeCall?.callId });
      }
    };

    // Appel refusé
    const handleCallRejected = (data) => {
      console.log('❌ [AppelContext] call-rejected reçu:', data);
      const active = currentCallRef.current;
      if (active && data.callId && active.callId && data.callId === active.callId) {
        // 🆕 CRÉER UN MESSAGE D'APPEL MANQUÉ SI C'EST L'INITIATEUR
        if (active.isInitiator && !callAcceptedRef.current && socketRef.current?.connected) {
          socketRef.current.emit('call-missed', {
            conversationId: active.conversation?._id,
            callType: active.callType
          });
        }
        setCurrentCall(null);
        setCallAccepted(false);
        setCallState('ended');
        stopRingtone();
      }
      setShowCallModal(false);
      setIncomingCall(null);
    };

    // Appel annulé
    const handleCallCancelled = (data) => {
      console.log('📴 [AppelContext] call-cancelled reçu:', data);
      if (incomingCall?.fromUserId === data.fromUserId) {
        setShowCallModal(false);
        setIncomingCall(null);
        setCallAccepted(false);
        setCallState('ended');
        stopRingtone();
      }
    };

    // Raccroché (relay depuis serveur)
    const handleHangUp = (data) => {
      console.log('📴 [AppelContext] hang-up reçu:', data);
      const active = currentCallRef.current;
      if (active && data.callId && active.callId && data.callId === active.callId) {
        console.log('🧹 hang-up correspond au currentCall actif — nettoyage');
        setCurrentCall(null);
        setIncomingCall(null);
        setShowCallModal(false);
        setCallAccepted(false);
        setCallState('ended');
        stopRingtone();
      } else if (!data.callId) {
        // Best-effort cleanup si pas de callId fourni
        setCurrentCall(null);
        setIncomingCall(null);
        setShowCallModal(false);
        setCallAccepted(false);
        setCallState('ended');
        stopRingtone();
      }
    };

    // Gestion des erreurs
    const handleConnectError = (error) => {
      console.error('❌ [AppelContext] Erreur connexion socket:', error);
    };

    // Installation des listeners
    socketRef.current.on('incoming-call', handleIncomingCall);
    socketRef.current.on('call-answered', handleCallAnswered);
    socketRef.current.on('call-ready', handleCallReady);
    socketRef.current.on('call-rejected', handleCallRejected);
    socketRef.current.on('call-cancelled', handleCallCancelled);
    socketRef.current.on('hang-up', handleHangUp);
    socketRef.current.on('connect_error', handleConnectError);

    console.log('✅ [AppelContext] Tous les listeners installés:', {
      'incoming-call': true,
      'call-answered': true,
      'call-ready': true,
      'call-rejected': true,
      'call-cancelled': true,
      'hang-up': true,
      'connect_error': true
    });

    return () => {
      // Ne pas déconnecter socketService.socket car il est partagé
      // Juste retirer les event listeners
      if (socketRef.current) {
        console.log('🧹 [AppelContext] Nettoyage des listeners socket');
        socketRef.current.off('incoming-call', handleIncomingCall);
        socketRef.current.off('call-answered', handleCallAnswered);
        socketRef.current.off('call-ready', handleCallReady);
        socketRef.current.off('call-rejected', handleCallRejected);
        socketRef.current.off('call-cancelled', handleCallCancelled);
        socketRef.current.off('hang-up', handleHangUp);
        socketRef.current.off('connect_error', handleConnectError);
        socketRef.current = null;
      }
      stopRingtone();
    };
  }, [user]);

  // Garder une ref du currentCall pour que les handlers socket voient la valeur la plus récente
  useEffect(() => {
    currentCallRef.current = currentCall;
  }, [currentCall]);

  // 🆕 Garder une ref de callAccepted pour vérifier si l'appel a été accepté
  useEffect(() => {
    callAcceptedRef.current = callAccepted;
  }, [callAccepted]);

  const playRingtone = () => {
    // Arrêter l'ancien son si existant
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }

    try {
      console.log('🎵 [AppelContext] Tentative de lecture sonnerie...');
      const audio = new Audio('/sounds/ringtone.mp3');
      audio.loop = true;
      audio.volume = 0.7; // Volume à 70%
      ringtoneRef.current = audio;

      // Tentative de lecture avec gestion promesse
      const playPromise = audio.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('✅ [AppelContext] Sonnerie en cours de lecture');
          })
          .catch(error => {
            console.error('❌ [AppelContext] Échec lecture sonnerie:', error.name, error.message);
            if (error.name === 'NotAllowedError') {
              console.warn('⚠️ Autoplay bloqué par le navigateur. Interaction utilisateur requise.');
            } else if (error.name === 'NotSupportedError') {
              console.error('❌ Format audio non supporté');
            }
          });
      }
    } catch (e) {
      console.error('❌ [AppelContext] Impossible de créer l\'audio:', e);
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
    const callId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // Envoyer le type d'appel au backend
    socketRef.current.emit('initiate-call', {
      conversationId: conversation._id,
      callType: type,
      callId
    });

    // Définir l'appel en cours
    setCallType(type);
    setCallState('initiating');

    const callObject = {
      conversation,
      isInitiator: true,
      callId,
      targetUserId: otherParticipant._id,
      targetUsername: otherParticipant.username,
      targetAvatar: otherParticipant.profilePicture, // 🆕 Utiliser profilePicture (Cloudinary)
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
      targetAvatar: incomingCall.fromAvatar, // 🆕 Ajouter l'avatar de l'appelant
      callId: incomingCall.callId,
      callType: incomingCall.callType || 'video'
    };

    console.log('📋 Setting currentCall (incoming) avec isInitiator=false:', callObject);
    setCallType(incomingCall.callType || 'video');
    setCallState('connecting');
    setCurrentCall(callObject);
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
    setCallState('ended');
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
    setCallState('ended');
    stopRingtone();
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
    callState,
    setCallState,
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