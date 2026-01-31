import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Mic, MicOff, Video, VideoOff, Phone, Monitor } from 'lucide-react';
import agoraService from '../services/agoraService';
import socketService from '../services/socketService';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { useCall } from '../context/CallContext';
import './VideoCallScreen.css';
import api from '../services/api';

const VideoCallScreen = ({ selectedChat, callType = 'video', onClose }) => {
  console.log("🧩 VideoCallScreen RENDER", { callType });
  
  const { user } = useAuth();
  const { acceptedCall, clearActiveCall } = useCall();
  
  const effectiveCallType = acceptedCall?.callType || callType;
  const [currentCallType, setCurrentCallType] = useState(effectiveCallType);
  const isAudioCall = currentCallType === 'audio';
  
  const callChat = selectedChat || (acceptedCall?.chatId ? { _id: acceptedCall.chatId } : null);
  
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isCalling, setIsCalling] = useState(false);
  const [callStatus, setCallStatus] = useState('idle');
  const [debugInfo, setDebugInfo] = useState('');
  const [isUpgradingToVideo, setIsUpgradingToVideo] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false); // ✅ AJOUTÉ
  
  const localVideoRef = useRef(null);
  const callTimerRef = useRef(null);
  const channelNameRef = useRef(callChat?._id ? `call_${callChat._id}` : null);
  const agoraStartedRef = useRef(false);
  const callStatusRef = useRef('idle'); 
  // Le modal ne doit être visible QUE si on est l'appelant (pas de acceptedCall)
const [showCallInitModal, setShowCallInitModal] = useState(!acceptedCall);
  
  // ✅ Mettre à jour la ref quand le state change
  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);
  // 🔥 Masquer automatiquement le modal si on reçoit un appel
