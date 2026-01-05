import AgoraRTC from 'agora-rtc-sdk-ng';

class AgoraService {
  constructor() {
    this.client = null;
    this.localAudioTrack = null;
    this.localVideoTrack = null;
    this.remoteUsers = new Map();
    this.isJoined = false;
    this.isInitialized = false; // ✅ Nouveau flag
    this.appId = import.meta.env.VITE_AGORA_APP_ID || '5f2572ca8769462696d7751b8ed764ca';
    
    this.onRemoteVideoAdded = null;
    this.onRemoteVideoRemoved = null;
    this.onRemoteAudioAdded = null;
    this.onRemoteAudioRemoved = null;
  }

  async initializeClient() {
  // ✅ Empêche la double init
  if (this.isInitialized && this.client) {
    console.log("⚠️ Client déjà initialisé");
    return;
  }

  console.log("🟢 Création client Agora");

  // ✅ CRÉATION AVANT TOUT
  this.client = AgoraRTC.createClient({
    mode: "rtc",
    codec: "vp8",
  });

  // ✅ EVENTS APRÈS CRÉATION
  this.client.on("user-joined", user => {
    console.log("👀 USER JOINED", user.uid);
  });

  this.client.on("user-published", this.handleUserPublished.bind(this));
  this.client.on("user-unpublished", this.handleUserUnpublished.bind(this));
  this.client.on("user-left", this.handleUserLeft.bind(this));

  this.client.on("network-quality", stats => {
    console.log("📊 Qualité réseau:", stats);
  });

  this.client.on("connection-state-change", curState => {
    console.log("🔌 Connection state:", curState);
  });

  this.isInitialized = true;
  console.log("✅ Client Agora initialisé");
}


  // ✅ CORRECTION 2 — joinChannel PROPRE selon l'ordre officiel
  async joinChannel(channelName, token, uid, audioOnly = false) {
    console.log("🔗 joinChannel()", { channelName, uid, audioOnly });

    // 0️⃣ Vérifier si déjà joint
    if (this.isJoined) {
      console.warn("⚠️ Déjà joint au canal, abort join");
      return { success: true };
    }

    try {
      // 1️⃣ INITIALISER LE CLIENT (UNE SEULE FOIS)
      if (!this.client || !this.isInitialized) {
        await this.initializeClient();
      }

      const numericUid = Number(uid) || null;
      console.log("🧪 AGORA JOIN PARAMS", {
  appId: this.appId,
  channelName,
  token: token?.slice(0, 10) + "...",
  uid
});


      // 2️⃣ JOIN D'ABORD
      await this.client.join(
        this.appId,
        channelName,
        token,
        numericUid,
      );

      console.log("✅ JOIN OK - État:", this.client.connectionState);
      this.isJoined = true;

      // 3️⃣ CRÉER TRACKS APRÈS JOIN
      await this.createLocalTracks();

      if (audioOnly && this.localVideoTrack) {
        await this.localVideoTrack.setEnabled(false);
      }

      // 4️⃣ PUBLISH
      if (audioOnly) {
        await this.client.publish(this.localAudioTrack);
        console.log("📤 Audio publié");
      } else {
        await this.client.publish([
          this.localAudioTrack,
          this.localVideoTrack
        ]);
        console.log("📤 Audio + Vidéo publiés");
      }

      console.log("🎉 Canal rejoint avec succès");
      return { success: true };

    } catch (err) {
      console.error("❌ joinChannel FAILED", err);
      this.isJoined = false;
      
      // Nettoyer en cas d'erreur
      try {
        await this.client.leave();
      } catch (leaveErr) {}
      
      // Réinitialiser les tracks
      if (this.localAudioTrack) {
        this.localAudioTrack.stop();
        this.localAudioTrack.close();
        this.localAudioTrack = null;
      }
      if (this.localVideoTrack) {
        this.localVideoTrack.stop();
        this.localVideoTrack.close();
        this.localVideoTrack = null;
      }
      
      throw err;
    }
  }

  async createLocalTracks() {
    try {
      console.log("🎬 Création des tracks locaux...");
      
      // Libérer les anciens tracks s'ils existent
      if (this.localAudioTrack) {
        this.localAudioTrack.stop();
        this.localAudioTrack.close();
      }
      if (this.localVideoTrack) {
        this.localVideoTrack.stop();
        this.localVideoTrack.close();
      }
      
      [this.localAudioTrack, this.localVideoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
        {
          encoderConfig: {
            sampleRate: 48000,
            channels: 1,
            bitrate: 128,
          },
          AEC: true,
          ANS: true,
        },
        {
          encoderConfig: {
            width: 640,
            height: 480,
            frameRate: 24,
            bitrateMin: 800,
            bitrateMax: 1200,
          },
          optimizationMode: "motion",
        }
      );
      
      console.log("✅ Tracks créés:", {
        audio: !!this.localAudioTrack,
        video: !!this.localVideoTrack
      });
      
    } catch (error) {
      console.error("❌ Erreur création tracks:", error);
      
      // Fallback simple
      try {
        this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
          encoderConfig: {
            sampleRate: 48000,
            channels: 1,
            bitrate: 128,
          }
        });
        console.log("✅ Audio track créé (fallback)");
      } catch (audioError) {
        console.error("❌ Fallback audio échoué:", audioError);
      }
      
