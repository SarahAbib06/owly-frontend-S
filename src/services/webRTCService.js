import Peer from 'simple-peer';

class WebRTCService {
  constructor() {
    this.peer = null;
    this.localStream = null;
    this.remoteStream = null;
  }

  // Initialiser le stream local (caméra + micro)
  async getLocalStream() {
    try {
      if (this.localStream) {
        return this.localStream;
      }

      console.log('🎥 Tentative d\'accès à la caméra/micro...');
      
      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 24 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      // Essayer avec des contraintes progressives
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error) {
        console.warn('Première tentative échouée, essai avec contraintes réduites...');
        
        // Contraintes réduites
        const reducedConstraints = {
          video: true,
          audio: true
        };
        
        this.localStream = await navigator.mediaDevices.getUserMedia(reducedConstraints);
      }

      console.log('✅ Stream local obtenu:', this.localStream.getTracks().map(t => `${t.kind}: ${t.enabled}`));
      return this.localStream;
    } catch (error) {
      console.error('❌ Erreur accès média:', error.name, error.message);
      
      // Message d'erreur plus précis
      if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        throw new Error('Aucune caméra/microphone détecté. Vérifiez vos périphériques.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        throw new Error('Impossible d\'accéder à la caméra/microphone. Vérifiez les autorisations.');
      } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw new Error('Permission refusée. Veuillez autoriser l\'accès à la caméra/microphone.');
      } else if (error.name === 'OverconstrainedError') {
        throw new Error('Configuration de la caméra non supportée. Essayez une résolution différente.');
      } else {
        throw new Error(`Erreur d'accès média: ${error.message}`);
      }
    }
  }

  // Créer une connexion peer (initiateur)
  createPeer(stream, initiator = false, onSignal = null, onStream = null, onError = null, onClose = null) {
    console.log('🔗 Création peer, initiator:', initiator);
    
    this.peer = new Peer({
      initiator,
      trickle: false,
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ]
      }
    });

    // Écouter les événements
    this.peer.on('signal', (data) => {
      console.log('📡 Signal WebRTC:', data.type);
      if (onSignal) onSignal(data);
    });

    this.peer.on('stream', (remoteStream) => {
      console.log('✅ Stream distant reçu');
      this.remoteStream = remoteStream;
      if (onStream) onStream(remoteStream);
    });

    this.peer.on('error', (err) => {
      console.error('💥 Erreur Peer:', err);
      if (onError) onError(err);
    });

    this.peer.on('close', () => {
      console.log('📴 Connexion Peer fermée');
      if (onClose) onClose();
    });

    this.peer.on('connect', () => {
      console.log('🔗 Connexion WebRTC établie!');
    });

    return this.peer;
  }

  // Envoyer un signal WebRTC
  signal(data) {
    if (this.peer) {
      this.peer.signal(data);
    }
  }

  // Arrêter tous les streams
  stopAllStreams() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
        console.log(`⏹️ Track ${track.kind} arrêté`);
      });
      this.localStream = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.remoteStream = null;
    console.log('🧹 Tous les streams nettoyés');
  }

  // Basculer micro
  toggleAudio() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        console.log('🎤 Micro:', audioTrack.enabled ? 'activé' : 'désactivé');
        return audioTrack.enabled;
      }
    }
    return false;
  }

  // Basculer caméra
  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        console.log('📷 Caméra:', videoTrack.enabled ? 'activée' : 'désactivée');
        return videoTrack.enabled;
      }
    }
    return false;
  }

  // Vérifier les permissions
  static async checkPermissions() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideo = devices.some(device => device.kind === 'videoinput');
      const hasAudio = devices.some(device => device.kind === 'audioinput');
      
      return {
        hasVideo,
        hasAudio,
        devices: devices.map(d => ({ kind: d.kind, label: d.label || 'Non nommé' }))
      };
    } catch (error) {
      console.error('Erreur énumération devices:', error);
      return { hasVideo: false, hasAudio: false, devices: [] };
    }
  }
}

// Exportez UNE instance unique
const webRTCService = new WebRTCService();
export default webRTCService;