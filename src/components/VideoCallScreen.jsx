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
    console.log('🎬 Initialisation VideoCallScreen');

    // Écouter les événements de partage d'écran
    const handleRemoteStart = ({ sharerId }) => {
      console.log("🔒 L'autre utilisateur partage son écran");
      setScreenSharerId(sharerId);
    };

    const handleRemoteStop = (data) => {
      console.log("🔓 Le partage d'écran est à nouveau libre");
      setScreenSharerId(null);
      setIsScreenSharing(false);
    };

    // Écouter l'arrêt du partage d'écran depuis le service WebRTC
    webRTCService.onScreenShareStop(() => {
      console.log('🖥️ Arrêt du partage d\'écran détecté par le service');
      setIsScreenSharing(false);
      setScreenSharerId(null);
      const remoteId = remoteUserIdRef.current;
      if (remoteId) {
        socketService.emitScreenShareStop(remoteId, user?._id);
      }
    });

    // S'abonner aux événements socket
    socketService.onScreenShareStarted(handleRemoteStart);
    socketService.onScreenShareStopped(handleRemoteStop);

    // Initialiser l'appel
    initializeCall();

    return () => {
      console.log('🧹 Nettoyage VideoCallScreen');
      // Nettoyer tous les écouteurs
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
    };
  }, []); // Un seul useEffect pour tout initialiser

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
      setConnectionStatus('getting_stream');

      // 1. Obtenir le stream local avec gestion d'erreurs améliorée
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

      setConnectionStatus('creating_connection');

      // 2. Déterminer le rôle de manière simplifiée
      const currentUserId = user?._id;
      const actualCallData = callData || (selectedChat ? {
        callerId: currentUserId,
        receiverId: selectedChat.participants?.find(p =>
          String(p._id) !== String(currentUserId)
        )?._id
      } : null);

      const isInitiator = actualCallData?.callerId === currentUserId;
      const remoteUserId = isInitiator ? actualCallData.receiverId : actualCallData.callerId;

      // Stocker l'ID distant
      setRemoteUserId(remoteUserId);
      remoteUserIdRef.current = remoteUserId;

      console.log('📱 Rôle déterminé:', { isInitiator, remoteUserId, callData: actualCallData });

      // 3. Configurer les callbacks de signalisation
      webRTCService.onSignal(async (signal) => {
        console.log('📡 Signal à envoyer:', signal.type);

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
        console.log('✅ Stream distant reçu');
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        setConnectionStatus('connected');
      });

      socketService.onCallAccepted((data) => {
  console.log('📞 Appel accepté, création OFFER');
  
  webRTCService.createPeerConnection(true);
  webRTCService.createOffer();
  setConnectionStatus('waiting_answer');
});
socketService.onCallOffer((data) => {
  console.log('📡 Offre reçue');
  
  webRTCService.createPeerConnection(false);
  webRTCService.setRemoteDescription(data.signal)
    .then(() => webRTCService.createAnswer());
});

     

      // 5. Configurer les écouteurs selon le rôle
      if (isInitiator) {
        // CALLER: Attendre l'acceptation puis créer l'offre
        socketService.onCallAccepted?.((data) => {
          console.log('📞 Appel accepté, création de l\'offre');
          if (data.callId) {
            setTimeout(async () => {
              try {
                await webRTCService.createOffer();
                setConnectionStatus('waiting_answer');
              } catch (err) {
                console.error('❌ Erreur création offre:', err);
                setError('Erreur création appel');
              }
            }, 500);
          }
        });

        // Écouter les réponses
        socketService.onCallAnswer?.((data) => {
          console.log('📡 Réponse reçue');
          if (data.callerId === remoteUserId) {
            webRTCService.handleAnswer(data.signal);
          }
        });

        setConnectionStatus('waiting_accept');

      } else {
        // RECEIVER: Accepter et attendre l'offre
        if (actualCallData.callId) {
          socketService.acceptCall(actualCallData.callId, actualCallData.callerId);
        }

        // Écouter les offres
        socketService.onCallOffer?.((data) => {
          console.log('📡 Offre reçue');
          if (data.callerId === remoteUserId) {
            webRTCService.setRemoteDescription(data.signal)
              .then(() => webRTCService.createAnswer())
              .catch(err => {
                console.error('Erreur réponse:', err);
                setError('Erreur réponse appel');
              });
          }
        });

        setConnectionStatus('waiting_offer');
      }

      // 6. Écouteurs communs
      socketService.socket?.on('call:ice-candidate', (data) => {
        if (data.callerId === remoteUserId || data.receiverId === remoteUserId) {
          webRTCService.addIceCandidate(data.candidate);
        }
      });

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