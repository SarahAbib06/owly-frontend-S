// frontend/src/components/AudioCallScreen.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, PhoneOff, Volume2, VolumeX,
  User, AlertCircle, Headphones, Wifi, WifiOff
} from 'lucide-react';
import { motion } from 'framer-motion';
import socketService from '../services/socketService';
import webRTCService from '../services/webRTCService';
import { useAuth } from '../hooks/useAuth';

export default function AudioCallScreen({ selectedChat, callData, onClose }) {
  const { user } = useAuth();
  
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('initializing');
  const [error, setError] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const audioAnalyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioStreamRef = useRef(null);
  const callStartTime = useRef(null);
  const durationInterval = useRef(null);
  const animationFrameRef = useRef(null);

  // Initialiser l'appel vocal
  useEffect(() => {
    initializeAudioCall();
    
    return () => {
      cleanup();
    };
  }, []);

  // Timer de durée d'appel
  useEffect(() => {
    if (connectionStatus === 'connected') {
      callStartTime.current = Date.now();
      durationInterval.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - callStartTime.current) / 1000);
        setCallDuration(elapsed);
      }, 1000);
    }

    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, [connectionStatus]);

  // Animation du niveau audio
  useEffect(() => {
    if (connectionStatus === 'connected' && isAudioEnabled) {
      startAudioVisualizer();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [connectionStatus, isAudioEnabled]);

  const initializeAudioCall = async () => {
    try {
      setConnectionStatus('getting_stream');
      
      // 1. Obtenir le stream audio local (microphone uniquement)
      const stream = await webRTCService.getLocalStream({ audio: true, video: false });
      audioStreamRef.current = stream;
      
      // Initialiser l'analyseur audio pour la visualisation
      setupAudioVisualizer(stream);
      
      setConnectionStatus('creating_connection');
      
      // 2. Déterminer le rôle (caller ou receiver)
      const currentUserId = user?._id;
      const actualCallData = callData || (selectedChat ? {
        callerId: currentUserId,
        receiverId: selectedChat.participants?.find(p => 
          String(p._id) !== String(currentUserId)
        )?._id
      } : null);
      
      const isInitiator = actualCallData?.callerId === currentUserId;
      const remoteUserId = isInitiator ? actualCallData.receiverId : actualCallData.callerId;
      
      console.log('🎤 Rôle appel vocal:', { isInitiator, remoteUserId });
      
      // 3. Configurer les callbacks de signalisation
      webRTCService.onSignal(async (signal) => {
        console.log('📡 Signal audio à envoyer:', signal.type);
        
        if (isInitiator) {
          if (signal.type === 'offer') {
            socketService.sendCallOffer?.(remoteUserId, signal);
          } else if (signal.type === 'candidate') {
            socketService.socket?.emit('call:ice-candidate', {
              receiverId: remoteUserId,
              candidate: signal.candidate
            });
          }
        } else {
          if (signal.type === 'answer') {
            socketService.sendCallAnswer?.(remoteUserId, signal);
          } else if (signal.type === 'candidate') {
            socketService.socket?.emit('call:ice-candidate', {
              receiverId: remoteUserId,
              candidate: signal.candidate
            });
          }
        }
      });
      
      webRTCService.onStream((remoteStream) => {
        console.log('✅ Stream audio distant reçu');
        // Créer un élément audio pour jouer le stream distant
        const remoteAudio = new Audio();
        remoteAudio.srcObject = remoteStream;
        remoteAudio.play().catch(e => console.warn('Audio playback error:', e));
        setConnectionStatus('connected');
      });
      
      // 4. Créer la connexion audio uniquement
      webRTCService.createPeerConnection(isInitiator, { audio: true, video: false });
      
      // 5. Écouter les signaux entrants via socket
      if (isInitiator) {
        // Écouter les réponses
        socketService.onCallAnswer?.((data) => {
          console.log('📡 Réponse audio reçue');
          if (data.receiverId === remoteUserId) {
            webRTCService.setRemoteDescription(data.signal);
          }
        });
        
        // Créer l'offre
        setTimeout(async () => {
          try {
            await webRTCService.createOffer({ offerToReceiveAudio: 1 });
            setConnectionStatus('waiting_answer');
          } catch (err) {
            console.error('❌ Erreur création offre audio:', err);
            setError('Erreur création appel vocal');
          }
        }, 1000);
        
      } else {
        // Écouter les offres
        socketService.onCallOffer?.((data) => {
          console.log('📡 Offre audio reçue');
          if (data.callerId === remoteUserId) {
            webRTCService.setRemoteDescription(data.signal)
              .then(() => webRTCService.createAnswer())
              .catch(err => console.error('Erreur réponse audio:', err));
          }
        });
        
        setConnectionStatus('waiting_offer');
      }
      
      // Écouter les candidats ICE
      socketService.socket?.on('call:ice-candidate', (data) => {
        if ((isInitiator && data.receiverId === remoteUserId) ||
            (!isInitiator && data.callerId === remoteUserId)) {
          webRTCService.addIceCandidate(data.candidate);
        }
      });
      
      // Écouter la fin d'appel
      socketService.onCallEnded?.(() => {
        console.log('📴 Appel vocal terminé à distance');
        handleEndCall();
      });
      
    } catch (error) {
      console.error('💥 Erreur initialisation appel vocal:', error);
      setConnectionStatus('error');
      setError(error.message || 'Erreur initialisation appel vocal');
    }
  };

  const setupAudioVisualizer = (stream) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      audioAnalyserRef.current = audioContextRef.current.createAnalyser();
      
      audioAnalyserRef.current.fftSize = 256;
      source.connect(audioAnalyserRef.current);
    } catch (err) {
      console.warn('Audio visualizer not available:', err);
    }
  };

  const startAudioVisualizer = () => {
    if (!audioAnalyserRef.current) return;

    const updateAudioLevel = () => {
      const dataArray = new Uint8Array(audioAnalyserRef.current.frequencyBinCount);
      audioAnalyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculer le niveau moyen
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      setAudioLevel(average / 255); // Normaliser entre 0 et 1
      
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    };

    updateAudioLevel();
  };

  const cleanup = () => {
    console.log('🧹 Nettoyage appel vocal');
    webRTCService.stopAllStreams();
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // Retirer les écouteurs socket
    socketService.off?.('call:answer');
    socketService.off?.('call:offer');
    socketService.off?.('call:ended');
    socketService.socket?.off('call:ice-candidate');
  };

  const handleEndCall = () => {
    console.log('📞 Fin d\'appel vocal');
    
    // Récupérer l'ID distant
    const currentUserId = user?._id;
    const actualCallData = callData || (selectedChat ? {
      callerId: currentUserId,
      receiverId: selectedChat.participants?.find(p => 
        String(p._id) !== String(currentUserId)
      )?._id
    } : null);
    
    const remoteUserId = actualCallData?.callerId === currentUserId 
      ? actualCallData.receiverId 
      : actualCallData?.callerId;
    
    if (remoteUserId) {
      socketService.endCall?.(remoteUserId);
    }
    
    cleanup();
    onClose();
  };

  const toggleAudio = () => {
    const enabled = webRTCService.toggleAudio();
    setIsAudioEnabled(enabled);
  };

  const toggleSpeaker = () => {
    setIsSpeakerEnabled(!isSpeakerEnabled);
    // Vous pourriez ici changer la sortie audio (haut-parleur vs écouteurs)
    // Cela nécessiterait l'API Audio Output Devices
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch(connectionStatus) {
      case 'initializing': return 'Initialisation...';
      case 'getting_stream': return 'Accès microphone...';
      case 'creating_connection': return 'Création connexion...';
      case 'waiting_offer': return 'En attente d\'appel...';
      case 'waiting_answer': return 'Appel en cours...';
      case 'connected': return formatDuration(callDuration);
      case 'error': return 'Erreur de connexion';
      default: return 'Appel vocal';
    }
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-gray-900 to-black z-[9999] flex flex-col items-center justify-center text-white p-6">
        <AlertCircle size={64} className="text-red-500 mb-6 animate-pulse" />
        <h2 className="text-2xl font-bold mb-4">Erreur d'appel vocal</h2>
        <p className="text-lg mb-2 text-center max-w-md">{error}</p>
        
        <div className="flex gap-4 mt-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setError(null);
              setConnectionStatus('initializing');
              initializeAudioCall();
            }}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition shadow-lg"
          >
            Réessayer
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition shadow-lg"
          >
            Fermer
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-gray-900 to-black z-[9999] flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/50 to-transparent z-10">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <Headphones size={24} className="text-purple-400" />
            <div>
              <h3 className="font-semibold text-lg">Appel vocal</h3>
              <p className="text-sm text-gray-300 flex items-center gap-2">
                <span>{getStatusText()}</span>
                {connectionStatus === 'connected' && (
                  <Wifi size={14} className="text-green-400" />
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {connectionStatus === 'connected' && (
              <div className="flex items-center gap-2 text-sm">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`w-1 rounded-full ${
                        audioLevel * 5 > i 
                          ? 'bg-green-400' 
                          : 'bg-gray-600'
                      }`}
                      style={{ 
                        height: `${4 + i * 4}px`,
                        transition: 'height 0.1s, background-color 0.1s'
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs text-gray-400">Audio</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Avatar/Photo de profil */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative mb-8"
        >
          <div className="w-48 h-48 rounded-full bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center shadow-2xl">
            <User size={80} className="text-white/80" />
          </div>
          
          {/* Animation de son */}
          {connectionStatus === 'connected' && (
            <div className="absolute inset-0">
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 rounded-full border-2 border-purple-400"
                  initial={{ scale: 1, opacity: 0.3 }}
                  animate={{ 
                    scale: [1, 1.2 + i * 0.1],
                    opacity: [0.3, 0]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeOut"
                  }}
                  style={{
                    borderWidth: `${2 - i * 0.3}px`
                  }}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* Nom du contact */}
        <h2 className="text-3xl font-bold text-white mb-2 text-center">
          {selectedChat?.participants?.find(p => 
            String(p._id) !== String(user?._id)
          )?.username || 'Utilisateur'}
        </h2>
        
        {/* Statut */}
        <div className="flex items-center gap-2 mb-8">
          <div className={`w-3 h-3 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 
            connectionStatus === 'error' ? 'bg-red-500' : 
            'bg-yellow-500'
          }`} />
          <p className="text-gray-300">
            {connectionStatus === 'connected' ? 'Connecté' : 
             connectionStatus === 'waiting_answer' ? 'En attente de réponse...' :
             connectionStatus === 'waiting_offer' ? 'En attente d\'appel...' :
             'Connexion en cours...'}
          </p>
        </div>

        {/* Durée d'appel (grande) */}
        {connectionStatus === 'connected' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-6xl font-bold text-white mb-8 font-mono"
          >
            {formatDuration(callDuration)}
          </motion.div>
        )}

        {/* Indicateur de qualité audio */}
        {connectionStatus === 'connected' && (
          <div className="flex items-center gap-2 mb-8 bg-black/30 rounded-full px-4 py-2">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`w-2 rounded-full transition-all duration-200 ${
                    audioLevel * 5 > i 
                      ? 'bg-green-400 h-6' 
                      : 'bg-gray-600 h-2'
                  }`}
                  style={{ 
                    height: `${2 + audioLevel * 20}px`,
                    transition: 'height 0.1s ease-in-out'
                  }}
                />
              ))}
            </div>
            <span className="text-sm text-gray-400 ml-2">Qualité audio</span>
          </div>
        )}
      </div>

      {/* Contrôles */}
      <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-center gap-6">
          {/* Bouton Micro */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleAudio}
            className={`p-4 rounded-full shadow-2xl ${
              isAudioEnabled 
                ? 'bg-gray-800 hover:bg-gray-700' 
                : 'bg-red-600 hover:bg-red-700'
            } text-white transition-all`}
          >
            {isAudioEnabled ? 
              <Mic size={28} className="text-green-400" /> : 
              <MicOff size={28} className="text-white" />
            }
          </motion.button>

          {/* Bouton Haut-parleur */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleSpeaker}
            className={`p-4 rounded-full shadow-2xl ${
              isSpeakerEnabled 
                ? 'bg-gray-800 hover:bg-gray-700' 
                : 'bg-gray-600 hover:bg-gray-500'
            } text-white transition-all`}
          >
            {isSpeakerEnabled ? 
              <Volume2 size={28} className="text-blue-400" /> : 
              <VolumeX size={28} className="text-gray-300" />
            }
          </motion.button>

          {/* Bouton Raccrocher */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleEndCall}
            className="p-5 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-2xl transition-all"
          >
            <PhoneOff size={32} />
          </motion.button>
        </div>

        {/* Légende des contrôles */}
        <div className="flex items-center justify-center gap-10 mt-6 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-800" />
            <span>{isAudioEnabled ? 'Micro actif' : 'Micro coupé'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-800" />
            <span>{isSpeakerEnabled ? 'Haut-parleur' : 'Écouteurs'}</span>
          </div>
        </div>
      </div>

      {/* Effets visuels */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Points flottants */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-purple-500/30 rounded-full"
            initial={{
              x: Math.random() * 100 + 'vw',
              y: Math.random() * 100 + 'vh',
              opacity: 0
            }}
            animate={{
              y: [null, '-20vh'],
              opacity: [0, 0.5, 0]
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2
            }}
            style={{
              left: Math.random() * 100 + '%'
            }}
          />
        ))}
      </div>
    </div>
  );
}