import AgoraRTC from 'agora-rtc-sdk-ng';

class AgoraService {
  constructor() {
    this.client = null;
    this.localAudioTrack = null;
    this.localVideoTrack = null;
    this.remoteUsers = new Map(); // uid -> {audioTrack, videoTrack}
    this.isJoined = false;
    // POUR VITE :
this.appId = import.meta.env.VITE_AGORA_APP_ID || '5f2572ca8769462696d7751b8ed764ca';
  }

  // Initialiser le client
  async initializeClient() {
    this.client = AgoraRTC.createClient({ 
      mode: "rtc", 
      codec: "vp8" 
    });

    // Gérer les événements
    this.client.on("user-published", this.handleUserPublished.bind(this));
    this.client.on("user-unpublished", this.handleUserUnpublished.bind(this));
    this.client.on("user-left", this.handleUserLeft.bind(this));
  }

  // Rejoindre un canal
  async joinChannel(channelName, token, uid) {
    if (!this.client) {
      await this.initializeClient();
    }

    try {
    await this.client.join(
  this.appId,
  channelName,
  token,
  uid // number
);


      this.isJoined = true;
      console.log(`✅ Rejoint le canal ${channelName} avec uid ${uid}`);
      
      // Créer et publier les tracks locaux
      await this.createLocalTracks();
      await this.publishLocalTracks();
      
      return { success: true, uid };
    } catch (error) {
      console.error("❌ Erreur lors de la connexion:", error);
      return { success: false, error };
    }
  }

  // Créer les tracks audio/vidéo locaux
  async createLocalTracks() {
    try {
      [this.localAudioTrack, this.localVideoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
        {
          encoderConfig: {
            sampleRate: 48000,
            channels: 1,
            bitrate: 128,
          },
        },
        {
          encoderConfig: {
            width: 640,
            height: 360,
            frameRate: 15,
            bitrateMin: 500,
            bitrateMax: 1000,
          },
        }
      );
    } catch (error) {
      console.error("❌ Erreur création des tracks:", error);
      throw error;
    }
  }

  // Publier les tracks locaux
  async publishLocalTracks() {
    if (this.localAudioTrack && this.localVideoTrack) {
      await this.client.publish([this.localAudioTrack, this.localVideoTrack]);
    }
  }

  // Gérer les utilisateurs distants
  async handleUserPublished(user, mediaType) {
    try {
      // S'abonner à l'utilisateur distant
      await this.client.subscribe(user, mediaType);
      
      if (mediaType === 'audio') {
        const audioTrack = user.audioTrack;
        if (audioTrack) {
          this.remoteUsers.set(user.uid, { 
            ...this.remoteUsers.get(user.uid), 
            audioTrack 
          });
          audioTrack.play();
        }
      }
      
      if (mediaType === 'video') {
        const videoTrack = user.videoTrack;
        if (videoTrack) {
          this.remoteUsers.set(user.uid, { 
            ...this.remoteUsers.get(user.uid), 
            videoTrack 
          });
        }
      }
    } catch (error) {
      console.error("❌ Erreur lors de l'abonnement:", error);
    }
  }

  handleUserUnpublished(user, mediaType) {
    if (mediaType === 'audio') {
      const userData = this.remoteUsers.get(user.uid);
      if (userData?.audioTrack) {
        userData.audioTrack.stop();
        userData.audioTrack = null;
      }
    }
    if (mediaType === 'video') {
      const userData = this.remoteUsers.get(user.uid);
      if (userData?.videoTrack) {
        userData.videoTrack = null;
      }
    }
  }

  handleUserLeft(user) {
    this.remoteUsers.delete(user.uid);
  }

  // Quitter le canal
  async leaveChannel() {
    try {
      // Dépublier les tracks locaux
      if (this.localAudioTrack) {
        this.localAudioTrack.stop();
        this.localAudioTrack.close();
      }
      if (this.localVideoTrack) {
        this.localVideoTrack.stop();
        this.localVideoTrack.close();
      }

      // Quitter le canal
      if (this.client) {
        await this.client.leave();
      }

      // Réinitialiser
      this.localAudioTrack = null;
      this.localVideoTrack = null;
      this.remoteUsers.clear();
      this.isJoined = false;
      
      console.log("✅ Canal quitté avec succès");
    } catch (error) {
      console.error("❌ Erreur lors de la déconnexion:", error);
    }
  }

  // Activer/désactiver le microphone
  async toggleMicrophone(enabled) {
    if (this.localAudioTrack) {
      await this.localAudioTrack.setEnabled(enabled);
    }
  }

  // Activer/désactiver la caméra
  async toggleCamera(enabled) {
    if (this.localVideoTrack) {
      await this.localVideoTrack.setEnabled(enabled);
    }
  }

  // Changer la caméra
  async switchCamera(deviceId) {
    if (this.localVideoTrack) {
      await this.localVideoTrack.setDevice(deviceId);
    }
  }

  // Obtenir les périphériques disponibles
  async getDevices() {
    const devices = await AgoraRTC.getDevices();
    const audioDevices = devices.filter(d => d.kind === 'audioinput');
    const videoDevices = devices.filter(d => d.kind === 'videoinput');
    return { audioDevices, videoDevices };
  }
}

export default new AgoraService();