import AgoraRTC from 'agora-rtc-sdk-ng';

class AgoraService {
  constructor() {
    this.client = null;
    this.localAudioTrack = null;
    this.localVideoTrack = null;
    this.remoteUsers = new Map(); // uid -> {audioTrack, videoTrack, domElement}
    this.isJoined = false;
    this.appId = import.meta.env.VITE_AGORA_APP_ID || '5f2572ca8769462696d7751b8ed764ca';
    
    // Callback pour notifier les nouvelles vidéos
    this.onRemoteVideoAdded = null;
    this.onRemoteVideoRemoved = null;
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
    
    // Écouter les stats
    this.client.on("network-quality", (stats) => {
      console.log("📊 Qualité réseau:", stats);
    });
  }

  // Rejoindre un canal
  async joinChannel(channelName, token, uid) {
    console.log("🔗 Tentative de connexion:", { channelName, uid, appId: this.appId });
    
    if (!this.client) {
      await this.initializeClient();
    }

    try {
      // Convertir uid en nombre si c'est une chaîne
      const numericUid = Number(uid) || 0;
      
      await this.client.join(
        this.appId,
        channelName,
        token,
        numericUid
      );

      this.isJoined = true;
      console.log(`✅ Canal ${channelName} rejoint, uid: ${numericUid}`);
      
      // Créer et publier les tracks locaux
      await this.createLocalTracks();
      await this.publishLocalTracks();
      
      console.log("🎥 Tracks locaux publiés");
      return { success: true, uid: numericUid };
      
    } catch (error) {
      console.error("❌ Erreur joinChannel:", {
        code: error.code,
        message: error.message,
        name: error.name
      });
      return { success: false, error };
    }
  }

  // Créer les tracks audio/vidéo locaux
  async createLocalTracks() {
    try {
      console.log("🎬 Création des tracks locaux...");
      
      [this.localAudioTrack, this.localVideoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
        {
          encoderConfig: {
            sampleRate: 48000,
            channels: 1,
            bitrate: 128,
          },
          AEC: true, // Annulation d'écho
          ANS: true, // Réduction de bruit
        },
        {
          encoderConfig: {
            width: 640,
            height: 480, // Augmenté pour meilleure qualité
            frameRate: 24,
            bitrateMin: 800,
            bitrateMax: 1200,
          },
          optimizationMode: "motion", // Meilleur pour la vidéo
        }
      );
      
      console.log("✅ Tracks créés:", {
        audio: !!this.localAudioTrack,
        video: !!this.localVideoTrack,
        videoTrackId: this.localVideoTrack?.trackId
      });
      
    } catch (error) {
      console.error("❌ Erreur création tracks:", error);
      // Fallback: essayer séparément
      try {
        this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        this.localVideoTrack = await AgoraRTC.createCameraVideoTrack();
        console.log("✅ Tracks créés en fallback");
      } catch (fallbackError) {
        console.error("❌ Fallback échoué:", fallbackError);
        throw error;
      }
    }
  }

  // Publier les tracks locaux
  async publishLocalTracks() {
    try {
      if (this.localAudioTrack && this.localVideoTrack) {
        await this.client.publish([this.localAudioTrack, this.localVideoTrack]);
        console.log("📤 Tracks publiés avec succès");
        
        // Vérifier la publication
        const stats = await this.client.getLocalVideoStats();
        console.log("📊 Stats vidéo locale:", stats);
      } else {
        console.error("❌ Tracks manquants pour publication");
      }
    } catch (error) {
      console.error("❌ Erreur publication:", error);
    }
  }

  // Gérer les utilisateurs distants - CORRIGÉ
  async handleUserPublished(user, mediaType) {
    console.log(`👤 User ${user.uid} published ${mediaType}`);
    
    try {
      // S'abonner à l'utilisateur distant
      await this.client.subscribe(user, mediaType);
      console.log(`✅ Abonné à ${user.uid} pour ${mediaType}`);
      
      if (mediaType === 'audio') {
        const audioTrack = user.audioTrack;
        if (audioTrack) {
          console.log(`🔊 Audio track reçue pour ${user.uid}`);
          
          this.remoteUsers.set(user.uid, { 
            ...this.remoteUsers.get(user.uid), 
            audioTrack 
          });
          
          // Jouer l'audio
          audioTrack.play();
          console.log(`🔊 Audio joué pour ${user.uid}`);
        }
      }
      
      if (mediaType === 'video') {
        const videoTrack = user.videoTrack;
        if (videoTrack) {
          console.log(`🎥 Video track reçue pour ${user.uid}`, {
            trackId: videoTrack.trackId,
            enabled: videoTrack.enabled
          });
          
          this.remoteUsers.set(user.uid, { 
            ...this.remoteUsers.get(user.uid), 
            videoTrack 
          });
          
          // Notifier le composant React qu'une nouvelle vidéo est disponible
          if (this.onRemoteVideoAdded) {
            this.onRemoteVideoAdded(user.uid, videoTrack);
          }
          
          console.log(`🎥 Video track stockée pour ${user.uid}`);
        }
      }
    } catch (error) {
      console.error(`❌ Erreur subscription ${mediaType}:`, error);
    }
  }

