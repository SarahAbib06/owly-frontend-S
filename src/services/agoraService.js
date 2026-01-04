import AgoraRTC from 'agora-rtc-sdk-ng';

class AgoraService {
  constructor() {
    this.client = null;
    this.localAudioTrack = null;
    this.localVideoTrack = null;
    this.screenTrack = null;
    this.remoteUsers = new Map(); // uid -> {audioTrack, videoTrack, domElement}
    this.isJoined = false;
    this.appId = import.meta.env.VITE_AGORA_APP_ID || '5f2572ca8769462696d7751b8ed764ca';

    // Callback pour notifier les nouvelles vidéos
    this.onRemoteVideoAdded = null;
    this.onRemoteVideoRemoved = null;
       this.onRemoteAudioAdded = null; // <-- NOUVEAU : pour l'audio
    this.onRemoteAudioRemoved = null; // <-- NOUVEAU : pour l'audio

    // Paramètres pour le partage d'écran en cours
    this.currentScreenShareParams = null;

    // Callback pour notifier l'arrêt du partage d'écran depuis la bannière externe
    this.onScreenShareEnded = null;
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
   // Rejoindre un canal (version modifiée)
  // Rejoindre un canal
  async joinChannel(channelName, token, uid, audioOnly = false) {
    console.log("🔗 Tentative de connexion:", {
      channelName,
      uid,
      audioOnly,
      appId: this.appId
    });

    if (!this.client) {
      await this.initializeClient();
    }

    try {
      const numericUid = Number(uid) || 0;
      this.uid = numericUid; // Set the current user's UID

      await this.client.join(
        this.appId,
        channelName,
        token,
        numericUid
      );

      this.isJoined = true;
      console.log(`✅ Canal ${channelName} rejoint, uid: ${numericUid}, audioOnly: ${audioOnly}`);

      // Créer les tracks
      await this.createLocalTracks();

      if (audioOnly) {
        // Pour les appels audio, désactiver la caméra
        if (this.localVideoTrack) {
          await this.localVideoTrack.setEnabled(false);
          console.log("📹 Caméra désactivée pour appel audio");
        }

        // Publier seulement l'audio si on veut
        if (this.localAudioTrack) {
          await this.client.publish([this.localAudioTrack]);
          console.log("📤 Track audio publié");
        }
      } else {
        // Pour les appels vidéo, publier audio + vidéo
        if (this.localAudioTrack && this.localVideoTrack) {
          await this.client.publish([this.localAudioTrack, this.localVideoTrack]);
          console.log("🎥 Tracks audio+vidéo publiés");
        }
      }

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
    // Gérer les utilisateurs distants - VERSION AMÉLIORÉE
  async handleUserPublished(user, mediaType) {
    console.log(`👤 User ${user.uid} published ${mediaType}`);
    
    try {
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
          
          // Jouer l'audio IMMÉDIATEMENT
          audioTrack.play();
          console.log(`🔊 Audio joué pour ${user.uid}`);
          
          // Pour les appels audio, on pourrait notifier le composant
          if (this.onRemoteAudioAdded) {
            this.onRemoteAudioAdded(user.uid, audioTrack);
          }
        }
      }
      
      if (mediaType === 'video') {
        const videoTrack = user.videoTrack;
        if (videoTrack) {
          console.log(`🎥 Video track reçue pour ${user.uid}`);
          
          this.remoteUsers.set(user.uid, { 
            ...this.remoteUsers.get(user.uid), 
            videoTrack 
          });
          
          // Notifier le composant React
          if (this.onRemoteVideoAdded) {
            this.onRemoteVideoAdded(user.uid, videoTrack);
          }
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

  // Obtenir la track de partage d'écran pour un utilisateur
  getScreenShareTrack(userId) {
    if (userId === this.uid) {
      return this.screenTrack;
    } else {
      const userData = this.remoteUsers.get(userId);
      return userData?.videoTrack;
    }
  }

  // Démarrer le partage d'écran
  async startScreenShare(socketService, channelName, userId) {
    try {
      console.log("🖥️ Démarrage partage d'écran...");

      // Stocker les paramètres pour l'événement 'track-ended'
      this.currentScreenShareParams = {
        socketService,
        channelName,
        userId
      };

      // Arrêter la caméra si elle est active
      if (this.localVideoTrack) {
        await this.client.unpublish(this.localVideoTrack);
        console.log("📹 Caméra temporairement désactivée pour le partage d'écran");
      }

      console.log("🖥️ Création de la track de partage d'écran...");

      // Créer la track de partage d'écran
      this.screenTrack = await AgoraRTC.createScreenVideoTrack({
        encoderConfig: {
          width: 1920,
          height: 1080,
          frameRate: 15,
          bitrateMin: 600,
          bitrateMax: 2000,
        }
      });

      console.log("🖥️ Track de partage d'écran créée avec succès:", this.screenTrack);

      // Vérifier immédiatement si la track est valide
      if (!this.screenTrack) {
        throw new Error("Track de partage d'écran non créée");
      }

      if (this.screenTrack) {
        // Ajouter un listener pour l'événement 'track-ended' directement sur la track AVANT publication
        this.screenTrack.on('track-ended', () => {
          console.log("🖥️ Partage d'écran arrêté depuis la bannière externe (track ended)");
          if (this.currentScreenShareParams) {
            this.handleScreenShareEnded(
              this.currentScreenShareParams.socketService,
              this.currentScreenShareParams.channelName,
              this.currentScreenShareParams.userId
            );
            this.currentScreenShareParams = null; // Nettoyer après utilisation
          }
        });

        // Publier la track de partage d'écran
        await this.client.publish(this.screenTrack);

        // Notifier les autres participants via socket
        console.log('🖥️ DEBUG - AgoraService: Émission screen-share-started via socket');
        console.log('🖥️ DEBUG - socketService.socket:', socketService?.socket);
        console.log('🖥️ DEBUG - socketService.socket.connected:', socketService?.socket?.connected);
        if (socketService?.socket) {
          socketService.socket.emit('screen-share-started', {
            channelName: channelName,
            userId: userId,
            timestamp: Date.now()
          });
          console.log('🖥️ DEBUG - screen-share-started émis avec succès');
        } else {
          console.log('🖥️ DEBUG - ERREUR: socketService.socket non disponible');
        }

        console.log("✅ Partage d'écran démarré et publié");
        return { success: true, screenTrack: this.screenTrack };
      } else {
        throw new Error("Impossible de créer la track de partage d'écran");
      }
    } catch (error) {
      console.log("🖥️ Erreur démarrage partage d'écran:", {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack
      });

      // Vérifier si c'est une annulation par l'utilisateur
      if (error.name === 'NotAllowedError' ||
          error.name === 'AbortError' ||
          error.message?.includes('cancel') ||
          error.message?.includes('abort') ||
          error.message?.includes('annul') ||
          error.message?.includes('user denied') ||
          error.message?.includes('permission denied')) {
        console.log("🖥️ Partage d'écran annulé par l'utilisateur");
        return { success: false, cancelled: true, error };
      }

      return { success: false, error };
    }
  }

  // Arrêter le partage d'écran
  async stopScreenShare() {
    try {
      console.log("🖥️ Arrêt partage d'écran...");

      if (this.screenTrack) {
        // Dépublier la track
        await this.client.unpublish(this.screenTrack);
        this.screenTrack.stop();
        this.screenTrack.close();
        this.screenTrack = null;
        console.log("✅ Partage d'écran arrêté");

        // Restaurer la caméra si elle était active avant
        if (this.localVideoTrack) {
          await this.client.publish(this.localVideoTrack);
          console.log("📹 Caméra restaurée après arrêt du partage d'écran");
        }

        return { success: true };
      } else {
        console.warn("⚠️ Aucune track de partage d'écran active");
        return { success: true };
      }
    } catch (error) {
      console.error("❌ Erreur arrêt partage d'écran:", error);
      return { success: false, error };
    }
  }

  // Gérer l'arrêt du partage d'écran depuis la bannière externe
  async handleScreenShareEnded(socketService, channelName, userId) {
    try {
      console.log("🖥️ Gestion de l'arrêt externe du partage d'écran");

      // Nettoyer la track locale
      if (this.screenTrack) {
        await this.client.unpublish(this.screenTrack);
        this.screenTrack.stop();
        this.screenTrack.close();
        this.screenTrack = null;
      }

      // Restaurer la caméra si elle était active avant
      if (this.localVideoTrack) {
        await this.localVideoTrack.setEnabled(true);
        await this.client.publish(this.localVideoTrack);
        console.log("📹 Caméra restaurée après arrêt externe du partage d'écran");
      }

      // Notifier les autres participants via socket
      console.log('🖥️ DEBUG - AgoraService: Émission screen-share-stopped via socket');
      console.log('🖥️ DEBUG - socketService.socket:', socketService?.socket);
      console.log('🖥️ DEBUG - socketService.socket.connected:', socketService?.socket?.connected);
      if (socketService?.socket) {
        socketService.socket.emit('screen-share-stopped', {
          channelName: channelName,
          userId: userId,
          timestamp: Date.now()
        });
        console.log('🖥️ DEBUG - screen-share-stopped émis avec succès');
      } else {
        console.log('🖥️ DEBUG - ERREUR: socketService.socket non disponible');
      }

      // Notifier le composant React pour mettre à jour l'interface
      if (this.onScreenShareEnded) {
        this.onScreenShareEnded(userId);
      }

      console.log("✅ Arrêt externe du partage d'écran géré");
    } catch (error) {
      console.error("❌ Erreur gestion arrêt externe partage d'écran:", error);
    }
  }
}

export default new AgoraService();