useEffect(() => {
  if (acceptedCall) {
    console.log("📥 Appel accepté détecté → masquage du modal d'init");
    setShowCallInitModal(false);
  }
}, [acceptedCall]);
  
  useEffect(() => {
    setCurrentCallType(effectiveCallType);
  }, [effectiveCallType]);
  
  useEffect(() => {
    if (!acceptedCall || agoraStartedRef.current) return;
    
    console.log("📥 RECEVEUR : acceptedCall détecté, démarrage Agora");
    console.log("📞 Type d'appel:", effectiveCallType);
    
    const channel = acceptedCall.channelName;
    if (!channel) {
      console.error("❌ channelName manquant côté receveur");
      return;
    }
    
    startAgoraOnce(channel);
  }, [acceptedCall, effectiveCallType]);

  const startAgoraOnce = async (channelName) => {
    if (agoraStartedRef.current) {
      console.warn("⚠️ Agora déjà lancé, skip");
      return;
    }

    agoraStartedRef.current = true;
    await fetchTokenAndStartCall(channelName);
  };

  // ✅ SIMPLIFIÉ - Gestion de la vidéo distante
  useEffect(() => {
    agoraService.onRemoteVideoAdded = (uid, videoTrack) => {
      console.log("🎥 VIDEO DISTANTE REÇUE", uid);

      const container = document.getElementById("remote-video");
      if (!container) {
        console.error("❌ container remote-video introuvable");
        return;
      }

      container.innerHTML = "";
      videoTrack.play(container);
      //setDebugInfo(`Vidéo distante ${uid} reçue`);
    };
    
    agoraService.onRemoteVideoRemoved = (uid) => {
      console.log(`📹 [CALLBACK] Vidéo distante retirée: ${uid}`);
      const container = document.getElementById("remote-video");
      if (container) {
        container.innerHTML = "";
      }
    };
    
    agoraService.onRemoteAudioAdded = (uid, audioTrack) => {
      console.log(`🎧 [CALLBACK] Audio distant ajouté: ${uid}`);
      try {
        audioTrack.play();
        console.log(`✅ [CALLBACK] Audio ${uid} joué`);
      } catch (error) {
        console.error(`❌ [CALLBACK] Erreur play audio ${uid}:`, error);
      }
    };
    
    const socket = socketService.socket;
    if (!socket) {
      console.warn('⚠️ Socket non disponible');
      return;
    }

    socket.on('call-accepted', (data) => {
      console.log('✅ Appel accepté par le destinataire:', data);
      //setDebugInfo('Appel accepté par le destinataire');
      
      const targetChannel = data.channelName || channelNameRef.current;
      
      if (!targetChannel) {
        console.error('❌ Channel name manquant dans call-accepted');
        //setDebugInfo('Erreur: Channel manquant');
        return;
      }
      
      console.log('🚀 APPELANT: Démarrage Agora via call-accepted');
      startAgoraOnce(targetChannel);
    });

    socket.on('call-rejected', (data) => {
  console.log('❌ Appel refusé:', data);
  setCallStatus('rejected');
  //setDebugInfo('Appel refusé');
  alert(`L'appel a été refusé: ${data.reason || 'Par l\'utilisateur'}`);
  endCall('rejected');   // ← raison "rejected"
});
    
// ────────────────────────────────────────────────
//  Écouteur UNIQUE et fiable pour la fin d'appel
// ────────────────────────────────────────────────
socket.on('call:ended', (data) => {
  console.log("📴 call:ended reçu du serveur", data);

  // On accepte l'événement si :
  // - il concerne notre conversation actuelle
  // OU
  // - on n'a pas encore de chatId précis (cas rare mais possible)
  const concerneCetteConversation =
    !callChat?._id ||                    // sécurité si chat pas encore chargé
    data.conversationId === callChat?._id ||
    data.channelName?.includes(callChat?._id);

  if (concerneCetteConversation) {
    console.log("→ Cet événement concerne bien notre appel → on ferme");
    handleEndCall();
  } else {
    console.log("call:ended ignoré (pas pour cette conv)", {
      reçu: data.conversationId || data.channelName,
      actuel: callChat?._id
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════

// 📝 MODIFICATION 2 : Ajouter ce listener JUSTE APRÈS le socket.on('call:ended')
// Pour être sûr de capter tous les événements de fin d'appel




    socket.on('call-initiated', (data) => {
      console.log('📞 Appel initié avec succès:', data);
      setCallStatus('calling');
      //setDebugInfo('Appel initié, en attente de réponse...');
    });

    socket.on('call-error', (data) => {
      console.error('💥 Erreur appel:', data);
      //setDebugInfo(`Erreur: ${data.error}`);
      alert(`Erreur: ${data.error}`);
      setIsCalling(false);
      setCallStatus('idle');
      handleEndCall();
    });

    socket.on('connect', () => {
      console.log('✅ Socket reconnecté');
      //setDebugInfo('Connexion rétablie');
    });

    // ✅ SIMPLIFIÉ - Juste mettre à jour l'UI
    socket.on('call-upgraded-to-video', ({ channelName }) => {
      if (channelName !== channelNameRef.current) return;

      console.log('🎥 Upgrade vidéo reçu (remote)');
      //setDebugInfo('L\'autre utilisateur a activé la caméra');
      setCurrentCallType('video');
    });

    return () => {
      agoraService.onRemoteVideoAdded = null;
      agoraService.onRemoteVideoRemoved = null;
      agoraService.onRemoteAudioAdded = null;
      
      if (socket) {
        socket.off('call-accepted');
        socket.off('call-rejected');
       socket.off('call:ended');
        socket.off('call-initiated');
        socket.off('call-error');
        socket.off('call-upgraded-to-video');
        socket.off('connect');
      }
      clearInterval(callTimerRef.current);
    };
  }, []);

  // 🔥 AJOUT OBLIGATOIRE - Gestion de la vidéo distante après upgrade
  useEffect(() => {
    if (currentCallType !== 'video') return;

    console.log("🔁 Passage en UI vidéo côté receveur");

    // Laisser le DOM se monter
    setTimeout(() => {
      const remoteUsers = agoraService.remoteUsers;

      for (const [uid, userData] of remoteUsers.entries()) {
        if (userData.videoTrack) {
          const container = document.getElementById("remote-video");
          if (container) {
            console.log("🎬 Lecture vidéo distante après upgrade", uid);
            container.innerHTML = "";
            userData.videoTrack.play(container);
          }
        }
      }
    }, 100); // 👈 IMPORTANT
  }, [currentCallType]);

  // Mettre à jour la vidéo locale (uniquement pour appels vidéo)
  useEffect(() => {
    if (!isAudioCall && agoraService.localVideoTrack && localVideoRef.current) {
      console.log('🎬 Lecture vidéo locale');
      agoraService.localVideoTrack.play(localVideoRef.current);
      //setDebugInfo('Vidéo locale active');
    }
  }, [isCallActive, isAudioCall, currentCallType]);

  // Initialisation socket
  useEffect(() => {
    const testSocket = async () => {
      const token = localStorage.getItem('token');
      if (token && (!socketService.socket || !socketService.socket.connected)) {
        console.log('🔄 Tentative de connexion socket...');
        socketService.connect(token);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    };
    
    testSocket();
  }, []);
  useEffect(() => {
  return () => {
    // Si on était en appel ou en cours d'appel → signaler la fin
    if (['in-call', 'calling'].includes(callStatusRef.current)) {
      console.log('Composant démonté → signalement fin d’appel');
      
      socketService.socket?.emit('end-call', {
        channelName: channelNameRef.current,
        chatId: callChat?._id,
        duration: callDuration,
        reason: 'window_closed'
      });
    }
    
    // Nettoyage local
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }
  };
}, []); 
    
 // Ajoute ceci juste après ton useEffect existant sur [callType]

// 🆕 PLACER CETTE FONCTION ICI (APRÈS TOUS LES useEffect, AVANT handleEndCall)
const cleanupMediaStreams = useCallback(() => {
  console.log("🧹 Nettoyage des streams média");
  
  // 1. Arrêter les tracks locaux Agora
  if (agoraService.localAudioTrack) {
    agoraService.localAudioTrack.stop();
    agoraService.localAudioTrack.close();
    console.log("⏹️ Audio local arrêté");
  }
  
  if (agoraService.localVideoTrack) {
    agoraService.localVideoTrack.stop();
    agoraService.localVideoTrack.close();
    console.log("⏹️ Vidéo locale arrêtée");
  }

  // 2. Arrêter le partage d'écran si actif
  if (agoraService.screenTrack) {
    agoraService.screenTrack.stop();
    agoraService.screenTrack.close();
    console.log("⏹️ Partage d'écran arrêté");
  }
  
  // 3. Nettoyer les références
  agoraService.localAudioTrack = null;
  agoraService.localVideoTrack = null;
  agoraService.screenTrack = null;
  
  console.log("✅ Nettoyage terminé");
}, []);

// 🆕 AJOUTER CES 2 useEffect ICI (JUSTE APRÈS cleanupMediaStreams)
useEffect(() => {
  return () => {
    console.log("🧹 Démontage VideoCallScreen → nettoyage streams");
    cleanupMediaStreams();
  };
}, [cleanupMediaStreams]);

useEffect(() => {
  const handleBeforeUnload = () => {
    console.log("🚪 Fermeture page → nettoyage streams");
    cleanupMediaStreams();
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}, [cleanupMediaStreams]);

  const startOutgoingCall = () => {
    console.log('🔍 === DÉBUT startOutgoingCall ===');
    console.log('📞 Type d\'appel:', currentCallType);
    
    if (!isAudioCall) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          stream.getTracks().forEach(track => track.stop());
          _startOutgoingCall();
        })
        .catch(error => {
          console.error('❌ Permission caméra refusée:', error);
          alert('Permission caméra requise pour les appels vidéo');
          onClose();
        });
    } else {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          stream.getTracks().forEach(track => track.stop());
          _startOutgoingCall();
        })
        .catch(error => {
          console.error('❌ Permission micro refusée:', error);
          alert('Permission micro requise pour les appels audio');
          onClose();
        });
    }
  };

  const _startOutgoingCall = async () => {
    //setDebugInfo('Démarrage appel sortant...');
    
    if (!callChat?._id) {
      alert('Conversation invalide');
      return;
    }
    
    const currentUserId = user._id || user.id;
    
    const otherParticipant = callChat.participants?.find(
      participant => (participant._id || participant.id) !== currentUserId
    );
    
    if (!otherParticipant) {
      alert('Aucun autre participant trouvé dans la conversation');
      return;
    }
    
    console.log('🎯 Appel à:', {
      currentUser: currentUserId,
      otherUser: otherParticipant._id || otherParticipant.id,
      otherUsername: otherParticipant.username,
      callType: currentCallType
    });
    
    setIsCalling(true);
    setCallStatus('calling');
    
    const channelName = `call_${callChat._id}`;
    channelNameRef.current = channelName;
    
   try {
  // ✅ Vérification robuste de la connexion
  if (!socketService.socket?.connected) {
    console.warn('⚠️ Socket déconnecté, tentative de reconnexion...');
    
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Token manquant, impossible de reconnecter');
    }
    
    socketService.connect(token);
    await new Promise(resolve => setTimeout(resolve, 1000)); // ✅ Délai plus long
    
    if (!socketService.socket?.connected) {
      throw new Error('Impossible de se reconnecter au serveur');
    }
  }
  
  console.log('✅ Socket prêt, émission événement initiate-call...');
  
  // ✅ Vérifier à nouveau juste avant d'émettre
  if (!socketService.socket?.connected) {
    throw new Error('Socket déconnecté au moment de l\'émission');
  }
  
  
      
      const callData = {
        chatId: callChat._id,
        channelName: channelName,
        callerId: currentUserId,
        callerName: user.username || 'Utilisateur',
        recipientId: otherParticipant._id || otherParticipant.id,
        recipientName: otherParticipant.username || 'Utilisateur',
        timestamp: Date.now(),
        callType: currentCallType,
        callerSocketId: socketService.socket.id
      };
      
      socketService.socket.emit('initiate-call', callData);
      //setDebugInfo('Appel émis, en attente d\'acceptation...');
      
      console.log('📤 Événement envoyé:', callData);
      
      // ✅ CORRECTION 3: Utiliser la ref au lieu du state pour éviter stale state
    setTimeout(() => {
  if (callStatusRef.current === 'calling' && !isCallActive) {
    //console.log('⏰ Timeout: Appel non répondu');
    //setDebugInfo('Appel non répondu (timeout)');
    //alert('L\'appel n\'a pas été répondu');
    endCall('missed');   // ← raison "missed"
  }
}, 30000);
      
    } catch (error) {
      console.error('💥 Erreur connexion socket:', error);
      //setDebugInfo(`Erreur socket: ${error.message}`);
      alert(`Erreur de connexion: ${error.message}`);
      setIsCalling(false);
      setCallStatus('idle');
    }
  };

  const fetchTokenAndStartCall = async (channel) => {
    try {
      //setDebugInfo('Génération du token...');
      console.log('🔑 Génération token pour channel:', channel);
      
    const response = await api.post('/agora/generate-token', {
  channelName: channel
});

      console.log('✅ Token reçu:', response.data);
      //setDebugInfo('Token généré avec succès');
      
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
      //setDebugInfo(`Erreur token: ${error.message}`);
      
      if (error.response) {
        if (error.response.status === 404) {
          alert(`Backend non disponible sur le port 5000`);
        } else if (error.response.status === 401) {
          alert('Token expiré. Veuillez vous reconnecter.');
        }
      }
      
      alert(`Erreur de connexion à l'appel: ${error.message}`);
      setCallStatus('idle');
      agoraStartedRef.current = false;
      handleEndCall();
    }
  };

  const startAgoraCall = async (token, channel, uid) => {
    console.log("🧪 START AGORA CALL", {
      channel,
      uid,
      isAudioCall
    });

    if (isCallActive) {
      console.warn("⚠️ Agora déjà actif, abort startAgoraCall");
      return;
    }
    
    try {
      console.log('🚀 Démarrage appel Agora:', { channel, uid, isAudioCall });
      //setDebugInfo('Connexion à Agora...');
      
      const result = await agoraService.joinChannel(
        channel,
        token,
        uid,
        isAudioCall
      );
      
      if (result.success) {
        setIsCallActive(true);
        setCallStatus('in-call');
        setIsCalling(false);
        //setDebugInfo(`Connecté au canal: ${channel}`);
        
        console.log('📊 État Agora après connexion:', {
          channel: channel,
          localVideo: !!agoraService.localVideoTrack,
          localAudio: !!agoraService.localAudioTrack,
          isAudioCall: isAudioCall
        });
        
        socketService.socket.emit('join-call-room', channel);
        
        callTimerRef.current = setInterval(() => {
          setCallDuration(prev => prev + 1);
        }, 1000);
        
        console.log('✅ Appel Agora démarré avec succès sur channel:', channel);
        
      } else {
        throw new Error(result.error?.message || 'Échec de connexion Agora');
      }
    } catch (error) {
      console.error('Erreur démarrage Agora:', error);
      //setDebugInfo(`Erreur Agora: ${error.message}`);
      setCallStatus('idle');
      agoraStartedRef.current = false;
      handleEndCall();
    }
  };

