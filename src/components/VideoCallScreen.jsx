// frontend/src/components/VideoCallScreen.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, 
  Maximize, Minimize, User, AlertCircle, CameraOff
} from 'lucide-react';
import { motion } from 'framer-motion';
import socketService from '../services/socketService';
import webRTCService from '../services/WebRTCService'; // Nouveau service
import { useAuth } from '../hooks/useAuth';

export default function VideoCallScreen({ selectedChat, callData, onClose }) {
  const { user } = useAuth();
  
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('initializing');
  const [error, setError] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const callStartTime = useRef(null);
  const durationInterval = useRef(null);

  // Initialiser l'appel
  useEffect(() => {
    initializeCall();
    
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

  const initializeCall = async () => {
    try {
      setConnectionStatus('getting_stream');
      
      // 1. Obtenir le stream local
      const stream = await webRTCService.getLocalStream();
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
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
      
      console.log('📱 Rôle:', { isInitiator, remoteUserId });
      
      // 3. Configurer les callbacks de signalisation
      webRTCService.onSignal(async (signal) => {
        console.log('📡 Signal à envoyer:', signal.type);
        
        if (isInitiator) {
          if (signal.type === 'offer') {
            socketService.sendCallOffer?.(remoteUserId, signal);
          } else if (signal.type === 'candidate') {
            // Envoyer les candidats ICE
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
        console.log('✅ Stream distant reçu');
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        setConnectionStatus('connected');
      });
      
      // 4. Créer la connexion
      webRTCService.createPeerConnection(isInitiator);
      
      // 5. Écouter les signaux entrants via socket
      if (isInitiator) {
        // Écouter les réponses
        socketService.onCallAnswer?.((data) => {
          console.log('📡 Réponse reçue');
          if (data.receiverId === remoteUserId) {
            webRTCService.setRemoteDescription(data.signal);
          }
        });
        
        // Créer l'offre
        setTimeout(async () => {
          try {
            await webRTCService.createOffer();
            setConnectionStatus('waiting_answer');
          } catch (err) {
            console.error('❌ Erreur création offre:', err);
            setError('Erreur création appel');
          }
        }, 1000);
        
      } else {
        // Écouter les offres
        socketService.onCallOffer?.((data) => {
          console.log('📡 Offre reçue');
          if (data.callerId === remoteUserId) {
            webRTCService.setRemoteDescription(data.signal)
              .then(() => webRTCService.createAnswer())
              .catch(err => console.error('Erreur réponse:', err));
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
        console.log('📴 Appel terminé à distance');
        handleEndCall();
      });
      
    } catch (error) {
      console.error('💥 Erreur initialisation appel:', error);
      setConnectionStatus('error');
      setError(error.message || 'Erreur initialisation appel');
    }
  };

  const cleanup = () => {
    console.log('🧹 Nettoyage appel');
    webRTCService.stopAllStreams();
    
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
    
    // Retirer les écouteurs socket
    socketService.off?.('call:answer');
    socketService.off?.('call:offer');
    socketService.off?.('call:ended');
    socketService.socket?.off('call:ice-candidate');
  };

  const handleEndCall = () => {
    console.log('📞 Fin d\'appel');
    
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

  const toggleVideo = () => {
    const enabled = webRTCService.toggleVideo();
    setIsVideoEnabled(enabled);
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

  if (error) {
    return (
      <div className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center text-white p-6">
        <AlertCircle size={64} className="text-red-500 mb-6" />
        <h2 className="text-2xl font-bold mb-4">Erreur d'appel</h2>
        <p className="text-lg mb-2 text-center">{error}</p>
        
        <div className="flex gap-4 mt-6">
          <button
            onClick={() => {
              setError(null);
              setConnectionStatus('initializing');
              initializeCall();
            }}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition"
          >
            Réessayer
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition"
          >
            Fermer
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
            <h3 className="font-semibold text-lg">Appel en cours</h3>
            <p className="text-sm text-gray-300">
              {connectionStatus === 'initializing' && 'Initialisation...'}
              {connectionStatus === 'getting_stream' && 'Accès caméra/micro...'}
              {connectionStatus === 'creating_connection' && 'Création connexion...'}
              {connectionStatus === 'waiting_offer' && 'En attente d\'appel...'}
              {connectionStatus === 'waiting_answer' && 'En attente de réponse...'}
              {connectionStatus === 'connected' && formatDuration(callDuration)}
              {connectionStatus === 'error' && 'Erreur de connexion'}
            </p>
          </div>
          <button
            onClick={toggleFullscreen}
            className="p-2 hover:bg-white/10 rounded-full transition"
          >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
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

        {/* Placeholder si pas de vidéo distante */}
        {connectionStatus !== 'connected' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center text-white">
              <User size={80} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg">Appel vidéo</p>
              <p className="text-sm text-gray-300 mt-2">
                {connectionStatus === 'waiting_offer' && 'En attente de connexion...'}
                {connectionStatus === 'waiting_answer' && 'Appel en cours...'}
                {connectionStatus === 'connected' && 'Connecté'}
              </p>
            </div>
          </div>
        )}

        {/* Vidéo locale (miniature) */}
        <div className="absolute top-20 right-4 w-32 h-48 rounded-lg overflow-hidden shadow-2xl border-2 border-white/30">
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
        </div>
      </div>

      {/* Contrôles */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={toggleAudio}
            className={`p-4 rounded-full ${
              isAudioEnabled 
                ? 'bg-gray-700 hover:bg-gray-600' 
                : 'bg-red-500 hover:bg-red-600'
            } text-white transition`}
          >
            {isAudioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
          </button>

          <button
            onClick={toggleVideo}
            className={`p-4 rounded-full ${
              isVideoEnabled 
                ? 'bg-gray-700 hover:bg-gray-600' 
                : 'bg-red-500 hover:bg-red-600'
            } text-white transition`}
          >
            {isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
          </button>

          <button
            onClick={handleEndCall}
            className="p-5 rounded-full bg-red-600 hover:bg-red-700 text-white transition"
          >
            <PhoneOff size={28} />
          </button>
        </div>
      </div>

      <style>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}