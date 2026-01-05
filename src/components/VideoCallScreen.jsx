import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, Video, VideoOff, Phone } from 'lucide-react';
import agoraService from '../services/agoraService';
import socketService from '../services/socketService';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { useCall } from '../context/CallContext';
import './VideoCallScreen.css';

const VideoCallScreen = ({ selectedChat, onClose }) => {
  console.log("🧩 VideoCallScreen RENDER");
  
  const { user } = useAuth();
  const { acceptedCall, clearActiveCall } = useCall();
  
  const callChat = selectedChat || (acceptedCall?.chatId ? { _id: acceptedCall.chatId } : null);
  
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [isCalling, setIsCalling] = useState(false);
  const [callStatus, setCallStatus] = useState('idle');
  const [debugInfo, setDebugInfo] = useState('');
  
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef({});
  const callTimerRef = useRef(null);
  const channelNameRef = useRef(callChat?._id ? `call_${callChat._id}` : null);
  
  // ✅ 1️⃣ UN SEUL POINT D'ENTRÉE AGORA
  const agoraStartedRef = useRef(false);
  
  // ✅ 2️⃣ FONCTION SAFE - UNE SEULE FOIS
  const startAgoraOnce = async (channelName) => {
    if (agoraStartedRef.current) {
      console.warn("⚠️ Agora déjà lancé, skip");
      return;
    }

    agoraStartedRef.current = true;
    await fetchTokenAndStartCall(channelName);
  };

  // ✅ 3️⃣ RECEVEUR - Un seul useEffect
  useEffect(() => {
    if (!acceptedCall) return;

    console.log("📥 RECEVEUR : acceptedCall détecté, démarrage Agora");

    const channel = acceptedCall.channelName;
    if (!channel) {
      console.error("❌ channelName manquant côté receveur");
      return;
    }

    startAgoraOnce(channel);
  }, [acceptedCall]);

  // Initialiser les événements Agora et socket
  useEffect(() => {
    // Callbacks Agora
    agoraService.onRemoteVideoAdded = (uid, videoTrack) => {
      console.log(`📹 [CALLBACK] Vidéo distante ajoutée: ${uid}`);
      setDebugInfo(`Vidéo distante ${uid} reçue`);
      
      setRemoteStreams(prev => {
        const exists = prev.find(s => s.uid === uid);
        if (exists) {
          return prev.map(s => 
            s.uid === uid ? { ...s, hasVideo: true, videoTrack } : s
          );
        }
        return [...prev, { uid, hasVideo: true, hasAudio: true, videoTrack }];
      });
      
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
        }
      }, 100);
    };
    
    agoraService.onRemoteVideoRemoved = (uid) => {
      console.log(`📹 [CALLBACK] Vidéo distante retirée: ${uid}`);
      setRemoteStreams(prev => prev.filter(s => s.uid !== uid));
    };
    
    // Événements socket
    const socket = socketService.socket;
    if (!socket) {
      console.warn('⚠️ Socket non disponible');
      return;
    }

    // ✅ 4️⃣ APPELANT - UN SEUL POINT D'ENTRÉE
    socket.on('video-call-accepted', (data) => {
      console.log('✅ Appel accepté par le destinataire:', data);
      setDebugInfo('Appel accepté par le destinataire');
      
      const targetChannel = data.channelName || channelNameRef.current;
      
      if (!targetChannel) {
        console.error('❌ Channel name manquant dans video-call-accepted');
        setDebugInfo('Erreur: Channel manquant');
        return;
      }
      
      console.log('🚀 APPELANT: Démarrage Agora via video-call-accepted');
      startAgoraOnce(targetChannel);
    });

    socket.on('video-call-rejected', (data) => {
      console.log('❌ Appel refusé:', data);
      setCallStatus('rejected');
      setDebugInfo('Appel refusé');
      alert(`L'appel a été refusé: ${data.reason || 'Par l\'utilisateur'}`);
      setIsCalling(false);
      handleEndCall();
    });

    socket.on('video-call-ended', (data) => {
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
      
      if (data.code === 'CALLER_OFFLINE') {
        console.log('⚠️ L\'appelant semble déconnecté, tentative de reconnexion...');
        setTimeout(() => {
          if (isCalling) {
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
      handleEndCall();
    });

    socket.on('connect', () => {
      console.log('✅ Socket reconnecté');
      setDebugInfo('Connexion rétablie');
    });

    // Nettoyage
    return () => {
      agoraService.onRemoteVideoAdded = null;
      agoraService.onRemoteVideoRemoved = null;
      
      if (socket) {
        socket.off('video-call-accepted');
        socket.off('video-call-rejected');
        socket.off('video-call-ended');
        socket.off('call-initiated');
        socket.off('call-error');
        socket.off('connect');
      }
      clearInterval(callTimerRef.current);
    };
  }, []);

  // Mettre à jour la vidéo locale
  useEffect(() => {
    if (agoraService.localVideoTrack && localVideoRef.current) {
      console.log('🎬 Lecture vidéo locale');
      agoraService.localVideoTrack.play(localVideoRef.current);
      setDebugInfo('Vidéo locale active');
    }
  }, [isCallActive]);

  // Forcer la lecture des vidéos distantes
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
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    };
    
    testSocket();
  }, []);

  const startOutgoingCall = async () => {
    console.log('🔍 === DÉBUT startOutgoingCall ===');
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
      otherUsername: otherParticipant.username
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
        type: 'video',
        callerSocketId: socketService.socket.id
      };
      
      socketService.socket.emit('initiate-video-call', callData);
      setDebugInfo('Appel émis, en attente d\'acceptation...');
      
      console.log('📤 Événement envoyé:', callData);
      console.log('⏳ Attente de video-call-accepted pour démarrer Agora...');
      
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
    
    console.log('🔚 === FIN startOutgoingCall ===');
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
        console.error('Détails erreur:', error.response.data);
        
        if (error.response.status === 404) {
          alert(`Backend non disponible sur le port 5000`);
        } else if (error.response.status === 401) {
          alert('Token expiré. Veuillez vous reconnecter.');
        }
      }
      
      alert(`Erreur de connexion à l'appel: ${error.message}`);
      setCallStatus('idle');
      
      // Réinitialiser le flag en cas d'erreur
      agoraStartedRef.current = false;
      handleEndCall();
    }
  };

  const startAgoraCall = async (token, channel, uid) => {
    console.log("🧪 START AGORA CALL", {
      channel,
      uid
    });

    if (isCallActive) {
      console.warn("⚠️ Agora déjà actif, abort startAgoraCall");
      return;
    }
    
    try {
      console.log('🚀 Démarrage appel Agora:', { channel, uid });
      setDebugInfo('Connexion à Agora...');
      
      const result = await agoraService.joinChannel(channel, token, uid);
      
      if (result.success) {
        setIsCallActive(true);
        setCallStatus('in-call');
        setIsCalling(false);
        setDebugInfo(`Connecté au canal: ${channel}`);
        
        console.log('📊 État Agora après connexion:', {
          channel: channel,
          localVideo: !!agoraService.localVideoTrack,
          localAudio: !!agoraService.localAudioTrack,
          remoteUsers: Array.from(agoraService.remoteUsers.entries())
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
      
      // Réinitialiser le flag en cas d'erreur
      agoraStartedRef.current = false;
      handleEndCall();
    }
  };

  const endCall = async () => {
    console.log('📞 Fin de l\'appel demandée');
    clearInterval(callTimerRef.current);
    setDebugInfo('Fin de l\'appel...');
    
    // Réinitialiser le flag pour le prochain appel
    agoraStartedRef.current = false;
    
    if (channelNameRef.current) {
      socketService.socket.emit('leave-call-room', channelNameRef.current);
      
      const recipientId = callChat?.participants?.find?.(
        p => (p._id || p.id) !== (user._id || user.id)
      )?._id;
      
      if (recipientId) {
        socketService.socket.emit('end-video-call', {
          channelName: channelNameRef.current,
          recipientIds: [recipientId]
        });
      }
    }

    await agoraService.leaveChannel();
    
    handleEndCall();
  };

  const handleEndCall = () => {
    setIsCallActive(false);
    setIsCalling(false);
    setCallStatus('ended');
    setCallDuration(0);
    setRemoteStreams([]);
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
    const newState = !isVideoOff;
    setIsVideoOff(newState);
    setDebugInfo(`Caméra ${newState ? 'désactivée' : 'activée'}`);
    await agoraService.toggleCamera(!newState);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isCallActive) {
    return (
      <div className="video-call-screen">
        <div className="video-call-container">
          <div className="remote-video-container">
            {remoteStreams.length > 0 ? (
              remoteStreams.map(stream => (
                <div key={stream.uid} className="remote-video-wrapper">
                  <div
                    ref={el => {
                      remoteVideoRefs.current[stream.uid] = el;
                      
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
                  />
                  {!stream.hasVideo && (
                    <div className="no-video-placeholder">
                      <div className="user-avatar">
                        {callChat?.participants?.[0]?.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <p>Pas de vidéo</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="waiting-for-connection">
                <div className="spinner"></div>
                <p>En attente de connexion...</p>
                <p className="debug-info">{debugInfo}</p>
              </div>
            )}
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
              
              <button 
                className="control-btn btn-end-call"
                onClick={endCall}
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
            <h3>Appel en cours...</h3>
            <p>Appel de {callChat?.participants?.[0]?.username || 'Utilisateur'}</p>
            <p className="debug-info">{debugInfo}</p>
            <p className="debug-info">En attente d'acceptation...</p>
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