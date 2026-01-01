import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, Phone, Volume2, VolumeX, User } from 'lucide-react';
import agoraService from '../services/agoraService';
import socketService from '../services/socketService';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import './AudioCallScreen.css';

const AudioCallScreen = ({ selectedChat, onClose, incomingCallData: propIncomingCallData }) => {
  const { user } = useAuth();
  
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isCalling, setIsCalling] = useState(false);
  const [callStatus, setCallStatus] = useState('idle'); // idle, calling, ringing, in-call, ended
  const [incomingCallData, setIncomingCallData] = useState(propIncomingCallData || null);
  const [debugInfo, setDebugInfo] = useState('');
  
  const callTimerRef = useRef(null);
  const channelNameRef = useRef(`audio_call_${selectedChat?._id}_${Date.now()}`);
  const ringtoneAudioRef = useRef(null);

  // 🔥 CRITIQUE: Initialiser directement avec les données d'appel
  useEffect(() => {
    console.log('🎧 [AudioCallScreen] Initialisation avec prop:', propIncomingCallData);
    
    if (propIncomingCallData) {
      console.log('✅ Données d\'appel reçues, initialisation immédiate');
      setIncomingCallData(propIncomingCallData);
      
      // Si c'est un appel entrant (l'autre personne nous appelle)
      const currentUserId = user._id || user.id;
      if (propIncomingCallData.callerId !== currentUserId) {
        console.log('📞 Appel entrant détecté, mode "ringing" activé');
        setCallStatus('ringing');
        playRingtone();
      } else {
        // Si c'est nous qui avons initié l'appel
        console.log('📞 Appel sortant détecté');
        setCallStatus('calling');
      }
    }
  }, [propIncomingCallData, user._id, user.id]);

  // 🔥 NOUVEAU: Effet pour démarrer automatiquement quand on accepte
  useEffect(() => {
    console.log('🔄 [AudioCallScreen] Effet callStatus:', callStatus);
    
    // Si on vient d'accepter un appel (état 'connecting')
    if (callStatus === 'connecting' && incomingCallData) {
      console.log('🚀 Démarrage automatique de l\'appel accepté');
      
      const startAcceptedCall = async () => {
        try {
          // Émettre l'acceptation via socket
          if (socketService.socket) {
            socketService.socket.emit('accept-audio-call', {
              channelName: incomingCallData.channelName,
              callerId: incomingCallData.callerId,
              callerSocketId: incomingCallData.callerSocketId,
              recipientId: user._id || user.id,
              recipientName: user.username || 'Utilisateur',
              chatId: incomingCallData.chatId
            });
          }
          
          // Démarrer l'appel Agora
          channelNameRef.current = incomingCallData.channelName;
          await fetchTokenAndStartCall(incomingCallData.channelName);
          stopRingtone();
          
        } catch (error) {
          console.error('❌ Erreur démarrage appel accepté:', error);
          setCallStatus('idle');
          stopRingtone();
        }
      };
      
      startAcceptedCall();
    }
  }, [callStatus, incomingCallData]);

  // Gérer l'appel entrant audio depuis socket
  useEffect(() => {
    const socket = socketService.socket;
    if (!socket) {
      console.warn('⚠️ Socket non disponible');
      return;
    }

    // Écouter les événements d'appel audio
    socket.on('incoming-audio-call', (data) => {
      console.log('📞 [AudioCallScreen] Appel audio entrant reçu:', data);
      
      // Si on est déjà en appel, ignorer
      if (isCallActive || callStatus === 'in-call') {
        console.log('⚠️ Déjà en appel, nouvel appel ignoré');
        return;
      }
      
      setIncomingCallData(data);
      setCallStatus('ringing');
      setDebugInfo('Appel audio entrant');
      playRingtone();
    });

    socket.on('audio-call-accepted', (data) => {
      console.log('✅ [AudioCallScreen] Appel audio accepté:', data);
      setDebugInfo('Appel accepté par le destinataire');
      
      // Si c'est nous qui avons initié l'appel
      if (callStatus === 'calling') {
        const targetChannel = data.channelName || channelNameRef.current;
        fetchTokenAndStartCall(targetChannel);
      }
    });

    socket.on('audio-call-rejected', (data) => {
      console.log('❌ [AudioCallScreen] Appel audio refusé:', data);
      setCallStatus('rejected');
      setDebugInfo('Appel refusé');
      alert(`L'appel audio a été refusé: ${data.reason || 'Par l\'utilisateur'}`);
      setIsCalling(false);
      stopRingtone();
    });

    socket.on('audio-call-ended', (data) => {
      console.log('📞 [AudioCallScreen] Appel audio terminé:', data);
      const targetChannel = data.channelName || channelNameRef.current;
      if (data.channelName === targetChannel) {
        handleEndCall();
      }
    });

    socket.on('audio-call-initiated', (data) => {
      console.log('📞 [AudioCallScreen] Appel audio initié:', data);
      setCallStatus('calling');
      setDebugInfo('Appel initié, en attente de réponse...');
    });

    socket.on('audio-call-error', (data) => {
      console.error('💥 [AudioCallScreen] Erreur appel audio:', data);
      setDebugInfo(`Erreur: ${data.error}`);
      alert(`Erreur appel audio: ${data.error}`);
      setIsCalling(false);
      setCallStatus('idle');
      stopRingtone();
    });

    return () => {
      if (socket) {
        socket.off('incoming-audio-call');
        socket.off('audio-call-accepted');
        socket.off('audio-call-rejected');
        socket.off('audio-call-ended');
        socket.off('audio-call-initiated');
        socket.off('audio-call-error');
      }
      clearInterval(callTimerRef.current);
      stopRingtone();
    };
  }, [selectedChat, isCallActive, callStatus]);

  // Initialiser Agora pour audio seulement
  useEffect(() => {
    console.log('🔧 [AudioCallScreen] Initialisation Agora pour audio');
    agoraService.initializeClient();
  }, []);

  // Démarrer un appel audio sortant
  const startOutgoingCall = async () => {
    console.log('🔊 === DÉMARRAGE APPEL AUDIO ===');
    
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
    
    console.log('🎯 Appel audio à:', {
      currentUser: currentUserId,
      otherUser: otherParticipant._id || otherParticipant.id,
      otherUsername: otherParticipant.username
    });
    
    setIsCalling(true);
    setCallStatus('calling');
    
    const channelName = `audio_call_${selectedChat._id}_${Date.now()}`;
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
      
      console.log('✅ Socket prêt, émission événement audio...');
      
      const callData = {
        chatId: selectedChat._id,
        channelName: channelName,
        callerId: currentUserId,
        callerName: user.username || 'Utilisateur',
        recipientId: otherParticipant._id || otherParticipant.id,
        recipientName: otherParticipant.username || 'Utilisateur',
        timestamp: Date.now(),
        type: 'audio',
        callerSocketId: socketService.socket.id
      };
      
      socketService.socket.emit('initiate-audio-call', callData);
      setDebugInfo('Appel audio émis, en attente...');
      
      console.log('📤 Événement audio envoyé:', callData);
      
      // Timeout pour réponse
      setTimeout(() => {
        if (callStatus === 'calling') {
          console.log('⏰ Timeout: Appel audio non répondu');
          setDebugInfo('Appel non répondu (timeout)');
          alert('L\'appel audio n\'a pas été répondu');
          setIsCalling(false);
          setCallStatus('ended');
        }
      }, 30000);
      
    } catch (error) {
      console.error('💥 Erreur démarrage appel audio:', error);
      setDebugInfo(`Erreur: ${error.message}`);
      alert(`Erreur: ${error.message}`);
      setIsCalling(false);
      setCallStatus('idle');
    }
  };

  // Accepter un appel audio entrant
  const acceptIncomingCall = async () => {
    if (!incomingCallData) return;
    
    console.log('✅ [AudioCallScreen] Acceptation appel entrant');
    
    try {
      setCallStatus('connecting');
      setDebugInfo('Acceptation appel audio...');
      stopRingtone();
      
    } catch (error) {
      console.error('Erreur acceptation appel audio:', error);
      setDebugInfo(`Erreur: ${error.message}`);
      setCallStatus('idle');
      stopRingtone();
    }
  };

  // Refuser un appel audio entrant
  const rejectIncomingCall = () => {
    if (!incomingCallData) return;
    
    socketService.socket.emit('reject-audio-call', {
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
    
    // Fermer l'écran
    if (onClose) {
      setTimeout(() => onClose(), 500);
    }
  };

  // Récupérer token et démarrer Agora
  const fetchTokenAndStartCall = async (channel) => {
    try {
      setDebugInfo('Connexion audio...');
      
      const response = await axios.post('http://localhost:5000/api/agora/generate-token', {
        channelName: channel,
        uid: user._id || user.id,
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      console.log('✅ Token audio reçu:', response.data);
      
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
      console.error('❌ Erreur token Agora audio:', error);
      setDebugInfo(`Erreur: ${error.message}`);
      alert(`Erreur: ${error.message}`);
      setCallStatus('idle');
      stopRingtone();
    }
  };

  // Démarrer l'appel Agora (audio seulement)
  const startAgoraCall = async (token, channel, uid) => {
    try {
      console.log('🔊 [AudioCallScreen] Démarrage appel Agora audio:', { channel, uid });
      
      let result;
      
      // Vérifie si la méthode joinAudioChannel existe
      if (agoraService.joinAudioChannel) {
        result = await agoraService.joinAudioChannel(channel, token, uid);
      } else {
        // Fallback : utiliser joinChannel avec paramètre audioOnly
        result = await agoraService.joinChannel(channel, token, uid, true);
      }
      
      if (result.success) {
        // DÉSACTIVER LA CAMÉRA pour les appels audio
        if (agoraService.toggleCamera) {
          await agoraService.toggleCamera(false);
        }
        
        setIsCallActive(true);
        setCallStatus('in-call');
        setIsCalling(false);
        setDebugInfo('Connecté au canal audio');
        
        socketService.socket.emit('join-call-room', channel);
        
        // Démarrer le timer
        callTimerRef.current = setInterval(() => {
          setCallDuration(prev => prev + 1);
        }, 1000);
        
        console.log('✅ Appel audio Agora démarré avec succès');
        
        // Debug audio
        if (agoraService.debugAudioStats) {
          setTimeout(() => {
            agoraService.debugAudioStats();
          }, 2000);
        }
        
      } else {
        throw new Error(result.error?.message || 'Échec de connexion Agora');
      }
    } catch (error) {
      console.error('Erreur démarrage Agora audio:', error);
      setDebugInfo(`Erreur Agora: ${error.message}`);
      setCallStatus('idle');
      stopRingtone();
    }
  };

  // Terminer l'appel
  const endCall = async () => {
    clearInterval(callTimerRef.current);
    setDebugInfo('Fin de l\'appel...');
    
    socketService.socket.emit('leave-call-room', channelNameRef.current);
    
    const recipientId = selectedChat?.participants?.[0]?._id;
    if (recipientId) {
      socketService.socket.emit('end-audio-call', {
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

  // Basculer haut-parleur
  const toggleSpeaker = async () => {
    const newState = !isSpeakerOff;
    setIsSpeakerOff(newState);
    setDebugInfo(`Haut-parleur ${newState ? 'désactivé' : 'activé'}`);
    
    if (agoraService.toggleSpeaker) {
      await agoraService.toggleSpeaker(!newState);
    } else {
      console.warn('⚠️ toggleSpeaker non disponible dans agoraService');
    }
  };

  // Jouer une sonnerie
  const playRingtone = () => {
    console.log('🔔 [AudioCallScreen] Sonnerie audio jouée');
    stopRingtone();
    
    try {
      ringtoneAudioRef.current = new Audio('/sounds/ringtone.mp3');
      ringtoneAudioRef.current.loop = true;
      ringtoneAudioRef.current.volume = 0.5;
      
      ringtoneAudioRef.current.play().catch(e => {
        console.log('Sonnerie non jouée:', e);
        generateBeep();
      });
      
    } catch (error) {
      console.log('Erreur sonnerie, génération bip');
      generateBeep();
    }
  };

  // Générer un bip (fallback)
  const generateBeep = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.5);
      
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
      console.log('Génération bip non supportée');
    }
  };

  // Arrêter la sonnerie
  const stopRingtone = () => {
    console.log('🔕 [AudioCallScreen] Sonnerie arrêtée');
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

  // 🔥 CRITIQUE: Logique de rendu CORRECTE
  console.log('🎧 [AudioCallScreen] RENDU - État:', {
    callStatus,
    isCallActive,
    hasIncomingCallData: !!incomingCallData
  });

  // 1. D'abord l'appel en cours
  if (isCallActive) {
    console.log('✅ Rendu: Appel en cours');
    return (
      <div className="audio-call-screen">
        <div className="audio-call-container">
          {/* Avatar ou info de l'appelant */}
          <div className="caller-info">
            <div className="caller-avatar">
              {selectedChat.participants[0]?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <h3>{selectedChat.participants[0]?.username || 'Utilisateur'}</h3>
            <p className="call-type">Appel audio en cours</p>
            <div className="call-duration-display">
              {formatDuration(callDuration)}
            </div>
          </div>

          {/* Contrôles */}
          <div className="audio-controls">
            <div className="control-buttons">
              <button 
                className={`control-btn ${isMuted ? 'btn-active' : ''}`}
                onClick={toggleMicrophone}
                title={isMuted ? 'Activer le micro' : 'Désactiver le micro'}
              >
                {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                <span className="btn-label">{isMuted ? 'Micro coupé' : 'Micro'}</span>
              </button>
              
              <button 
                className={`control-btn ${isSpeakerOff ? 'btn-active' : ''}`}
                onClick={toggleSpeaker}
                title={isSpeakerOff ? 'Activer le haut-parleur' : 'Désactiver le haut-parleur'}
              >
                {isSpeakerOff ? <VolumeX size={24} /> : <Volume2 size={24} />}
                <span className="btn-label">{isSpeakerOff ? 'HP coupé' : 'HP'}</span>
              </button>
              
              <button 
                className="control-btn btn-end-call"
                onClick={endCall}
                title="Terminer l'appel"
              >
                <Phone size={24} />
                <span className="btn-label">Terminer</span>
              </button>
            </div>
          </div>

          {/* Info debug */}
          <div className="debug-info">
            <p>{debugInfo}</p>
          </div>

          {/* Bouton fermer */}
          <button className="close-call-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
      </div>
    );
  }

  // 2. Appel entrant (ringing)
  if (callStatus === 'ringing' && incomingCallData) {
    console.log('✅ Rendu: Écran appel entrant (ringing)');
    return (
      <div className="audio-call-screen ringing-screen">
        <div className="ringing-container">
          <div className="ringing-avatar">
            <User size={48} />
          </div>
          
          <div className="ringing-info">
            <h3>Appel audio entrant</h3>
            <p>{incomingCallData.callerName} vous appelle</p>
            <p className="call-type-badge">📞 Audio</p>
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

  // 3. État de connexion (après acceptation)
  if (callStatus === 'connecting') {
    console.log('✅ Rendu: Écran de connexion');
    return (
      <div className="audio-call-screen connecting-screen">
        <div className="connecting-container">
          <div className="connecting-spinner"></div>
          <h3>Connexion en cours...</h3>
          <p>Veuillez patienter</p>
          <div className="debug-info">{debugInfo}</div>
        </div>
      </div>
    );
  }

  // 4. Appel en cours de démarrage (calling)
  if (isCalling || callStatus === 'calling') {
    console.log('✅ Rendu: Écran appel sortant (calling)');
    return (
      <div className="audio-call-screen calling-screen">
        <div className="calling-container">
          <div className="calling-avatar">
            <User size={64} />
          </div>
          
          <div className="calling-info">
            <h3>Appel audio en cours...</h3>
            <p>Appel de {selectedChat.participants[0]?.username}</p>
            <p className="call-type-badge">📞 En attente de réponse...</p>
            <p className="debug-info">{debugInfo}</p>
          </div>
          
          <div className="calling-controls">
            <button className="btn-cancel-call" onClick={endCall}>
              <X size={24} />
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

  // 5. Écran initial (bouton pour démarrer l'appel audio)
  console.log('✅ Rendu: Écran initial');
  return (
    <div className="audio-call-screen init-screen">
      <div className="call-init-container">
        <div className="user-info">
          <div className="user-avatar-large">
            <User size={80} />
          </div>
          <h3>{selectedChat.participants[0]?.username}</h3>
          <p className="call-description">Prêt pour un appel audio ?</p>
        </div>
        
        <div className="init-controls">
          <button className="btn-start-audio-call" onClick={startOutgoingCall}>
            <Phone size={24} />
            <span>Démarrer l'appel audio</span>
          </button>
          
          <button className="btn-close" onClick={onClose}>
            Annuler
          </button>
        </div>
        
        <div className="permissions-note">
          <p>Assurez-vous d'avoir autorisé l'accès au microphone</p>
        </div>
      </div>
    </div>
  );
};

export default AudioCallScreen;