  handleUserUnpublished(user, mediaType) {
    console.log(`👤 User ${user.uid} unpublished ${mediaType}`);
    
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
        userData.videoTrack.stop();
        userData.videoTrack = null;
        
        // Notifier le composant React
        if (this.onRemoteVideoRemoved) {
          this.onRemoteVideoRemoved(user.uid);
        }
      }
    }
  }

  handleUserLeft(user) {
    console.log(`👤 User ${user.uid} a quitté`);
    this.remoteUsers.delete(user.uid);
    
    // Notifier le composant React
    if (this.onRemoteVideoRemoved) {
      this.onRemoteVideoRemoved(user.uid);
    }
  }

  // QUITTER LE CANAL - AMÉLIORÉ
  async leaveChannel() {
    try {
      console.log("🚪 Début leaveChannel");
      
      // Dépublier les tracks locaux
      if (this.localAudioTrack) {
        this.localAudioTrack.stop();
        this.localAudioTrack.close();
        console.log("🔇 Audio local arrêté");
      }
      
      if (this.localVideoTrack) {
        this.localVideoTrack.stop();
        this.localVideoTrack.close();
        console.log("📹 Vidéo locale arrêtée");
      }
      
      // Arrêter toutes les tracks distantes
      for (const [uid, userData] of this.remoteUsers.entries()) {
        if (userData.audioTrack) {
          userData.audioTrack.stop();
        }
        if (userData.videoTrack) {
          userData.videoTrack.stop();
        }
      }
      
      // Quitter le canal
      if (this.client) {
        await this.client.leave();
        console.log("✅ Client Agora quitté");
      }
      
      // Réinitialiser
      this.localAudioTrack = null;
      this.localVideoTrack = null;
      this.remoteUsers.clear();
      this.isJoined = false;
      
      console.log("✅ Canal complètement quitté");
      
    } catch (error) {
      console.error("❌ Erreur leaveChannel:", error);
    }
  }

  // MÉTHODE POUR JOUER LA VIDÉO DISTANTE DANS UN ÉLÉMENT DOM
  playRemoteVideo(uid, domElement) {
    const userData = this.remoteUsers.get(uid);
    if (userData?.videoTrack && domElement) {
      console.log(`🎬 Jouer vidéo ${uid} dans DOM`);
      userData.videoTrack.play(domElement);
      return true;
    } else {
      console.warn(`⚠️ Video track manquante pour ${uid} ou DOM invalide`);
      return false;
    }
  }

  // Activer/désactiver le microphone
  async toggleMicrophone(enabled) {
    if (this.localAudioTrack) {
      await this.localAudioTrack.setEnabled(enabled);
      console.log(`🎤 Microphone ${enabled ? 'activé' : 'désactivé'}`);
    }
  }

  // Activer/désactiver la caméra
  async toggleCamera(enabled) {
    if (this.localVideoTrack) {
      await this.localVideoTrack.setEnabled(enabled);
      console.log(`📹 Caméra ${enabled ? 'activée' : 'désactivée'}`);
    }
  }

  // Changer la caméra
  async switchCamera(deviceId) {
    if (this.localVideoTrack) {
      await this.localVideoTrack.setDevice(deviceId);
      console.log(`📷 Caméra changée vers: ${deviceId}`);
    }
  }

  // Obtenir les périphériques disponibles
  async getDevices() {
    const devices = await AgoraRTC.getDevices();
    const audioDevices = devices.filter(d => d.kind === 'audioinput');
    const videoDevices = devices.filter(d => d.kind === 'videoinput');
    
    console.log("🎛️ Périphériques trouvés:", {
      audio: audioDevices.length,
      video: videoDevices.length
    });
    
    return { audioDevices, videoDevices };
  }

  // Obtenir les statistiques
  async getStats() {
    if (!this.client) return null;
    
    try {
      const localStats = await this.client.getLocalVideoStats();
      const remoteStats = await this.client.getRemoteVideoStats();
      const connectionState = this.client.connectionState;
      
      return {
        localStats,
        remoteStats,
        connectionState,
        remoteUsersCount: this.remoteUsers.size
      };
    } catch (error) {
      console.error("❌ Erreur stats:", error);
      return null;
    }
  }
}

export default new AgoraService();