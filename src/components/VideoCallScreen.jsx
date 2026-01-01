import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, Video, VideoOff, Phone, Settings } from 'lucide-react';
import agoraService from '../services/agoraService';
import socketService from '../services/socketService';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import './VideoCallScreen.css';

const VideoCallScreen = ({ selectedChat, onClose }) => {
  const { user } = useAuth();
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [isCalling, setIsCalling] = useState(false);
  const [callStatus, setCallStatus] = useState('idle'); // idle, calling, ringing, in-call, ended
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');
  
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef({});
  const callTimerRef = useRef(null);
  const channelNameRef = useRef(`call_${selectedChat?._id}_${Date.now()}`);

  // Initialiser Agora et écouter les événements
  useEffect(() => {
    agoraService.initializeClient();
    
    // Configuration des callbacks pour les vidéos distantes
    agoraService.onRemoteVideoAdded = (uid, videoTrack) => {
      console.log(`📹 [CALLBACK] Vidéo distante ajoutée: ${uid}`);
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

    // Écouter les événements d'appel
    socket.on('incoming-video-call', (data) => {
      console.log('📞 Appel entrant reçu:', data);
      if (data.chatId === selectedChat?._id) {
        setIncomingCallData(data);
        setCallStatus('ringing');
        setDebugInfo('Appel entrant détecté');
      }
    });

    socket.on('video-call-accepted', (data) => {
      console.log('✅ Appel accepté:', data);
      setDebugInfo('Appel accepté par le destinataire');
      if (data.channelName === channelNameRef.current) {
        fetchTokenAndStartCall(channelNameRef.current);
      }
    });

    socket.on('video-call-rejected', (data) => {
      console.log('❌ Appel refusé:', data);
      setCallStatus('rejected');
      setDebugInfo('Appel refusé');
      alert(`L'appel a été refusé: ${data.reason || 'Par l\'utilisateur'}`);
      setIsCalling(false);
    });

    socket.on('video-call-ended', (data) => {
      console.log('📞 Appel terminé:', data);
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
      }
      clearInterval(callTimerRef.current);
    };
  }, [selectedChat]);

  // Mettre à jour la vidéo locale
  useEffect(() => {
    if (agoraService.localVideoTrack && localVideoRef.current) {
      console.log('🎬 Lecture vidéo locale');
      agoraService.localVideoTrack.play(localVideoRef.current);
      setDebugInfo('Vidéo locale active');
    }
  }, [isCallActive, agoraService.localVideoTrack]);

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
      }
    };
    
    testSocket();
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
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      console.log('✅ Socket prêt, émission événement...');
      
      const callData = {
        chatId: selectedChat._id,
        channelName: channelName,
        callerId: currentUserId,
        callerName: user.username || 'Utilisateur',
        recipientId: otherParticipant._id || otherParticipant.id
      };
      
      socketService.socket.emit('initiate-video-call', callData);
      setDebugInfo('Appel émis, en attente...');
      
      console.log('📤 Événement envoyé:', callData);
      
      // Timeout pour réponse
      setTimeout(() => {
        if (callStatus === 'calling') {
          console.log('⏰ Timeout: Appel non répondu');
          setDebugInfo('Appel non répondu (timeout)');
          alert('L\'appel n\'a pas été répondu');
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
      
      socketService.socket.emit('accept-video-call', {
        channelName: incomingCallData.channelName,
        callerId: incomingCallData.callerId,
        callerSocketId: incomingCallData.callerSocketId
      });
      
      channelNameRef.current = incomingCallData.channelName;
      
      await fetchTokenAndStartCall(incomingCallData.channelName);
      
      setIncomingCallData(null);
      stopRingtone();
      
    } catch (error) {
      console.error('Erreur acceptation appel:', error);
      setDebugInfo(`Erreur acceptation: ${error.message}`);
      setCallStatus('idle');
    }
  };

  // Refuser un appel entrant
  const rejectIncomingCall = () => {
    if (!incomingCallData) return;
    
    socketService.socket.emit('reject-video-call', {
      channelName: incomingCallData.channelName,
      callerId: incomingCallData.callerId,
      callerSocketId: incomingCallData.callerSocketId,
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
    }
  };

  // Terminer l'appel
  const endCall = async () => {
    clearInterval(callTimerRef.current);
    setDebugInfo('Fin de l\'appel...');
    
    socketService.socket.emit('leave-call-room', channelNameRef.current);
    
    const recipientId = selectedChat?.participants?.[0]?._id;
    if (recipientId) {
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

  // Jouer une sonnerie
  const playRingtone = () => {
    console.log('🔔 Sonnerie jouée');
  };

  // Arrêter la sonnerie
  const stopRingtone = () => {
    console.log('🔕 Sonnerie arrêtée');
  };

  // Formater la durée
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Rendu de l'appel entrant (modal)
  if (callStatus === 'ringing' && incomingCallData) {
    return (
      <div className="video-call-screen ringing-screen">
        <div className="ringing-container">
          <div className="ringing-avatar">
            {incomingCallData.callerName?.charAt(0).toUpperCase() || 'U'}
          </div>
          
          <div className="ringing-info">
            <h3>Appel entrant</h3>
            <p>{incomingCallData.callerName} vous appelle</p>
          </div>
          
          <div className="ringing-controls">
            <button className="btn-accept-call" onClick={acceptIncomingCall}>
              <Phone size={24} />
              <span>Accepter</span>
            </button>
            
            <button className="btn-reject-call" onClick={rejectIncomingCall}>
              <X size={24} />
              <span>Refuser</span>
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

  // Rendu de l'appel en cours
  if (isCallActive) {
    return (
      <div className="video-call-screen">
        <div className="video-call-container">
          {/* Vidéo distante (plein écran) */}
          <div className="remote-video-container">
            {remoteStreams.length > 0 ? (
              remoteStreams.map(stream => (
                <div key={stream.uid} className="remote-video-wrapper">
                  <div
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
                  />
                  {!stream.hasVideo && (
                    <div className="no-video-placeholder">
                      <div className="user-avatar">
                        {selectedChat.participants[0]?.username?.charAt(0).toUpperCase()}
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

          {/* Vidéo locale (picture-in-picture) */}
          <div className="local-video-pip">
            <div ref={localVideoRef} className="local-video" />
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