// frontend/src/components/VideoCallScreen.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, 
  Maximize, Minimize, User, AlertCircle, CameraOff, Settings
} from 'lucide-react';
import { motion } from 'framer-motion';
import socketService from '../services/socketService';
import webRTCService from '../services/webRTCService';
import { useAuth } from '../hooks/useAuth';

export default function VideoCallScreen({ selectedChat, callData, onClose }) {
  const { user } = useAuth();
  
  // États
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('initializing');
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const callStartTime = useRef(null);
  const durationInterval = useRef(null);

  // Déterminer les données d'appel
  useEffect(() => {
    const initCallData = () => {
      let actualCallData = callData;
      
      if (!actualCallData && selectedChat) {
        const currentUserId = user?._id || user?.id;
        
        // Trouver l'autre participant
        const otherParticipant = selectedChat.participants?.find(
          p => String(p._id || p.id) !== String(currentUserId)
        );
        
        actualCallData = {
          callId: `chat_${selectedChat._id}_${Date.now()}`,
          callerId: currentUserId,
          callerName: user?.username || user?.name || 'Vous',
          receiverId: otherParticipant?._id,
          receiverName: otherParticipant?.username || 'Utilisateur'
        };
      }
      
      if (!actualCallData) {
        setError('Aucune donnée d\'appel disponible');
        return null;
      }
      
      setDebugInfo(prev => ({
        ...prev,
        callData: actualCallData,
        currentUserId: user?._id,
        remoteUserId: actualCallData.callerId === user?._id ? actualCallData.receiverId : actualCallData.callerId,
        isInitiator: actualCallData.callerId === user?._id
      }));
      
      return actualCallData;
    };
    
    const callDataObj = initCallData();
    
    if (callDataObj) {
      initializeCall(callDataObj);
    }
    
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
        durationInterval.current = null;
      }
    };
  }, [connectionStatus]);

  const initializeCall = async (callDataObj) => {
    try {
      setConnectionStatus('checking_permissions');
      setDebugInfo(prev => ({ ...prev, step: 'checking_permissions' }));
      
      // Vérifier que webRTCService existe
      if (!webRTCService) {
        throw new Error('Service WebRTC non disponible');
      }
      
      // 1. Obtenir le stream local
      console.log('🎥 Tentative d\'obtention du stream local...');
      let stream;
      try {
        // Essayer getLocalStream d'abord, sinon checkAndRequestPermissions
        if (typeof webRTCService.getLocalStream === 'function') {
          stream = await webRTCService.getLocalStream();
        } else if (typeof webRTCService.checkAndRequestPermissions === 'function') {
          stream = await webRTCService.checkAndRequestPermissions();
        } else {
          // Fallback direct
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: true
          });
        }
      } catch (streamError) {
        console.error('❌ Erreur stream:', streamError);
        throw new Error(`Accès média: ${streamError.message}`);
      }
      
      if (!stream) {
        throw new Error('Impossible d\'obtenir le flux média');
      }
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        console.log('✅ Stream local attaché');
      }
      
      setConnectionStatus('creating_peer');
      setDebugInfo(prev => ({ ...prev, step: 'creating_peer', hasLocalStream: true }));
      
      // 2. Créer la connexion peer
      const currentUserId = user?._id;
      const isInitiator = callDataObj.callerId === currentUserId;
      const remoteUserId = isInitiator ? callDataObj.receiverId : callDataObj.callerId;
      
      console.log('🔗 Création peer:', { isInitiator, remoteUserId });
      
      // Vérifier que socketService existe
      if (!socketService || !socketService.socket) {
        throw new Error('Service Socket non disponible');
      }
      
      // Créer le peer avec gestion des callbacks
      const peerOptions = {
        stream,
        initiator: isInitiator,
        trickle: false,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      };
      
      // Créer le peer directement avec simple-peer si webRTCService ne fonctionne pas
      let peer;
      if (typeof webRTCService.createPeer === 'function') {
        peer = webRTCService.createPeer(
          stream,
          isInitiator,
          // Signal callback
          (signal) => {
            console.log('📡 Signal WebRTC:', signal.type);
            if (isInitiator) {
              socketService.sendCallOffer?.(remoteUserId, signal);
            } else {
              socketService.sendCallAnswer?.(remoteUserId, signal);
            }
          },
          // Stream callback
          (remoteStream) => {
            console.log('✅ Stream distant reçu');
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
            }
            setConnectionStatus('connected');
          },
          // Error callback
          (err) => {
            console.error('💥 Erreur Peer:', err);
            setConnectionStatus('error');
            setError(`Erreur connexion: ${err.message}`);
          },
          // Close callback
          () => {
            console.log('📴 Connexion fermée');
            handleEndCall();
          }
        );
      } else {
        // Fallback direct
        const Peer = (await import('simple-peer')).default;
        peer = new Peer(peerOptions);
        
        peer.on('signal', (signal) => {
          console.log('📡 Signal WebRTC:', signal.type);
          if (isInitiator) {
            socketService.sendCallOffer?.(remoteUserId, signal);
          } else {
            socketService.sendCallAnswer?.(remoteUserId, signal);
          }
        });
        
        peer.on('stream', (remoteStream) => {
          console.log('✅ Stream distant reçu');
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
          setConnectionStatus('connected');
        });
        
        peer.on('error', (err) => {
          console.error('💥 Erreur Peer:', err);
          setConnectionStatus('error');
          setError(`Erreur connexion: ${err.message}`);
        });
        
        peer.on('close', () => {
          console.log('📴 Connexion fermée');
          handleEndCall();
        });
      }
      
      peerRef.current = peer;
      
      setConnectionStatus('waiting_connection');
      setDebugInfo(prev => ({ 
        ...prev, 
        step: 'waiting_connection',
        peerCreated: true,
        isInitiator,
        remoteUserId
      }));
      
      // Configurer les écouteurs socket
      if (isInitiator) {
        socketService.onCallAnswer?.((data) => {
          console.log('📡 Réponse WebRTC reçue:', data);
          if (data.receiverId === remoteUserId && peerRef.current) {
            peerRef.current.signal(data.signal);
          }
        });
      } else {
        socketService.onCallOffer?.((data) => {
          console.log('📡 Offre WebRTC reçue:', data);
          if (data.callerId === remoteUserId && peerRef.current) {
            peerRef.current.signal(data.signal);
          }
        });
      }
      
      socketService.onCallEnded?.(() => {
        console.log('📴 Appel terminé par l\'autre utilisateur');
        handleEndCall();
      });
      
    } catch (error) {
      console.error('💥 Erreur initialisation appel:', error);
      setConnectionStatus('error');
      setError(error.message || 'Erreur lors de l\'initialisation de l\'appel');
      
      setDebugInfo(prev => ({
        ...prev,
        error: error.toString(),
        errorStack: error.stack,
        step: 'failed'
      }));
    }
  };

  const cleanup = () => {
    console.log('🧹 Nettoyage VideoCallScreen');
    
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    
    if (typeof webRTCService?.stopAllStreams === 'function') {
      webRTCService.stopAllStreams();
    } else {
      // Fallback manual cleanup
      if (localVideoRef.current?.srcObject) {
        const stream = localVideoRef.current.srcObject;
        stream.getTracks().forEach(track => track.stop());
        localVideoRef.current.srcObject = null;
      }
    }
    
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
    
    // Retirer les écouteurs socket
    socketService.off?.('call:answer');
    socketService.off?.('call:offer');
    socketService.off?.('call:ended');
  };

  const handleEndCall = () => {
    console.log('📞 Fin d\'appel demandée');
    
    // Récupérer l'ID distant depuis les debug infos
    const remoteUserId = debugInfo.remoteUserId;
    if (remoteUserId) {
      socketService.endCall?.(remoteUserId);
    }
    
    cleanup();
    onClose();
  };

  const toggleAudio = () => {
    try {
      let enabled = false;
      if (typeof webRTCService?.toggleAudio === 'function') {
        enabled = webRTCService.toggleAudio();
      } else if (localVideoRef.current?.srcObject) {
        const stream = localVideoRef.current.srcObject;
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = !audioTrack.enabled;
          enabled = audioTrack.enabled;
        }
      }
      setIsAudioEnabled(enabled);
    } catch (err) {
      console.error('Erreur toggle audio:', err);
    }
  };

  const toggleVideo = () => {
    try {
      let enabled = false;
      if (typeof webRTCService?.toggleVideo === 'function') {
        enabled = webRTCService.toggleVideo();
      } else if (localVideoRef.current?.srcObject) {
        const stream = localVideoRef.current.srcObject;
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = !videoTrack.enabled;
          enabled = videoTrack.enabled;
        }
      }
      setIsVideoEnabled(enabled);
    } catch (err) {
      console.error('Erreur toggle video:', err);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRetry = () => {
    setError(null);
    setConnectionStatus('initializing');
    setDebugInfo({});
    
    // Recréer les données d'appel
    const callDataObj = callData || (selectedChat ? {
      callId: `chat_${selectedChat._id}_${Date.now()}`,
      callerId: user?._id,
      callerName: user?.username || 'Vous',
      receiverId: selectedChat.participants?.find(p => 
        String(p._id) !== String(user?._id)
      )?._id,
      receiverName: selectedChat.participants?.find(p => 
        String(p._id) !== String(user?._id)
      )?.username || 'Utilisateur'
    } : null);
    
    if (callDataObj) {
      initializeCall(callDataObj);
    }
  };

  // Écran d'erreur
  if (error) {
    return (
      <div className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center text-white p-6">
        <AlertCircle size={64} className="text-red-500 mb-6" />
        <h2 className="text-2xl font-bold mb-4">Erreur d'appel</h2>
        <p className="text-lg mb-2 text-center">{error}</p>
        
        <div className="bg-gray-800 p-4 rounded-lg mt-4 mb-6 w-full max-w-md">
          <p className="text-sm font-semibold mb-2">Informations de débogage:</p>
          <pre className="text-xs bg-gray-900 p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
        
        <div className="flex gap-4">
          <button
            onClick={handleRetry}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition"
          >
            Réessayer
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition"
          >
            Annuler
          </button>
          <button
            onClick={() => {
              console.log('Debug info:', debugInfo);
              navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                .then(stream => {
                  alert('Permissions OK!');
                  stream.getTracks().forEach(t => t.stop());
                })
                .catch(err => alert(`Erreur: ${err.message}`));
            }}
            className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-medium transition"
          >
            Tester Permissions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-[9999] flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent z-10">
        <div className="flex items-center justify-between text-white">
          <div>
            <h3 className="font-semibold text-lg">
              {debugInfo.callData?.receiverName || 'Utilisateur'}
            </h3>
            <p className="text-sm text-gray-300">
              {connectionStatus === 'initializing' && 'Initialisation...'}
              {connectionStatus === 'checking_permissions' && 'Vérification permissions...'}
              {connectionStatus === 'creating_peer' && 'Création connexion...'}
              {connectionStatus === 'waiting_connection' && 'En attente de connexion...'}
              {connectionStatus === 'connected' && formatDuration(callDuration)}
              {connectionStatus === 'error' && 'Erreur de connexion'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => console.log('Debug:', debugInfo)}
              className="p-2 hover:bg-white/10 rounded-full transition"
              title="Debug"
            >
              <Settings size={16} />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-white/10 rounded-full transition"
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Vidéos */}
      <div className="flex-1 relative">
        {/* Vidéo distante */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover bg-gray-900"
        />

        {/* Placeholder vidéo distante */}
        {connectionStatus !== 'connected' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center text-white">
              <User size={80} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg">
                {debugInfo.callData?.receiverName || 'Utilisateur'}
              </p>
              <p className="text-sm text-gray-300 mt-2">
                {connectionStatus === 'waiting_connection' && 'En attente de connexion...'}
                {connectionStatus === 'checking_permissions' && 'Vérification des permissions...'}
                {connectionStatus === 'creating_peer' && 'Établissement de la connexion...'}
              </p>
            </div>
          </div>
        )}

        {/* Vidéo locale */}
        <motion.div
          drag
          dragConstraints={{ top: 0, left: 0, right: 300, bottom: 500 }}
          className="absolute top-20 right-4 w-32 h-48 rounded-lg overflow-hidden shadow-2xl border-2 border-white/30 cursor-move z-20"
        >
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover mirror"
          />
          {!isVideoEnabled && (
            <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
              <CameraOff size={32} className="text-white" />
            </div>
          )}
        </motion.div>
      </div>

      {/* Contrôles */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-center gap-6">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleAudio}
            className={`p-4 rounded-full ${
              isAudioEnabled 
                ? 'bg-gray-700 hover:bg-gray-600' 
                : 'bg-red-500 hover:bg-red-600'
            } text-white transition`}
          >
            {isAudioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleVideo}
            className={`p-4 rounded-full ${
              isVideoEnabled 
                ? 'bg-gray-700 hover:bg-gray-600' 
                : 'bg-red-500 hover:bg-red-600'
            } text-white transition`}
          >
            {isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleEndCall}
            className="p-5 rounded-full bg-red-600 hover:bg-red-700 text-white transition"
          >
            <PhoneOff size={28} />
          </motion.button>
        </div>
      </div>

      {/* Debug overlay */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-16 left-4 bg-black/70 text-white text-xs p-2 rounded">
          <div>Status: {connectionStatus}</div>
          <div>Local stream: {localVideoRef.current?.srcObject ? '✅' : '❌'}</div>
          <div>Remote stream: {remoteVideoRef.current?.srcObject ? '✅' : '❌'}</div>
          <div>Peer: {peerRef.current ? '✅' : '❌'}</div>
        </div>
      )}

      <style jsx>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}