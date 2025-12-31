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
