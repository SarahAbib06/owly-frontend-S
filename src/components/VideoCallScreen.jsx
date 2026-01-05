// src/components/VideoCallScreen.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function VideoCallScreen({ selectedChat, onClose }) {
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

  if (isLoading) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{ fontSize: '24px', marginBottom: '16px' }}>
          Connexion à l'appel vidéo...
        </div>
        <div style={{ fontSize: '16px', opacity: 0.7 }}>
          Préparation de la caméra et du micro
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
      }}
    />
  );
}