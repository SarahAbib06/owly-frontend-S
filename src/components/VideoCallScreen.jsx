import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, Video, VideoOff, Phone, Monitor } from 'lucide-react';
import agoraService from '../services/agoraService';
import socketService from '../services/socketService';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { useCall } from '../context/CallContext';
import './VideoCallScreen.css';

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
      setDebugInfo(`Vidéo distante ${uid} reçue`);
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
      setDebugInfo('Appel accepté par le destinataire');
      
      const targetChannel = data.channelName || channelNameRef.current;
      
      if (!targetChannel) {
        console.error('❌ Channel name manquant dans call-accepted');
        setDebugInfo('Erreur: Channel manquant');
        return;
      }
      
      console.log('🚀 APPELANT: Démarrage Agora via call-accepted');
      startAgoraOnce(targetChannel);
    });

    socket.on('call-rejected', (data) => {
      console.log('❌ Appel refusé:', data);
      setCallStatus('rejected');
      setDebugInfo('Appel refusé');
      alert(`L'appel a été refusé: ${data.reason || 'Par l\'utilisateur'}`);
      setIsCalling(false);
      handleEndCall();
    });

    socket.on('call-ended', (data) => {
      console.log('📞 Appel terminé par l\'autre utilisateur:', data);
      if (data.channelName === channelNameRef.current) {
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
      alert(`Erreur: ${data.error}`);
      setIsCalling(false);
      setCallStatus('idle');
      handleEndCall();
    });

    socket.on('connect', () => {
      console.log('✅ Socket reconnecté');
      setDebugInfo('Connexion rétablie');
    });

    // ✅ SIMPLIFIÉ - Juste mettre à jour l'UI
    socket.on('call-upgraded-to-video', ({ channelName }) => {
      if (channelName !== channelNameRef.current) return;

      console.log('🎥 Upgrade vidéo reçu (remote)');
      setDebugInfo('L\'autre utilisateur a activé la caméra');
      setCurrentCallType('video');
    });

    return () => {
      agoraService.onRemoteVideoAdded = null;
      agoraService.onRemoteVideoRemoved = null;
      agoraService.onRemoteAudioAdded = null;
      
      if (socket) {
        socket.off('call-accepted');
        socket.off('call-rejected');
        socket.off('call-ended');
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
      setDebugInfo('Vidéo locale active');
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
    setDebugInfo('Démarrage appel sortant...');
    
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
      if (!socketService.socket?.connected) {
        const token = localStorage.getItem('token');
        if (token) {
          socketService.connect(token);
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      console.log('✅ Socket prêt, émission événement...');
      
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
      setDebugInfo('Appel émis, en attente d\'acceptation...');
      
      console.log('📤 Événement envoyé:', callData);
      
      setTimeout(() => {
        if (callStatus === 'calling' && !isCallActive) {
          console.log('⏰ Timeout: Appel non répondu');
          setDebugInfo('Appel non répondu (timeout)');
          alert('L\'appel n\'a pas été répondu');
          setIsCalling(false);
          setCallStatus('ended');
          handleEndCall();
        }
      }, 30000);
      
    } catch (error) {
      console.error('💥 Erreur connexion socket:', error);
      setDebugInfo(`Erreur socket: ${error.message}`);
      alert(`Erreur de connexion: ${error.message}`);
      setIsCalling(false);
      setCallStatus('idle');
    }
  };

  const fetchTokenAndStartCall = async (channel) => {
    try {
      setDebugInfo('Génération du token...');
      console.log('🔑 Génération token pour channel:', channel);
      
      const response = await axios.post(
        'http://localhost:5000/api/agora/generate-token',
        {
          channelName: channel
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

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
      setDebugInfo('Connexion à Agora...');
      
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
        setDebugInfo(`Connecté au canal: ${channel}`);
        
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
      setDebugInfo(`Erreur Agora: ${error.message}`);
      setCallStatus('idle');
      agoraStartedRef.current = false;
      handleEndCall();
    }
  };

 const endCall = async () => {
  console.log("📞 Fin de l'appel demandée");

  clearInterval(callTimerRef.current);
  setDebugInfo("Fin de l'appel...");

  // 🔒 Empêche tout redémarrage Agora
  agoraStartedRef.current = false;

  // ❗️NE PAS quitter la room ici
  // ❗️NE PAS calculer recipientId
  // ❗️NE PAS envoyer leave-call-room

  // ✅ UN SEUL EVENT → le serveur gère tout
  socketService.socket?.emit("end-call");

  // 🔌 Quitter Agora localement
  await agoraService.leaveChannel();

  // 🧹 Nettoyage UI
  handleEndCall();
};


  const handleEndCall = () => {
    setIsCallActive(false);
    setIsCalling(false);
    setCallStatus('ended');
    setCallDuration(0);
    setIsScreenSharing(false);
    setDebugInfo('Appel terminé');
    
    setTimeout(() => {
      if (clearActiveCall) {
        clearActiveCall();
      }
      if (onClose) onClose();
    }, 300);
  };

  const toggleMicrophone = async () => {
    const newState = !isMuted;
    setIsMuted(newState);
    setDebugInfo(`Micro ${newState ? 'désactivé' : 'activé'}`);
    await agoraService.toggleMicrophone(!newState);
  };

  const toggleCamera = async () => {
    if (isAudioCall) {
      alert('L\'appel audio ne prend pas en charge la caméra');
      return;
    }
    const newState = !isVideoOff;
    setIsVideoOff(newState);
    setDebugInfo(`Caméra ${newState ? 'désactivée' : 'activée'}`);
    await agoraService.toggleCamera(!newState);
  };

  const upgradeToVideo = async () => {
    console.log("🎥 Activation de la caméra...");
    
    setIsUpgradingToVideo(true);
    setDebugInfo('Activation de la caméra...');
    
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
      setDebugInfo('Appel audio mis à niveau en vidéo !');
      
      console.log('✅ Appel audio mis à jour en vidéo avec succès');
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'activation de la caméra:', error);
      setDebugInfo(`Erreur caméra: ${error.message}`);
      
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

        setDebugInfo("Partage d'écran activé");
      } else {
        await agoraService.stopScreenShare();
        setIsScreenSharing(false);

        socketService.socket.emit("screen-share-stopped", {
          channelName: channelNameRef.current,
        });

        setDebugInfo("Partage d'écran arrêté");
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
              onClick={endCall}
              title="Terminer l\'appel"
              disabled={isUpgradingToVideo}
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
                onClick={endCall}
                title="Terminer l\'appel"
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
            <p className="debug-info">En attente d\'acceptation...</p>
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

  return (
    <div className="video-call-screen init-screen">
      <div className="call-init-container">
        <div className="user-info">
          <div className="user-avatar-large">
            {callChat?.participants?.[0]?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <h3>{callChat?.participants?.[0]?.username || 'Utilisateur'}</h3>
          <p>Prêt pour un appel {currentCallType === 'audio' ? 'audio' : 'vidéo'} ?</p>
        </div>
        
        <div className="init-controls">
          <button className="btn-start-call" onClick={startOutgoingCall}>
            {currentCallType === 'audio' ? (
              <>
                <Phone size={24} />
                <span>Démarrer l\'appel audio</span>
              </>
            ) : (
              <>
                <Video size={24} />
                <span>Démarrer l\'appel vidéo</span>
              </>
            )}
          </button>
          
          <button className="btn-close" onClick={onClose}>
            Annuler
          </button>
        </div>
        
        <div className="permissions-note">
          <p>Assurez-vous d\'avoir autorisé l\'accès au micro{currentCallType === 'video' ? ' et à la caméra' : ''}</p>
        </div>
      </div>
    </div>
  );
};

export default VideoCallScreen;