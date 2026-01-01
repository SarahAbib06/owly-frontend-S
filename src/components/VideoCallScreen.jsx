// frontend/src/components/VideoCallScreen.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, 
  Maximize, Minimize, User, AlertCircle, CameraOff,Monitor, MonitorOff
} from 'lucide-react';
import { motion } from 'framer-motion';
import socketService from '../services/socketService';
import webRTCService from '../services/webRTCService'; // Nouveau service
import { useAuth } from '../hooks/useAuth';

export default function VideoCallScreen({ selectedChat, callData, onClose }) {
  const { user } = useAuth();
  
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('initializing');
  const [error, setError] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isStartingShare, setIsStartingShare] = useState(false);
  const [screenSharerId, setScreenSharerId] = useState(null);
  const [remoteUserId, setRemoteUserId] = useState(null);
  const remoteUserIdRef = useRef(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const callStartTime = useRef(null);
  const durationInterval = useRef(null);
  const isInitializedRef = useRef(false);

  // Fonctions de partage d'écran
  const startScreenShare = async () => {
    if (!remoteUserId) {
      console.error("❌ Erreur : Impossible de trouver l'ID du destinataire.");
      return;
    }

    try {
      setIsStartingShare(true);
      await webRTCService.startScreenShare(remoteUserId);
      setIsScreenSharing(true);
      setScreenSharerId(user?._id);
      socketService.emitScreenShareStart(remoteUserId, user?._id);
    } catch (err) {
      console.error("Erreur partage:", err);
    } finally {
      setIsStartingShare(false);
    }
  };

  const stopScreenShare = async () => {
    try {
      await webRTCService.stopScreenShare();
      setIsScreenSharing(false);
      setScreenSharerId(null);
      socketService.emitScreenShareStop(remoteUserId, user?._id);
    } catch (err) {
      console.error("Erreur arrêt partage:", err);
      setIsScreenSharing(false);
      setScreenSharerId(null);
    }
  };

  // Initialisation et écouteurs socket
useEffect(() => {
  if (isInitializedRef.current) {
    console.log('⚠️ Déjà initialisé, skip');
    return;
  }

  isInitializedRef.current = true;
  console.log('🎬 Initialisation VideoCallScreen');

  // --- Screen share handlers ---
  const handleRemoteStart = ({ sharerId }) => {
    console.log("🔒 L'autre utilisateur partage son écran");
    setScreenSharerId(sharerId);
  };

  const handleRemoteStop = () => {
    console.log("🔓 Le partage d'écran est à nouveau libre");
    setScreenSharerId(null);
    setIsScreenSharing(false);
  };

  // --- WebRTC ---
  webRTCService.onScreenShareStop(() => {
    console.log('🖥️ Arrêt du partage d\'écran détecté par le service');
    setIsScreenSharing(false);
    setScreenSharerId(null);

    const remoteId = remoteUserIdRef.current;
    if (remoteId) {
      socketService.emitScreenShareStop(remoteId, user?._id);
    }
  });

  // --- Socket listeners ---
  socketService.onScreenShareStarted(handleRemoteStart);
  socketService.onScreenShareStopped(handleRemoteStop);

  // --- Init call ---
  initializeCall();

  return () => {
    console.log('🧹 Nettoyage VideoCallScreen');

    if (socketService.socket) {
      socketService.socket.off('call:answer');
      socketService.socket.off('call:offer');
      socketService.socket.off('call:accepted');
      socketService.socket.off('call:ended');
      socketService.socket.off('call:ice-candidate');
      socketService.socket.off('call:screen-share-start');
      socketService.socket.off('call:screen-share-stop');
    }

    cleanup();
    isInitializedRef.current = false;
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

  // Synchronisation de l'état du partage d'écran
  useEffect(() => {
    const syncScreenSharingState = () => {
      const serviceIsSharing = webRTCService.isScreenSharing();
      if (serviceIsSharing !== isScreenSharing) {
        setIsScreenSharing(serviceIsSharing);
      }
    };

    const interval = setInterval(syncScreenSharingState, 500);
    return () => clearInterval(interval);
  }, [isScreenSharing]);




const initializeCall = async () => {
  try {
    setConnectionStatus('gettingstream');
    
    // 1. Stream local
    let stream;
    try {
      stream = await webRTCService.getLocalStream();
    } catch (mediaError) {
        console.error('❌ Erreur accès média:', mediaError);

        if (mediaError.name === 'NotAllowedError') {
          throw new Error('Accès à la caméra/micro refusé. Veuillez autoriser l\'accès dans les paramètres de votre navigateur.');
        } else if (mediaError.name === 'NotFoundError') {
          throw new Error('Aucun périphérique caméra/micro trouvé. Vérifiez vos connexions.');
        } else if (mediaError.name === 'NotReadableError') {
          throw new Error('La caméra/micro est déjà utilisée par une autre application.');
        } else {
          throw new Error('Erreur d\'accès aux périphériques média: ' + mediaError.message);
        }
      }
    
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
    
    setConnectionStatus('creatingconnection');
    
    // 2. CORRECTION: Déterminer rôle SANS selectedChat
    const currentUserId = user?.id;
    if (!currentUserId) {
      throw new Error('ID utilisateur manquant');
    }
    
    const isReceiver = callData.receiverId === currentUserId;
    const isInitiator = !isReceiver; // Caller = Initiator WebRTC
    
    const remoteUserId = isInitiator ? callData.callerId : callData.receiverId;
    
    setRemoteUserId(remoteUserId);
    remoteUserIdRef.current = remoteUserId;
    
    console.log('✅ RÔLE DÉTERMINÉ:', {
      isReceiver,
      isInitiator,
      remoteUserId,
      currentUserId,
      callData
    });
    
    // 3. Configurer callbacks WebRTC
    webRTCService.onSignal = async (signal) => {
      console.log('📡 Signal à envoyer:', signal.type);
      const callId = callData.callId;
      
      if (signal.type === 'offer') {
        socketService.socket?.emit('call:offer', {
          callId,
          receiverId: remoteUserId,
          signal
        });
      } else if (signal.type === 'answer') {
        socketService.socket?.emit('call:answer', {
          callId,
          callerId: remoteUserId,
          signal
        });
      } else if (signal.type === 'candidate') {
        socketService.socket?.emit('call:ice-candidate', {
          callId,
          candidate: signal.candidate
        });
      }
    };
    
    webRTCService.onStream = (remoteStream) => {
      console.log('✅ Stream distant reçu');
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      setConnectionStatus('connected');
    };
    
    // 4. Écouteurs socket communs
    socketService.onCallIceCandidate = (data) => {
      console.log('🧊 ICE candidate reçu:', data.candidate);
      if (data.candidate) {
        webRTCService.addIceCandidate(data.candidate);
      }
    };
    
    socketService.onCallEnded = handleEndCall;
    
    // 5. Logique selon rôle
    if (isInitiator) {
      // CALLER: Crée PeerConnection et attend ANSWER
      console.log('📞 CALLER: J\'attends une OFFER/ANSWER');
      setConnectionStatus('waitingoffer');
      
      socketService.onCallOffer = async (data) => {
        if (webRTCService.peerConnection) {
          console.log('PeerConnection existe déjà');
          return;
        }
        console.log('📨 OFFER reçue');
        webRTCService.createPeerConnection(false);
        await webRTCService.setRemoteDescription(data.signal);
        await webRTCService.createAnswer();
      };
      
      socketService.onCallAnswer = async (data) => {
        console.log('📨 ANSWER reçue');
        await webRTCService.setRemoteDescription(data.signal);
        setConnectionStatus('connected');
      };
      
    } else {
      // RECEIVER: Attend call:accepted puis crée OFFER
      console.log('📱 RECEIVER: J\'attends call:accepted');
      setConnectionStatus('waitingaccept');
      
      const handleCallAccepted = async (data) => {
        if (webRTCService.peerConnection) {
          console.log('PeerConnection existe déjà');
          return;
        }
        console.log('✅ call:accepted reçu - Création OFFER');
        webRTCService.createPeerConnection(true);
        setTimeout(() => {
          webRTCService.createOffer();
          setConnectionStatus('waitinganswer');
        }, 100);
      };
      
      socketService.onCallAccepted = handleCallAccepted;
      
      socketService.onCallAnswer = async (data) => {
        console.log('📨 ANSWER reçue (receiver side)');
        await webRTCService.setRemoteDescription(data.signal);
        setConnectionStatus('connected');
      };
    }
    
  } catch (error) {
    console.error('❌ Erreur initialisation:', error);
    setConnectionStatus('error');
    setError(error.message);
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
  onClick={isScreenSharing ? stopScreenShare : startScreenShare}
  //  
  //  Un démarrage est en cours (isStartingShare)
  //  OU Quelqu'un d'autre partage (screenSharerId n'est pas moi)
  disabled={isStartingShare || (screenSharerId !== null && screenSharerId !== user?._id)}
  className={`p-4 rounded-full ${
    isScreenSharing 
      ? 'bg-red-500' // Je partage
      : (screenSharerId !== null && screenSharerId !== user?._id)
      ? 'bg-gray-800 opacity-50 cursor-not-allowed' // L'autre partage : BLOQUÉ
      : 'bg-gray-700' // Personne ne partage
  } text-white transition`}
>
  {isScreenSharing ? <MonitorOff size={24} /> : <Monitor size={24} />}
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