const endCall = async (reason = 'ended') => {
  console.log(`→ endCall appelé avec reason = ${reason}, duration = ${callDuration}s, role = ${acceptedCall ? 'receiver' : 'caller'}`);

  try {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    const duration = callDuration || 0;
    let finalReason = reason;
    if (reason === 'ended' && duration < 3) {
      finalReason = 'missed';
    }

    // Message d'appel
    const callMessageData = {
      chatId: callChat?._id,
      callType: currentCallType,
      callResult: finalReason,
      duration,
      senderId: user?._id || user?.id
    };

    if (socketService.socket?.connected) {
      socketService.socket.emit("call-message", callMessageData);
      console.log("→ call-message émis");
    }

    // ──── IMPORTANT ────
    const callIdToSend = acceptedCall?.callId || channelNameRef.current?.split('_')[1] || null;

    if (socketService.socket?.connected) {
      socketService.socket.emit("end-call", {
        chatId: callChat?._id,
        channelName: channelNameRef.current,
        callId: callIdToSend,           // ← ajouté pour aider le serveur
        duration,
        reason: finalReason
      });
      console.log("→ end-call émis", { callId: callIdToSend, reason: finalReason });
    } else {
      console.warn("Socket déconnecté → fin locale seulement");
    }

    try {
      await agoraService.leaveChannel();
      console.log("→ Agora quitté");
    } catch (err) {
      console.warn("leaveChannel échoué (peut-être déjà quitté)", err);
    }

    handleEndCall();

  } catch (err) {
    console.error("Erreur endCall :", err);
    handleEndCall(); // on ferme quand même
  }
};



