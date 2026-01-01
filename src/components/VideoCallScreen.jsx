import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, Video, VideoOff, Phone, Settings } from 'lucide-react';
import agoraService from '../services/agoraService';
import socketService from '../services/socketService';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import './VideoCallScreen.css';
import '../utils/socketHelper'

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
  
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef({});
  const callTimerRef = useRef(null);
  const channelNameRef = useRef(`call_${selectedChat?._id}_${Date.now()}`);

  // Initialiser Agora
  useEffect(() => {
    agoraService.initializeClient();
    
    const socket = socketService.socket;
    if (!socket) return;

    // 🆕 Écouter les événements d'appel (noms d'événements CORRIGÉS)
    socket.on('incoming-video-call', (data) => {
      console.log('📞 Appel entrant reçu:', data);
      if (data.chatId === selectedChat?._id) {
        setIncomingCallData(data);
        setCallStatus('ringing');
      }
    });

    // 🆕 Appel accepté (nouveau nom d'événement)
    socket.on('video-call-accepted', (data) => {
      console.log('✅ Appel accepté:', data);
      if (data.channelName === channelNameRef.current) {
        // Récupérer le token et démarrer Agora
        fetchTokenAndStartCall(channelNameRef.current);
      }
    });
  

    // 🆕 Appel refusé (nouveau nom d'événement)
    socket.on('video-call-rejected', (data) => {
      console.log('❌ Appel refusé:', data);
      setCallStatus('rejected');
      alert(`L'appel a été refusé: ${data.reason || 'Par l\'utilisateur'}`);
      setIsCalling(false);
    });

    // 🆕 Appel terminé (nouveau nom d'événement)
    socket.on('video-call-ended', (data) => {
      console.log('📞 Appel terminé:', data);
      if (data.channelName === channelNameRef.current) {
        handleEndCall();
      }
    });

    // 🆕 Confirmation que l'appel a été initié
    socket.on('call-initiated', (data) => {
      console.log('📞 Appel initié avec succès:', data);
      // L'appel est en attente de réponse
      setCallStatus('calling');
    });

    // 🆕 Erreur d'appel
    socket.on('call-error', (data) => {
      console.error('💥 Erreur appel:', data);
      alert(`Erreur: ${data.error}`);
      setIsCalling(false);
      setCallStatus('idle');
    });

    return () => {
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
      agoraService.localVideoTrack.play(localVideoRef.current);
    }
  }, [isCallActive]);
  useEffect(() => {
  // Debug socket au chargement
  console.log('🔍 VideoCallScreen monté - Socket état:', {
    socketService: socketService,
    socket: socketService.socket,
    connected: socketService.socket?.connected,
    socketId: socketService.socket?.id,
    userToken: localStorage.getItem('token') ? '✅' : '❌'
  });
  
  // Test de connexion
  const testSocket = async () => {
    const token = localStorage.getItem('token');
    if (token && (!socketService.socket || !socketService.socket.connected)) {
      console.log('🔄 Tentative de connexion socket...');
      socketService.connect(token);
    }
  };
  
  testSocket();
}, []);

  // Mettre à jour les vidéos distantes
  useEffect(() => {
    Object.keys(remoteVideoRefs.current).forEach(uid => {
      const userData = agoraService.remoteUsers.get(parseInt(uid));
      if (userData?.videoTrack && remoteVideoRefs.current[uid]) {
        userData.videoTrack.play(remoteVideoRefs.current[uid]);
      }
    });
  }, [remoteStreams]);

  // 🆕 Gérer un appel entrant (avec modal améliorée)
  const handleIncomingCall = (data) => {
    setIncomingCallData(data);
    setCallStatus('ringing');
    
    // Jouer une sonnerie
    playRingtone();
  };

  // 🆕 Accepter un appel entrant
  const acceptIncomingCall = async () => {
    if (!incomingCallData) return;
    
    try {
      setCallStatus('connecting');
      
      // Émettre l'acceptation via Socket
      socketService.socket.emit('accept-video-call', {
        channelName: incomingCallData.channelName,
        callerId: incomingCallData.callerId,
        callerSocketId: incomingCallData.callerSocketId
      });
      
      // Mettre à jour le channel pour cet appel
      channelNameRef.current = incomingCallData.channelName;
      
      // Récupérer le token et démarrer Agora
      await fetchTokenAndStartCall(incomingCallData.channelName);
      
      setIncomingCallData(null);
      stopRingtone();
      
    } catch (error) {
      console.error('Erreur acceptation appel:', error);
      setCallStatus('idle');
    }
  };

  // 🆕 Refuser un appel entrant
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
    stopRingtone();
  };

  // 🆕 Démarrer un appel sortant (corrigé)
