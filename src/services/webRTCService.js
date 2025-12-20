// frontend/src/services/WebRTCService.js
class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.dataChannel = null;
    this.onSignalCallback = null;
    this.onStreamCallback = null;
  }

  async getLocalStream() {
    try {
      if (this.localStream) {
        return this.localStream;
      }

      console.log('🎥 Demande d\'accès média...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
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
      });
      
      this.localStream = stream;
      console.log('✅ Stream local obtenu');
      return stream;
      
    } catch (error) {
      console.error('❌ Erreur accès média:', error);
      throw error;
    }
  }

  createPeerConnection(isInitiator = false) {
    console.log('🔗 Création RTCPeerConnection, initiator:', isInitiator);
    
    // Configuration STUN/ICE
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    };
    
    this.peerConnection = new RTCPeerConnection(configuration);
    
    // Ajouter le stream local
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }
    
    // Gérer les candidats ICE
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('📡 Candidat ICE:', event.candidate);
        if (this.onSignalCallback) {
          this.onSignalCallback({
            type: 'candidate',
            candidate: event.candidate
          });
        }
      }
    };
    
    // Gérer le stream distant
    this.peerConnection.ontrack = (event) => {
      console.log('✅ Stream distant reçu');
      this.remoteStream = event.streams[0];
      if (this.onStreamCallback) {
        this.onStreamCallback(this.remoteStream);
      }
    };
    
    // Gérer les erreurs
    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('🌐 État ICE:', this.peerConnection.iceConnectionState);
      
      if (this.peerConnection.iceConnectionState === 'failed' ||
          this.peerConnection.iceConnectionState === 'disconnected' ||
          this.peerConnection.iceConnectionState === 'closed') {
        console.error('❌ Connexion ICE échouée');
      }
    };
    
    // Créer un canal de données pour la signalisation
    if (isInitiator) {
      this.dataChannel = this.peerConnection.createDataChannel('chat');
      this.setupDataChannel();
    } else {
      this.peerConnection.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannel();
      };
    }
    
    return this.peerConnection;
  }

  setupDataChannel() {
    if (!this.dataChannel) return;
    
    this.dataChannel.onopen = () => {
      console.log('📨 Canal de données ouvert');
    };
    
    this.dataChannel.onclose = () => {
      console.log('📨 Canal de données fermé');
    };
    
    this.dataChannel.onmessage = (event) => {
      console.log('📨 Message reçu:', event.data);
    };
  }

  async createOffer() {
    if (!this.peerConnection) {
      throw new Error('PeerConnection non initialisée');
    }
    
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      console.log('📡 Offre créée:', offer.type);
      
      if (this.onSignalCallback) {
        this.onSignalCallback({
          type: 'offer',
          sdp: offer.sdp
        });
      }
      
      return offer;
      
    } catch (error) {
      console.error('❌ Erreur création offre:', error);
      throw error;
    }
  }

  async createAnswer() {
    if (!this.peerConnection) {
      throw new Error('PeerConnection non initialisée');
    }
    
    try {
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      console.log('📡 Réponse créée:', answer.type);
      
      if (this.onSignalCallback) {
        this.onSignalCallback({
          type: 'answer',
          sdp: answer.sdp
        });
      }
      
      return answer;
      
    } catch (error) {
      console.error('❌ Erreur création réponse:', error);
      throw error;
    }
  }

  async setRemoteDescription(sdp) {
    if (!this.peerConnection) {
      throw new Error('PeerConnection non initialisée');
    }
    
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
      console.log('✅ Description distante définie:', sdp.type);
    } catch (error) {
      console.error('❌ Erreur définition description distante:', error);
      throw error;
    }
  }

  async addIceCandidate(candidate) {
    if (!this.peerConnection) {
      throw new Error('PeerConnection non initialisée');
    }
    
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('✅ Candidat ICE ajouté');
    } catch (error) {
      console.error('❌ Erreur ajout candidat ICE:', error);
    }
  }

  onSignal(callback) {
    this.onSignalCallback = callback;
  }

  onStream(callback) {
    this.onStreamCallback = callback;
  }

  stopAllStreams() {
    console.log('🧹 Nettoyage des streams...');
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        console.log(`⏹️ Arrêt track ${track.kind}`);
        track.stop();
      });
      this.localStream = null;
    }
    
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    this.remoteStream = null;
    this.dataChannel = null;
    console.log('✅ Streams nettoyés');
  }

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
}

// Export singleton
const webRTCService = new WebRTCService();
export default webRTCService;