      try {
        this.localVideoTrack = await AgoraRTC.createCameraVideoTrack({
          encoderConfig: {
            width: 640,
            height: 480,
            frameRate: 15,
            bitrateMin: 500,
            bitrateMax: 1000,
          }
        });
        console.log("✅ Video track créé (fallback)");
      } catch (videoError) {
        console.error("❌ Fallback vidéo échoué:", videoError);
      }
      
      if (!this.localAudioTrack && !this.localVideoTrack) {
        throw new Error("Impossible de créer les tracks audio/vidéo");
      }
    }
  }

  handleUserPublished(user, mediaType) {
    console.log(`👤 User ${user.uid} published ${mediaType}`);
    
    try {
      this.client.subscribe(user, mediaType).then(() => {
        console.log(`✅ Abonné à ${user.uid} pour ${mediaType}`);
        
        if (mediaType === 'audio') {
          const audioTrack = user.audioTrack;
          if (audioTrack) {
            console.log(`🔊 Audio track reçue pour ${user.uid}`);
            
            this.remoteUsers.set(user.uid, { 
              ...(this.remoteUsers.get(user.uid) || {}), 
              audioTrack 
            });
            
            audioTrack.play().catch(err => {
              console.error(`❌ Erreur play audio ${user.uid}:`, err);
            });
            
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
              ...(this.remoteUsers.get(user.uid) || {}), 
              videoTrack 
            });
            
            if (this.onRemoteVideoAdded) {
              this.onRemoteVideoAdded(user.uid, videoTrack);
            }
          }
        }
      }).catch(error => {
        console.error(`❌ Erreur subscription ${mediaType}:`, error);
      });
    } catch (error) {
      console.error(`❌ Erreur handleUserPublished:`, error);
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
        
        if (this.onRemoteVideoRemoved) {
          this.onRemoteVideoRemoved(user.uid);
        }
      }
    }
  }

  handleUserLeft(user) {
    console.log(`👤 User ${user.uid} a quitté`);
    this.remoteUsers.delete(user.uid);
    
    if (this.onRemoteVideoRemoved) {
      this.onRemoteVideoRemoved(user.uid);
    }
  }

  async leaveChannel() {
    try {
      console.log("🚪 Début leaveChannel");
      
      // Arrêter et nettoyer les tracks locaux
      if (this.localAudioTrack) {
        this.localAudioTrack.stop();
        this.localAudioTrack.close();
        this.localAudioTrack = null;
        console.log("🔇 Audio local arrêté");
      }
      
      if (this.localVideoTrack) {
        this.localVideoTrack.stop();
        this.localVideoTrack.close();
        this.localVideoTrack = null;
        console.log("📹 Vidéo locale arrêtée");
      }
      
      // Arrêter les tracks distants
      for (const [uid, userData] of this.remoteUsers.entries()) {
        if (userData.audioTrack) {
          userData.audioTrack.stop();
        }
        if (userData.videoTrack) {
          userData.videoTrack.stop();
        }
      }
      
      this.remoteUsers.clear();
      
      // Quitter le client
      if (this.client && this.isJoined) {
        await this.client.leave();
        console.log("✅ Client Agora quitté");
      }
      
      this.isJoined = false;
      console.log("✅ Canal complètement quitté");
      
    } catch (error) {
      console.error("❌ Erreur leaveChannel:", error);
    }
  }

  playRemoteVideo(uid, domElement) {
    const userData = this.remoteUsers.get(uid);
    if (userData?.videoTrack && domElement) {
      try {
        userData.videoTrack.play(domElement);
        console.log(`🎬 Vidéo ${uid} jouée dans DOM`);
        return true;
      } catch (error) {
        console.error(`❌ Erreur play vidéo ${uid}:`, error);
        return false;
      }
    } else {
      console.warn(`⚠️ Video track manquante pour ${uid} ou DOM invalide`);
      return false;
    }
  }

  async toggleMicrophone(enabled) {
    if (this.localAudioTrack) {
      await this.localAudioTrack.setEnabled(enabled);
      console.log(`🎤 Microphone ${enabled ? 'activé' : 'désactivé'}`);
    }
  }

  async toggleCamera(enabled) {
    if (this.localVideoTrack) {
      await this.localVideoTrack.setEnabled(enabled);
      console.log(`📹 Caméra ${enabled ? 'activée' : 'désactivée'}`);
    }
  }

  async switchCamera(deviceId) {
    if (this.localVideoTrack) {
      await this.localVideoTrack.setDevice(deviceId);
      console.log(`📷 Caméra changée vers: ${deviceId}`);
    }
  }

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