const startOutgoingCall = async () => {
  console.log('🔍 === DÉBUT startOutgoingCall ===');
  
  // 1. Vérifications de base
  if (!selectedChat?.participants || selectedChat.participants.length < 2) {
    alert('Conversation invalide');
    return;
  }
  
  const currentUserId = user._id || user.id;
  
  // 2. Trouver l'autre participant
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
    // 3. Importer le helper (faites-le en haut du fichier)
    const SocketHelper = (await import('../utils/socketHelper')).default;
    
    // 4. Garantir la connexion socket
    console.log('🔌 Vérification connexion socket...');
    await SocketHelper.ensureConnection();
    
    console.log('✅ Socket prêt, émission événement...');
    
    // 5. Émettre l'événement avec gestion d'erreur
    const callData = {
      chatId: selectedChat._id,
      channelName: channelName,
      callerId: currentUserId,
      callerName: user.username,
      recipientId: otherParticipant._id || otherParticipant.id
    };
    
    // Émission simple (sans callback)
    socketService.socket.emit('initiate-video-call', callData);
    
    console.log('📤 Événement envoyé:', callData);
    
    // 6. Timeout pour réponse
    setTimeout(() => {
      if (callStatus === 'calling') {
        console.log('⏰ Timeout: Appel non répondu');
        alert('L\'appel n\'a pas été répondu');
        setIsCalling(false);
        setCallStatus('ended');
      }
    }, 30000);
    
  } catch (error) {
    console.error('💥 Erreur connexion socket:', error);
    alert(`Erreur de connexion: ${error.message}`);
    setIsCalling(false);
    setCallStatus('idle');
  }
  
  console.log('🔚 === FIN startOutgoingCall ===');
};
  // 🆕 Fonction pour récupérer token et démarrer Agora
  const fetchTokenAndStartCall = async (channel) => {
  try {
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
    
    if (response.data.success) {
      await startAgoraCall(
  response.data.token,
  channel,
  response.data.uid // ✅ PAS user._id
);

    } else {
      throw new Error(response.data.error || 'Erreur génération token');
    }
  } catch (error) {
    console.error('❌ Erreur token Agora:', error);
    
    // Message d'erreur plus utile
    if (error.response) {
      console.error('Détails erreur:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config.url
      });
      
      if (error.response.status === 404) {
        alert(`Route non trouvée: ${error.config.url}\nVérifiez que le backend tourne sur le port 5000.`);
      } else if (error.response.status === 401) {
        alert('Token expiré. Veuillez vous reconnecter.');
      }
    }
    
    alert(`Erreur de connexion à l'appel: ${error.message}`);
    setCallStatus('idle');
  }
};

  // 🆕 Démarrer l'appel Agora
  const startAgoraCall = async (token, channel, uid) => {
    try {
      const result = await agoraService.joinChannel(channel, token,  uid);
      
      if (result.success) {
        setIsCallActive(true);
        setCallStatus('in-call');
        setIsCalling(false);
        
        // Rejoindre la room Socket pour ce canal
        socketService.socket.emit('join-call-room', channel);
        
        // Démarrer le timer de durée d'appel
        callTimerRef.current = setInterval(() => {
          setCallDuration(prev => prev + 1);
        }, 1000);
        
        // Mettre à jour les streams distants
        updateRemoteStreams();
        
        console.log('✅ Appel Agora démarré avec succès');
      }
    } catch (error) {
      console.error('Erreur démarrage Agora:', error);
      setCallStatus('idle');
    }
  };

  // Mettre à jour les streams distants
  const updateRemoteStreams = () => {
    const streams = Array.from(agoraService.remoteUsers.entries()).map(([uid, data]) => ({
      uid,
      hasVideo: !!data.videoTrack,
      hasAudio: !!data.audioTrack,
    }));
    setRemoteStreams(streams);
  };

  // 🆕 Terminer l'appel (corrigé)
  const endCall = async () => {
    clearInterval(callTimerRef.current);
    
    // Quitter la room Socket
    socketService.socket.emit('leave-call-room', channelNameRef.current);
    
    // Notifier l'autre participant
    const recipientId = selectedChat?.participants?.[0]?._id;
    if (recipientId) {
      socketService.socket.emit('end-video-call', {
        channelName: channelNameRef.current,
        recipientIds: [recipientId]
      });
    }

    // Quitter le canal Agora
    await agoraService.leaveChannel();
    
    // Réinitialiser les états
    handleEndCall();
  };

  // 🆕 Gestion de fin d'appel
  const handleEndCall = () => {
    setIsCallActive(false);
    setIsCalling(false);
    setCallStatus('ended');
    setCallDuration(0);
    setRemoteStreams([]);
    setIncomingCallData(null);
    
    // Fermer après un délai
    setTimeout(() => {
      if (onClose) onClose();
    }, 2000);
  };

  // Basculer micro
  const toggleMicrophone = async () => {
    const newState = !isMuted;
    setIsMuted(newState);
    await agoraService.toggleMicrophone(!newState);
  };

  // Basculer caméra
  const toggleCamera = async () => {
    const newState = !isVideoOff;
    setIsVideoOff(newState);
    await agoraService.toggleCamera(!newState);
  };

  // 🆕 Jouer une sonnerie
  const playRingtone = () => {
    // Implémentez une sonnerie si nécessaire
    console.log('🔔 Sonnerie jouée');
  };

  // 🆕 Arrêter la sonnerie
  const stopRingtone = () => {
    console.log('🔕 Sonnerie arrêtée');
  };

  // Formater la durée
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 🆕 Rendu de l'appel entrant (modal)
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
            {remoteStreams.map(stream => (
              <div key={stream.uid} className="remote-video-wrapper">
                <div
                  ref={el => remoteVideoRefs.current[stream.uid] = el}
                  className="remote-video"
                />
                {!stream.hasVideo && (
                  <div className="no-video-placeholder">
                    <div className="user-avatar">
                      {selectedChat.participants[0]?.username?.charAt(0).toUpperCase()}
                    </div>
                  </div>
                )}
              </div>
            ))}
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
            <div className="call-duration">
              {formatDuration(callDuration)}
            </div>
            
            <div className="control-buttons">
              <button 
                className={`control-btn ${isMuted ? 'btn-active' : ''}`}
                onClick={toggleMicrophone}
              >
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              
              <button 
                className={`control-btn ${isVideoOff ? 'btn-active' : ''}`}
                onClick={toggleCamera}
              >
                {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
              </button>
              
              <button 
                className="control-btn btn-end-call"
                onClick={endCall}
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