const handleEndCall = () => {
  console.log("🔚 handleEndCall appelé");
  
  // 🆕 NETTOYER LES STREAMS AVANT TOUT
  cleanupMediaStreams();
  
  setIsCallActive(false);
  setIsCalling(false);
  setCallStatus('ended');
  setCallDuration(0);
  setIsScreenSharing(false);

  setTimeout(() => {
    clearActiveCall?.();
    onClose?.();
  }, 400);
};


  const toggleMicrophone = async () => {
    const newState = !isMuted;
    setIsMuted(newState);
    //setDebugInfo(`Micro ${newState ? 'désactivé' : 'activé'}`);
    await agoraService.toggleMicrophone(!newState);
  };

  const toggleCamera = async () => {
    if (isAudioCall) {
      alert('L\'appel audio ne prend pas en charge la caméra');
      return;
    }
    const newState = !isVideoOff;
    setIsVideoOff(newState);
    //setDebugInfo(`Caméra ${newState ? 'désactivée' : 'activée'}`);
    await agoraService.toggleCamera(!newState);
  };

  const upgradeToVideo = async () => {
    console.log("🎥 Activation de la caméra...");
    
    setIsUpgradingToVideo(true);
    //setDebugInfo('Activation de la caméra...');
    
    try {
      console.log('1. Demande d\'accès à la caméra...');
      await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      });
      
      console.log('2. Mise à niveau via agoraService...');
      const result = await agoraService.upgradeToVideoCall();
      
      if (!result.success) {
        throw new Error(result.error || 'Échec de la mise à niveau');
      }
      
      if (agoraService.localVideoTrack && localVideoRef.current) {
        agoraService.localVideoTrack.play(localVideoRef.current);
        console.log('✅ Vidéo locale affichée');
      }
      
      setCurrentCallType('video');
      
      if (socketService.socket && channelNameRef.current) {
        socketService.socket.emit('call-upgraded-to-video', {
          channelName: channelNameRef.current,
        });
        console.log('📤 Événement call-upgraded-to-video envoyé');
      }
      
      setIsVideoOff(false);
      //setDebugInfo('Appel audio mis à niveau en vidéo !');
      
      console.log('✅ Appel audio mis à jour en vidéo avec succès');
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'activation de la caméra:', error);
      //setDebugInfo(`Erreur caméra: ${error.message}`);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        alert('Permission caméra refusée. Veuillez autoriser l\'accès à la caméra dans les paramètres de votre navigateur.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        alert('Aucune caméra trouvée. Veuillez vérifier votre matériel.');
      } else {
        alert(`Erreur d\'activation de la caméra: ${error.message}`);
      }
    } finally {
      setIsUpgradingToVideo(false);
    }
  };

  // ✅ AJOUTÉ - Fonction pour partager l'écran
  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        await agoraService.startScreenShare();
        setIsScreenSharing(true);

        socketService.socket.emit("screen-share-started", {
          channelName: channelNameRef.current,
        });

        //setDebugInfo("Partage d'écran activé");
      } else {
        await agoraService.stopScreenShare();
        setIsScreenSharing(false);

        socketService.socket.emit("screen-share-stopped", {
          channelName: channelNameRef.current,
        });

        //setDebugInfo("Partage d'écran arrêté");
      }
    } catch (err) {
      console.error("❌ Erreur partage écran:", err);
      alert("Erreur partage écran : " + err.message);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ✅ UI SPÉCIALE AUDIO CALL
  if (isCallActive && isAudioCall) {
    return (
      <div className="audio-call-screen">
        <div className="audio-call-container">
          <div className="caller-avatar">
            {callChat?.participants?.[0]?.username?.charAt(0).toUpperCase() || 'U'}
          </div>

          <h3>Appel audio en cours</h3>
          <p>{callChat?.participants?.[0]?.username || 'Utilisateur'}</p>

          <div className="call-duration">
            {formatDuration(callDuration)}
          </div>

          <div className="control-buttons">
            <button 
              className={`control-btn ${isMuted ? 'btn-active' : ''}`}
              onClick={toggleMicrophone}
              title={isMuted ? 'Activer le micro' : 'Désactiver le micro'}
              disabled={isUpgradingToVideo}
            >
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            
            <button
              className="control-btn upgrade-video-btn"
              onClick={upgradeToVideo}
              title="Activer la caméra"
              disabled={isUpgradingToVideo}
            >
              {isUpgradingToVideo ? (
                <div className="upgrading-spinner"></div>
              ) : (
                <Video size={20} />
              )}
            </button>

           <button 
  className="control-btn btn-end-call"
  onClick={() => endCall('ended')}          
  title="Terminer l'appel"
>
  <Phone size={20} />
</button>
          </div>
          
          {isUpgradingToVideo && (
            <div className="upgrading-message">
              <p>Activation de la caméra...</p>
            </div>
          )}

          <button className="close-call-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
      </div>
    );
  }

  // ✅ UI VIDÉO (uniquement si pas audio)
  if (isCallActive && !isAudioCall) {
    return (
      <div className="video-call-screen">
        <div className="video-call-container">
          {/* ✅ CONTAINER UNIQUE POUR LA VIDÉO DISTANTE */}
          <div className="remote-video-container">
            <div
              id="remote-video"
              style={{ width: "100%", height: "100%", background: "black" }}
            />
          </div>

          <div className="local-video-pip">
            <div ref={localVideoRef} className="local-video" />
            {isVideoOff && (
              <div className="video-off-indicator">
                <VideoOff size={24} />
              </div>
            )}
          </div>

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
              
              {/* ✅ BOUTON PARTAGE D'ÉCRAN AJOUTÉ */}
              <button
                className={`control-btn ${isScreenSharing ? 'btn-active' : ''}`}
                onClick={toggleScreenShare}
                title={isScreenSharing ? 'Arrêter le partage d\'écran' : 'Partager l\'écran'}
              >
                <Monitor size={20} />
              </button>
              
            <button 
  className="control-btn btn-end-call"
  onClick={() => endCall('ended')}
  title="Terminer l'appel"
>
  <Phone size={20} />
</button>
            </div>
          </div>

          <button className="close-call-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
      </div>
    );
  }

  if (isCalling) {
    return (
      <div className="video-call-screen calling-screen">
        <div className="calling-container">
          <div className="calling-avatar">
            {callChat?.participants?.[0]?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          
          <div className="calling-info">
            <h3>Appel {currentCallType === 'audio' ? 'audio' : 'vidéo'} en cours...</h3>
            <p>Appel de {callChat?.participants?.[0]?.username || 'Utilisateur'}</p>
            <p className="debug-info">{debugInfo}</p>
            <p className="debug-info">En attente d'acceptation...</p>
          </div>
          
      <button
  className="btn-cancel-call"
  onClick={async () => {
    console.log("👆 Bouton Annuler cliqué");

    if (!socketService.socket?.connected) {
      console.warn("Socket déconnecté → fermeture locale");
      endCall('missed');
      return;
    }

    const recipient = callChat?.participants?.find(
      (p) => (p._id || p.id) !== (user._id || user.id)
    );

    const recipientId = recipient?._id || recipient?.id;

    if (!recipientId) {
      console.warn("Destinataire non trouvé → fermeture locale");
      endCall('missed');
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // On s'abonne temporairement pour détecter le message d'appel annulé
    const handleNewMessage = (newMsg) => {
      if (
        newMsg?.typeMessage === "call" &&
        ["cancelled", "missed"].includes(newMsg?.callResult)
      ) {
        console.log("→ Message 'appel annulé/manqué' bien reçu !");
        socketService.socket.off("new-message", handleNewMessage);
      }
    };

    socketService.socket.once("new-message", handleNewMessage);
    // ─────────────────────────────────────────────────────────────

    // On envoie la demande d'annulation
    socketService.socket.emit("cancel-call", {
      channelName: channelNameRef.current,
      chatId: callChat?._id,
      callerId: user?._id || user?.id,
      recipientId,
      callType: currentCallType,
      callId: null, // ← tu pourras le remplir plus tard si tu stockes callId
    });

    console.log("📤 cancel-call envoyé", { recipientId });

    // On donne un peu de temps au serveur pour créer et diffuser le message
    await new Promise((resolve) => setTimeout(resolve, 700));

    // On ferme l'écran d'appel
    endCall("cancelled");
  }}
>
  <Phone size={24} />
  <span>Annuler</span>
</button>
          
          <div className="ringing-animation">
            <div className="ring"></div>
            <div className="ring"></div>
            <div className="ring"></div>
          </div>
        </div>
      </div>
    );
  }

 if (!showCallInitModal) {
  return null; // ou return <></>;   ← on ne rend plus rien quand modal fermée
}

return (
  <div 
    className="call-init-modal-overlay"
    onClick={() => setShowCallInitModal(false)} // clic extérieur → ferme
  >
    <div 
      className="call-init-modal-content"
      onClick={e => e.stopPropagation()} // empêche la fermeture quand on clique dedans
    >
      <button 
        className="modal-close-btn"
        onClick={() => setShowCallInitModal(false)}
        aria-label="Fermer"
      >
        <X size={24} />
      </button>

      <div className="user-info">
        <div className="user-avatar-large">
          {callChat?.participants?.[0]?.username?.charAt(0).toUpperCase() || 'U'}
        </div>
        <h3>{callChat?.participants?.[0]?.username || 'Utilisateur'}</h3>
        <p>Prêt pour un appel {isAudioCall ? 'audio' : 'vidéo'} ?</p>
      </div>
      
      <div className="init-controls">
        <button 
          className="btn-start-call" 
          onClick={startOutgoingCall}
          disabled={isCalling}
        >
          {isAudioCall ? (
            <>
              <Phone size={24} />
              <span>Démarrer l'appel audio</span>
            </>
          ) : (
            <>
              <Video size={24} />
              <span>Démarrer l'appel vidéo</span>
            </>
          )}
        </button>
        
        <button 
          className="btn-close" 
          onClick={() => setShowCallInitModal(false)}
        >
          Annuler
        </button>
      </div>

      {/* Optionnel : petite note permissions */}
      <div className="permissions-note">
        {isAudioCall 
          }
      </div>
    </div>
  </div>
);
};

export default VideoCallScreen;