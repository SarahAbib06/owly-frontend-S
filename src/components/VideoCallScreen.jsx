import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, Video, VideoOff, Phone, Settings, Monitor } from 'lucide-react';
import agoraService from '../services/agoraService';
import socketService from '../services/socketService';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { useCall } from '../context/CallContext';
import './VideoCallScreen.css';

const VideoCallScreen = ({ selectedChat, onClose, incomingCallData: propIncomingCallData }) => {
  const { user } = useAuth();
  const { incomingCall, acceptCall, rejectCall, setShowIncomingCallModal } = useCall();
  
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenSharers, setScreenSharers] = useState([]);
  const [screenShareTrack, setScreenShareTrack] = useState(null);
  const [screenShareStreams, setScreenShareStreams] = useState([]);
  const [callDuration, setCallDuration] = useState(0);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [isCalling, setIsCalling] = useState(false);
  const [callStatus, setCallStatus] = useState('idle'); // idle, calling, ringing, in-call, ended
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');
  const [localVideoUpdateTrigger, setLocalVideoUpdateTrigger] = useState(0);
  const [currentLocalTrack, setCurrentLocalTrack] = useState(null);

  // Sync prop incomingCallData to state
  useEffect(() => {
    if (propIncomingCallData) {
      setIncomingCallData(propIncomingCallData);
    }
  }, [propIncomingCallData]);

  // Automatically accept incoming call if incomingCallData is provided
  useEffect(() => {
    if (incomingCallData && !isCallActive && !isCalling) {
      console.log('📞 [VideoCallScreen] Appel entrant détecté via prop, acceptation automatique');

      // Attendre que le socket soit prêt avant d'accepter
      const acceptWithDelay = async () => {
        // Vérifier la connexion socket
        if (!socketService.socket?.connected) {
          console.log('🔄 Socket non connecté, tentative de reconnexion...');
          const token = localStorage.getItem('token');
          if (token) {
            socketService.connect(token);
            // Attendre la connexion
            await new Promise(resolve => {
              const checkConnection = () => {
                if (socketService.socket?.connected) {
                  resolve();
                } else {
                  setTimeout(checkConnection, 100);
                }
              };
              checkConnection();
            });
          }
        }

        // Petit délai supplémentaire pour s'assurer que tout est prêt
        setTimeout(() => {
          console.log('✅ Socket prêt, acceptation automatique de l\'appel');
          acceptIncomingCall();
        }, 500);
      };

      acceptWithDelay();
    }
  }, [incomingCallData, isCallActive, isCalling]);

  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef({});
  const callTimerRef = useRef(null);
  const channelNameRef = useRef(`call_${selectedChat?._id}_${Date.now()}`);
  const ringtoneAudioRef = useRef(null);
  const callTimeoutRef = useRef(null);

  // Gérer l'appel entrant depuis le contexte global
  useEffect(() => {
    // Only handle incoming calls if we're not already in an active call
    // Check if we're already connected to Agora (indicates ongoing call)
    const isAlreadyInCall = agoraService.remoteUsers.size > 0 || agoraService.localVideoTrack || agoraService.localAudioTrack;

    if (incomingCall && selectedChat?._id === incomingCall.chatId && !isCallActive && !isCalling && !isAlreadyInCall) {
      console.log('📞 [VideoCallScreen] Appel entrant correspond au chat ouvert - affichage du modal:', incomingCall);

      // Afficher le modal pour permettre à l'utilisateur d'accepter ou refuser manuellement
      setIncomingCallData(incomingCall);
      setShowIncomingCallModal(true);
      playRingtone();
    }
  }, [incomingCall, selectedChat, isCallActive, isCalling]);

  // Initialiser Agora et écouter les événements
  useEffect(() => {
    agoraService.initializeClient();
    
    // Configuration des callbacks pour les vidéos distantes
    agoraService.onScreenShareEnded = (userId) => {
      console.log('🖥️ Callback: Partage d\'écran arrêté depuis bannière externe pour user:', userId);
      // Si c'est l'utilisateur local qui arrête le partage depuis la bannière
      if (userId === user._id || userId === user.id) {
        setIsScreenSharing(false);
        setScreenShareTrack(null);
        // Restaurer la caméra dans la PIP si elle était active
        if (agoraService.localVideoTrack && !isVideoOff) {
          setCurrentLocalTrack(agoraService.localVideoTrack);
        } else {
          setCurrentLocalTrack(null);
        }
        setDebugInfo('Partage d\'écran arrêté depuis la bannière');
      }
    };

    agoraService.onRemoteVideoAdded = (uid, videoTrack) => {
      console.log(`📹 [CALLBACK] Vidéo distante ajoutée: ${uid}`);

      // Ignore our own video tracks (including screen share)
      if (uid === agoraService.uid) {
        console.log(`📹 [CALLBACK] Ignorer notre propre vidéo ${uid}`);
        return;
      }

      setDebugInfo(`Vidéo distante ${uid} reçue`);

      // Mettre à jour les streams
      setRemoteStreams(prev => {
        const exists = prev.find(s => s.uid === uid);
        if (exists) {
          return prev.map(s =>
            s.uid === uid ? { ...s, hasVideo: true, videoTrack } : s
          );
        }
        return [...prev, { uid, hasVideo: true, hasAudio: true, videoTrack }];
      });

      // Jouer la vidéo dans l'élément correspondant
      setTimeout(() => {
        const videoElement = remoteVideoRefs.current[uid];
        if (videoElement && videoTrack) {
          try {
            videoTrack.play(videoElement);
            console.log(`✅ [CALLBACK] Vidéo ${uid} jouée avec succès`);
            setDebugInfo(`Vidéo ${uid} en cours de lecture`);
          } catch (error) {
            console.error(`❌ [CALLBACK] Erreur play vidéo ${uid}:`, error);
          }
        } else {
          console.warn(`⚠️ [CALLBACK] Élément DOM manquant pour uid: ${uid}`);
        }
      }, 100);
    };
    
    agoraService.onRemoteVideoRemoved = (uid) => {
      console.log(`📹 [CALLBACK] Vidéo distante retirée: ${uid}`);
      setRemoteStreams(prev => prev.filter(s => s.uid !== uid));
    };
    
    const socket = socketService.socket;
    if (!socket) {
      console.warn('⚠️ Socket non disponible');
      return;
    }



    socket.on('video-call-accepted', (data) => {
      console.log('✅ Appel accepté:', data);
      setDebugInfo('Appel accepté par le destinataire');

      // Annuler le timeout car l'appel a été répondu
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }

      // Vérifier le channel name
      const targetChannel = data.channelName || (incomingCallData && incomingCallData.channelName) || channelNameRef.current;
      fetchTokenAndStartCall(targetChannel);
    });

    socket.on('video-call-rejected', (data) => {
      console.log('❌ Appel refusé:', data);
      setCallStatus('rejected');
      setDebugInfo('Appel refusé');

      // Annuler le timeout car l'appel a été refusé
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }

      alert(`L'appel a été refusé: ${data.reason || 'Par l\'utilisateur'}`);
      setIsCalling(false);
      stopRingtone();
    });

    socket.on('video-call-ended', (data) => {
      console.log('📞 Appel terminé:', data);
      const targetChannel = data.channelName || (incomingCallData && incomingCallData.channelName) || channelNameRef.current;
      if (data.channelName === targetChannel) {
        handleEndCall();
      }
    });

    socket.on('call-initiated', (data) => {
      console.log('📞 Appel initié avec succès:', data);
      setCallStatus('calling');
      setDebugInfo('Appel initié, en attente de réponse...');
    });

    socket.on('call-error', (data) => {
      console.error('💥 Erreur appel:', data);
      setDebugInfo(`Erreur: ${data.error}`);
      
      // Gestion spécifique pour CALLER_OFFLINE
      if (data.code === 'CALLER_OFFLINE') {
        console.log('⚠️ L\'appelant semble déconnecté, tentative de reconnexion...');
        // Réessayer automatiquement
        setTimeout(() => {
          if (incomingCallData) {
            console.log('🔄 Réessai d\'acceptation de l\'appel...');
            acceptIncomingCall();
          } else if (isCalling) {
            console.log('🔄 Réessai de démarrage d\'appel...');
            startOutgoingCall();
          }
        }, 2000);
        alert('Problème de connexion avec l\'appelant. Nouvelle tentative...');
      } else {
        alert(`Erreur: ${data.error}`);
      }
      
      setIsCalling(false);
      setCallStatus('idle');
      stopRingtone();
    });

    // Écouter l'événement de reconnexion socket
    socket.on('connect', () => {
      console.log('✅ Socket reconnecté');
      setDebugInfo('Connexion rétablie');
    });

    // Écouter les événements de partage d'écran
    socket.on('screen-share-started', (data) => {
      console.log('🖥️ DEBUG - Événement screen-share-started reçu:', data);
      console.log('🖥️ Partage d\'écran démarré par:', data);
      console.log('🖥️ DEBUG - user._id:', user._id, 'user.id:', user.id, 'data.userId:', data.userId);
      console.log('🖥️ DEBUG - screenSharers avant:', screenSharers);

      if (data.userId !== user._id && data.userId !== user.id) {
        // Only add remote sharers to the list
        setScreenSharers(prev => {
          const newList = !prev.includes(data.userId) ? [...prev, data.userId] : prev;
          console.log('🖥️ DEBUG - screenSharers après ajout:', newList);
          return newList;
        });
        // Assuming screen share track is available in agoraService
        const screenTrack = agoraService.getScreenShareTrack(data.userId);
        if (screenTrack) {
          setScreenShareStreams(prev => {
            const exists = prev.find(s => s.userId === data.userId);
            if (!exists) {
              return [...prev, { userId: data.userId, screenTrack }];
            }
            return prev;
          });
        }
        setDebugInfo(`${data.userId} partage son écran`);
      } else {
        console.log('🖥️ DEBUG - C\'est l\'utilisateur local qui partage');
        setDebugInfo('Vous partagez votre écran');
      }
    });

    socket.on('screen-share-stopped', (data) => {
      console.log('🖥️ DEBUG - Événement screen-share-stopped reçu:', data);
      console.log('🖥️ Partage d\'écran arrêté par:', data);
      console.log('🖥️ DEBUG - user._id:', user._id, 'user.id:', user.id, 'data.userId:', data.userId);
      console.log('🖥️ DEBUG - screenSharers avant suppression:', screenSharers);

      setScreenSharers(prev => {
        const newList = prev.filter(id => id !== data.userId);
        console.log('🖥️ DEBUG - screenSharers après suppression:', newList);
        return newList;
      });
      setScreenShareStreams(prev => prev.filter(s => s.userId !== data.userId));

      // Si c'est l'utilisateur local qui arrête le partage (depuis la bannière Google), mettre à jour l'état local
      if (data.userId === user._id || data.userId === user.id) {
        setIsScreenSharing(false);
        setScreenShareTrack(null);
        // Restaurer la caméra dans la PIP si elle était active
        if (agoraService.localVideoTrack && !isVideoOff) {
          setCurrentLocalTrack(agoraService.localVideoTrack);
        } else {
          setCurrentLocalTrack(null);
        }
        setDebugInfo('Vous avez arrêté le partage d\'écran');
      } else {
        setDebugInfo('Partage d\'écran terminé');
      }
    });

    return () => {
      // Nettoyer les callbacks
      agoraService.onRemoteVideoAdded = null;
      agoraService.onRemoteVideoRemoved = null;
      
      if (socket) {
        socket.off('incoming-video-call');
        socket.off('video-call-accepted');
        socket.off('video-call-rejected');
        socket.off('video-call-ended');
        socket.off('call-initiated');
        socket.off('call-error');
        socket.off('connect');
        socket.off('screen-share-started');
        socket.off('screen-share-stopped');
      }
      clearInterval(callTimerRef.current);
      stopRingtone();
    };
  }, [selectedChat]);

  // Mettre à jour la vidéo locale (caméra ou partage d'écran dans le PIP)
  useEffect(() => {
    const playLocalVideo = async () => {
      if (localVideoRef.current && currentLocalTrack) {
        console.log('🎬 Lecture track locale dans PIP:', currentLocalTrack);

        try {
          // Arrêter toute vidéo en cours
          if (localVideoRef.current.srcObject) {
            localVideoRef.current.srcObject = null;
          }

          await currentLocalTrack.play(localVideoRef.current);
          setDebugInfo('Vidéo locale active');
          console.log('✅ Vidéo locale jouée avec succès');
        } catch (error) {
          console.error('Erreur play vidéo locale:', error);
          setDebugInfo('Erreur vidéo locale');
        }
      } else if (localVideoRef.current && !currentLocalTrack) {
        console.log('📹 Aucune vidéo locale à afficher');
        setDebugInfo('Aucune vidéo locale');
      }
    };

    // Délai court pour s'assurer que l'élément DOM est prêt
    setTimeout(playLocalVideo, 100);
  }, [currentLocalTrack]);

  // Forcer la lecture des vidéos distantes quand les éléments DOM sont prêts
  useEffect(() => {
    const playAllRemoteVideos = () => {
      console.log('🔄 Tentative de lecture de toutes les vidéos distantes');
      
      remoteStreams.forEach(stream => {
        const videoElement = remoteVideoRefs.current[stream.uid];
        if (videoElement && stream.videoTrack) {
          try {
            stream.videoTrack.play(videoElement);
            console.log(`✅ Vidéo ${stream.uid} rejouée`);
          } catch (error) {
            console.error(`❌ Erreur re-play vidéo ${stream.uid}:`, error);
          }
        } else if (videoElement) {
          // Essayer de récupérer la track depuis agoraService
          const userData = agoraService.remoteUsers.get(stream.uid);
          if (userData?.videoTrack) {
            try {
              userData.videoTrack.play(videoElement);
              console.log(`✅ Vidéo ${stream.uid} récupérée et jouée`);
            } catch (error) {
              console.error(`❌ Erreur play depuis agoraService:`, error);
            }
          }
        }
      });
    };

    if (isCallActive && remoteStreams.length > 0) {
      // Jouer après un court délai pour laisser le DOM se mettre à jour
      const timer = setTimeout(playAllRemoteVideos, 300);
      return () => clearTimeout(timer);
    }
  }, [isCallActive, remoteStreams]);

  // Initialisation socket
  useEffect(() => {
    const testSocket = async () => {
      const token = localStorage.getItem('token');
      if (token && (!socketService.socket || !socketService.socket.connected)) {
        console.log('🔄 Tentative de connexion socket...');
        socketService.connect(token);
        // Petit délai pour laisser la connexion s'établir
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    };

    testSocket();
  }, []);

  // Marquer que l'utilisateur est dans VideoCallScreen
  useEffect(() => {
    console.log('📞 [VideoCallScreen] Montage - utilisateur dans VideoCallScreen');
    localStorage.setItem('inVideoCallScreen', 'true');

    return () => {
      console.log('📞 [VideoCallScreen] Démontage - utilisateur quitte VideoCallScreen');
      localStorage.removeItem('inVideoCallScreen');
    };
  }, []);

  // Démarrer un appel sortant
  const startOutgoingCall = async () => {
    console.log('🔍 === DÉBUT startOutgoingCall ===');
    setDebugInfo('Démarrage appel sortant...');
    
    if (!selectedChat?.participants || selectedChat.participants.length < 2) {
      alert('Conversation invalide');
      return;
    }
    
    const currentUserId = user._id || user.id;
    
    const otherParticipant = selectedChat.participants.find(
      participant => (participant._id || participant.id) !== currentUserId
    );
    
    if (!otherParticipant) {
      alert('Aucun autre participant trouvé dans la conversation');
      return;
    }
    
    console.log('🎯 Appel à:', {
      currentUser: currentUserId,
      otherUser: otherParticipant._id || otherParticipant.id,
      otherUsername: otherParticipant.username
    });
    
    setIsCalling(true);
    setCallStatus('calling');
    
    const channelName = `call_${selectedChat._id}_${Date.now()}`;
    channelNameRef.current = channelName;
    
    try {
      // Vérifier la connexion socket
      if (!socketService.socket?.connected) {
        const token = localStorage.getItem('token');
        if (token) {
          socketService.connect(token);
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      console.log('✅ Socket prêt, émission événement...');
      
      const callData = {
        chatId: selectedChat._id,
        channelName: channelName,
        callerId: currentUserId,
        callerName: user.username || 'Utilisateur',
        recipientId: otherParticipant._id || otherParticipant.id,
        recipientName: otherParticipant.username || 'Utilisateur',
        timestamp: Date.now(),
        type: 'video',
        callerSocketId: socketService.socket.id
      };
      
      socketService.socket.emit('initiate-video-call', callData);
      setDebugInfo('Appel émis, en attente...');
      
      console.log('📤 Événement envoyé:', callData);
      
      // Timeout pour réponse
      callTimeoutRef.current = setTimeout(() => {
        if (callStatus === 'calling') {
          console.log('⏰ Timeout: Appel non répondu');
          setDebugInfo('Appel non répondu (timeout)');
          
          setIsCalling(false);
          setCallStatus('ended');
        }
      }, 30000);
      
    } catch (error) {
      console.error('💥 Erreur connexion socket:', error);
      setDebugInfo(`Erreur socket: ${error.message}`);
      alert(`Erreur de connexion: ${error.message}`);
      setIsCalling(false);
      setCallStatus('idle');
    }
    
    console.log('🔚 === FIN startOutgoingCall ===');
  };

  // Accepter un appel entrant
  const acceptIncomingCall = async () => {
    if (!incomingCallData) return;
    
    try {
      setCallStatus('connecting');
      setDebugInfo('Acceptation appel en cours...');
      
      // Fermer le modal global s'il est ouvert
      setShowIncomingCallModal(false);
      
      console.log('📤 Acceptation appel, données:', {
        channelName: incomingCallData.channelName,
        callerId: incomingCallData.callerId,
        callerSocketId: incomingCallData.callerSocketId,
        recipientId: user._id || user.id
      });
      
      // Émettre l'événement d'acceptation
      socketService.socket.emit('accept-video-call', {
        channelName: incomingCallData.channelName,
        callerId: incomingCallData.callerId,
        callerSocketId: incomingCallData.callerSocketId,
        recipientId: user._id || user.id,
        recipientName: user.username || 'Utilisateur',
        chatId: incomingCallData.chatId
      });
      
      channelNameRef.current = incomingCallData.channelName;
      
      // Démarrer immédiatement l'appel Agora
      await fetchTokenAndStartCall(incomingCallData.channelName);
      
      setIncomingCallData(null);
      stopRingtone();
      
    } catch (error) {
      console.error('Erreur acceptation appel:', error);
      setDebugInfo(`Erreur acceptation: ${error.message}`);
      setCallStatus('idle');
      stopRingtone();
    }
  };

  // Refuser un appel entrant
  const rejectIncomingCall = () => {
    if (!incomingCallData) return;
    
    // Fermer le modal global s'il est ouvert
    setShowIncomingCallModal(false);
    
    socketService.socket.emit('reject-video-call', {
      channelName: incomingCallData.channelName,
      callerId: incomingCallData.callerId,
      callerSocketId: incomingCallData.callerSocketId,
      recipientId: user._id || user.id,
      reason: 'declined'
    });
    
    setIncomingCallData(null);
    setCallStatus('idle');
    setDebugInfo('Appel refusé');
    stopRingtone();
  };

  // Fonction pour récupérer token et démarrer Agora
  const fetchTokenAndStartCall = async (channel) => {
    try {
      setDebugInfo('Génération du token...');
      
      const response = await axios.post('http://localhost:5000/api/agora/generate-token', {
        channelName: channel,
        uid: user._id || user.id,
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Token reçu:', response.data);
      setDebugInfo('Token généré avec succès');
      
      if (response.data.success) {
        await startAgoraCall(
          response.data.token,
          channel,
          response.data.uid
        );
      } else {
        throw new Error(response.data.error || 'Erreur génération token');
      }
    } catch (error) {
      console.error('❌ Erreur token Agora:', error);
      setDebugInfo(`Erreur token: ${error.message}`);
      
      if (error.response) {
        console.error('Détails erreur:', error.response.data);
        
        if (error.response.status === 404) {
          alert(`Backend non disponible sur le port 5000`);
        } else if (error.response.status === 401) {
          alert('Token expiré. Veuillez vous reconnecter.');
        }
      }
      
      alert(`Erreur de connexion à l'appel: ${error.message}`);
      setCallStatus('idle');
      stopRingtone();
    }
  };

  // Démarrer l'appel Agora
  const startAgoraCall = async (token, channel, uid) => {
    try {
      console.log('🚀 Démarrage appel Agora:', { channel, uid });
      setDebugInfo('Connexion à Agora...');

      const result = await agoraService.joinChannel(channel, token, uid);

      if (result.success) {
        setIsCallActive(true);
        setCallStatus('in-call');
        setIsCalling(false);
        setDebugInfo('Connecté au canal vidéo');

        // Attendre un court moment pour que les tracks soient prêtes
        setTimeout(async () => {
          // Set initial local track to camera if available
          if (agoraService.localVideoTrack && !isVideoOff) {
            try {
              // Ensure the track is enabled
              await agoraService.localVideoTrack.setEnabled(true);
              console.log('📹 Track vidéo locale activée:', agoraService.localVideoTrack);
              setCurrentLocalTrack(agoraService.localVideoTrack);
            } catch (error) {
              console.error('Erreur activation track vidéo locale:', error);
            }
          } else {
            console.warn('⚠️ Aucune track vidéo locale disponible');
          }
        }, 500);

        // DEBUG: Log des tracks
        console.log('📊 État Agora après connexion:', {
          localVideo: !!agoraService.localVideoTrack,
          localAudio: !!agoraService.localAudioTrack,
          remoteUsers: Array.from(agoraService.remoteUsers.entries())
        });

        socketService.socket.emit('join-call-room', channel);

        // Démarrer le timer
        callTimerRef.current = setInterval(() => {
          setCallDuration(prev => prev + 1);
        }, 1000);

        console.log('✅ Appel Agora démarré avec succès');

      } else {
        throw new Error(result.error?.message || 'Échec de connexion Agora');
      }
    } catch (error) {
      console.error('Erreur démarrage Agora:', error);
      setDebugInfo(`Erreur Agora: ${error.message}`);
      setCallStatus('idle');
      stopRingtone();
    }
  };

  // Terminer l'appel
  const endCall = async () => {
    clearInterval(callTimerRef.current);
    clearTimeout(callTimeoutRef.current);
    callTimeoutRef.current = null;
    setDebugInfo('Fin de l\'appel...');

    socketService.socket.emit('leave-call-room', channelNameRef.current);

    // Trouver l'autre participant dans la conversation (pas l'utilisateur actuel)
    const currentUserId = user._id || user.id;
    const otherParticipant = selectedChat?.participants?.find(
      participant => (participant._id || participant.id) !== currentUserId
    );

    if (otherParticipant) {
      const recipientId = otherParticipant._id || otherParticipant.id;
      socketService.socket.emit('end-video-call', {
        channelName: channelNameRef.current,
        recipientIds: [recipientId]
      });
    }

    await agoraService.leaveChannel();

    handleEndCall();
  };

  // Gestion de fin d'appel
  const handleEndCall = () => {
    setIsCallActive(false);
    setIsCalling(false);
    setCallStatus('ended');
    setCallDuration(0);
    setRemoteStreams([]);
    setIncomingCallData(null);
    setDebugInfo('Appel terminé');
    stopRingtone();
    
    setTimeout(() => {
      if (onClose) onClose();
    }, 2000);
  };

  // Basculer micro
  const toggleMicrophone = async () => {
    const newState = !isMuted;
    setIsMuted(newState);
    setDebugInfo(`Micro ${newState ? 'désactivé' : 'activé'}`);
    await agoraService.toggleMicrophone(!newState);
  };

  // Basculer caméra
  const toggleCamera = async () => {
    const newState = !isVideoOff;
    setIsVideoOff(newState);
    setDebugInfo(`Caméra ${newState ? 'désactivée' : 'activée'}`);
    await agoraService.toggleCamera(!newState);
  };

  // Basculer partage d'écran
  const toggleScreenShare = async () => {
    console.log('🖥️ DEBUG - toggleScreenShare FUNCTION CALLED');
    console.log('🖥️ DEBUG - toggleScreenShare appelé, isScreenSharing:', isScreenSharing);
    console.log('🖥️ DEBUG - screenSharers:', screenSharers);
    console.log('🖥️ DEBUG - user._id:', user._id, 'user.id:', user.id);
    console.log('🖥️ DEBUG - socketService.socket.connected:', socketService.socket?.connected);

    try {
      if (isScreenSharing) {
        console.log('🖥️ DEBUG - Arrêt du partage d\'écran en cours...');
        const result = await agoraService.stopScreenShare();
        if (result.success) {
          setIsScreenSharing(false);
          setScreenShareTrack(null);
          setDebugInfo('Partage d\'écran arrêté');

          // Update current local track to camera if available
          if (agoraService.localVideoTrack && !isVideoOff) {
            setCurrentLocalTrack(agoraService.localVideoTrack);
          } else {
            setCurrentLocalTrack(null);
          }

          console.log('🖥️ DEBUG - Émission screen-share-stopped');
          socketService.socket.emit('screen-share-stopped', {
            channelName: channelNameRef.current,
            userId: user._id || user.id
          });
        } else {
          console.error('Erreur arrêt partage d\'écran:', result.error);
          alert('Erreur lors de l\'arrêt du partage d\'écran');
        }
      } else {
        console.log('🖥️ DEBUG - Démarrage du partage d\'écran...');
        const result = await agoraService.startScreenShare(socketService, channelNameRef.current, user._id || user.id);
        if (result.success) {
          setIsScreenSharing(true);
          setScreenShareTrack(result.screenTrack);
          setDebugInfo('Partage d\'écran démarré');

          // Update current local track to screen share
          setCurrentLocalTrack(result.screenTrack);

          console.log('🖥️ DEBUG - Émission screen-share-started');
          socketService.socket.emit('screen-share-started', {
            channelName: channelNameRef.current,
            userId: user._id || user.id
          });
        } else {
          // Ne pas afficher d'alerte si l'utilisateur a annulé
          if (!result.cancelled) {
            console.error('Erreur démarrage partage d\'écran:', result.error);
            
          } else {
            console.log('🖥️ Partage d\'écran annulé par l\'utilisateur');
          }
        }
      }
    } catch (error) {
      console.error('Erreur toggle partage d\'écran:', error);
      alert('Erreur lors du partage d\'écran');
    }
  };

  // Jouer une sonnerie
  const playRingtone = () => {
    console.log('🔔 Sonnerie jouée');
    stopRingtone(); // Arrêter d'abord si en cours
    
    try {
      // Créer une sonnerie simple si pas de fichier
      ringtoneAudioRef.current = new Audio();
      
      // Créer un contexte audio pour générer un bip
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      
      // Arrêter après 0.5s et redémarrer
      oscillator.stop(audioContext.currentTime + 0.5);
      
      // Répéter toutes les 2 secondes
      ringtoneAudioRef.current.interval = setInterval(() => {
        const newOscillator = audioContext.createOscillator();
        const newGain = audioContext.createGain();
        
        newOscillator.connect(newGain);
        newGain.connect(audioContext.destination);
        
        newOscillator.frequency.value = 800;
        newOscillator.type = 'sine';
        newGain.gain.value = 0.3;
        
        newOscillator.start();
        newOscillator.stop(audioContext.currentTime + 0.5);
      }, 2000);
      
    } catch (error) {
      console.log('Sonnerie non supportée:', error);
    }
  };

  // Arrêter la sonnerie
  const stopRingtone = () => {
    console.log('🔕 Sonnerie arrêtée');
    if (ringtoneAudioRef.current) {
      if (ringtoneAudioRef.current.interval) {
        clearInterval(ringtoneAudioRef.current.interval);
      }
      if (ringtoneAudioRef.current.pause) {
        ringtoneAudioRef.current.pause();
      }
      ringtoneAudioRef.current = null;
    }
  };

  // Formater la durée
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };



  // Rendu de l'appel en cours
  if (isCallActive) {
    return (
      <div className="video-call-screen">
        <div className="video-call-container">
          {/* Vidéo distante (plein écran) */}
          <div className="remote-video-container">
            {(() => {
              // Combine screen shares and remote streams for simultaneous display
              const combinedStreams = [
                ...screenShareStreams.map(stream => ({ type: 'screen', ...stream })),
                ...remoteStreams.map(stream => ({ type: 'video', ...stream }))
              ];

              return combinedStreams.length > 0 ? (
                combinedStreams.map(stream => (
                  <div key={stream.type === 'screen' ? `screen-${stream.userId}` : `video-${stream.uid}`} className="remote-video-wrapper">
                    {stream.type === 'screen' ? (
                      <>
                        <video
                          ref={el => {
                            remoteVideoRefs.current[stream.userId] = el;

                            // Quand l'élément DOM est disponible, jouer le partage d'écran
                            if (el && stream.screenTrack) {
                              setTimeout(() => {
                                try {
                                  stream.screenTrack.play(el);
                                  console.log(`🖥️ Partage d'écran ${stream.userId} auto-played`);
                                } catch (error) {
                                  console.error(`Auto-play error screen share ${stream.userId}:`, error);
                                }
                              }, 50);
                            }
                          }}
                          className="remote-video"
                          id={`screen-share-${stream.userId}`}
                          autoPlay
                          playsInline
                        />
                        <div className="screen-share-indicator">
                          <Monitor size={16} />
                          <span>Partage d'écran</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <video
                          ref={el => {
                            remoteVideoRefs.current[stream.uid] = el;

                            // Quand l'élément DOM est disponible, jouer la vidéo
                            if (el && agoraService.remoteUsers.has(stream.uid)) {
                              setTimeout(() => {
                                const userData = agoraService.remoteUsers.get(stream.uid);
                                if (userData?.videoTrack && el) {
                                  try {
                                    userData.videoTrack.play(el);
                                    console.log(`🎬 Vidéo ${stream.uid} auto-played`);
                                  } catch (error) {
                                    console.error(`Auto-play error ${stream.uid}:`, error);
                                  }
                                }
                              }, 50);
                            }
                          }}
                          className="remote-video"
                          id={`remote-video-${stream.uid}`}
                          autoPlay
                          playsInline
                        />
                        {!stream.hasVideo && (
                          <div className="no-video-placeholder">
                            <div className="user-avatar">
                              {selectedChat.participants[0]?.username?.charAt(0).toUpperCase()}
                            </div>
                            <p>Pas de vidéo</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))
              ) : (
                <div className="waiting-for-connection">
                  <div className="spinner"></div>
                  <p>En attente de connexion...</p>
                  <p className="debug-info">{debugInfo}</p>
                </div>
              );
            })()}
          </div>

          {/* Vidéo locale (picture-in-picture) */}
          <div className="local-video-pip">
            <video
              ref={localVideoRef}
              className="local-video"
              autoPlay
              muted
              playsInline
            />
            {isVideoOff && (
              <div className="video-off-indicator">
                <VideoOff size={24} />
              </div>
            )}
          </div>

          {/* Contrôles */}
          <div className="call-controls">
            <div className="call-info">
              <div className="call-duration">
                {formatDuration(callDuration)}
              </div>
              <div className="debug-text">{debugInfo}</div>
            </div>

            <div className="control-buttons">
              <button
                className={`control-btn ${isMuted ? 'btn-active' : ''}`}
                onClick={toggleMicrophone}
                title={isMuted ? 'Activer le micro' : 'Désactiver le micro'}
              >
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              <button
                className={`control-btn ${isVideoOff ? 'btn-active' : ''}`}
                onClick={toggleCamera}
                title={isVideoOff ? 'Activer la caméra' : 'Désactiver la caméra'}
              >
                {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
              </button>

              <button
                className={`control-btn ${isScreenSharing ? 'btn-active' : ''}`}
                onClick={toggleScreenShare}
                title={isScreenSharing ? 'Arrêter le partage d\'écran' : 'Partager l\'écran'}
              >
                <Monitor size={20} />
              </button>

              <button
                className="control-btn btn-end-call"
                onClick={endCall}
                title="Terminer l'appel"
              >
                <Phone size={20} />
              </button>
            </div>
          </div>

          {/* Bouton fermer */}
          <button className="close-call-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
      </div>
    );
  }

  // Rendu de l'écran d'appel (avant connexion)
  if (isCalling) {
    return (
      <div className="video-call-screen calling-screen">
        <div className="calling-container">
          <div className="calling-avatar">
            {selectedChat.participants[0]?.username?.charAt(0).toUpperCase()}
          </div>
          
          <div className="calling-info">
            <h3>Appel en cours...</h3>
            <p>Appel de {selectedChat.participants[0]?.username}</p>
            <p className="debug-info">{debugInfo}</p>
          </div>
          
          <div className="calling-controls">
            <button className="btn-cancel-call" onClick={endCall}>
              <Phone size={24} />
              <span>Annuler</span>
            </button>
          </div>
          
          <div className="ringing-animation">
            <div className="ring"></div>
            <div className="ring"></div>
            <div className="ring"></div>
          </div>
        </div>
      </div>
    );
  }

  // Écran initial (bouton pour démarrer l'appel)
  return (
    <div className="video-call-screen init-screen">
      <div className="call-init-container">
        <div className="user-info">
          <div className="user-avatar-large">
            {selectedChat.participants[0]?.username?.charAt(0).toUpperCase()}
          </div>
          <h3>{selectedChat.participants[0]?.username}</h3>
          <p>Prêt pour un appel vidéo ?</p>
        </div>
        
        <div className="init-controls">
          <button className="btn-start-call" onClick={startOutgoingCall}>
            <Video size={24} />
            <span>Démarrer l'appel vidéo</span>
          </button>
          
          <button className="btn-close" onClick={onClose}>
            Annuler
          </button>
        </div>
        
        <div className="permissions-note">
          <p>Assurez-vous d'avoir autorisé l'accès au micro et à la caméra</p>
        </div>
      </div>
    </div>
  );
};

export default VideoCallScreen;