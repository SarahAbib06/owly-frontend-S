// src/components/VideoCallScreen.jsx
import React, { useEffect, useRef, useState } from 'react';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { useAuth } from '../hooks/useAuth';

export default function VideoCallScreen({ selectedChat, onClose }) {
  const { user } = useAuth();
  const containerRef = useRef(null);
  const zpRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !selectedChat || !containerRef.current) return;

    const initZegoCall = async () => {
      try {
        const otherUser = selectedChat.participants.find(p => p._id !== user._id);
        if (!otherUser) {
          alert("Utilisateur distant introuvable");
          onClose();
          return;
        }

        const participants = [user._id, otherUser._id].sort();
        const roomID = participants.join('_');

        const userID = user._id.toString();
        const userName = user.username || user.name || 'Utilisateur';

        // URL correcte → à vérifier selon ton backend
        const response = await fetch(
          `http://localhost:5000/api/zego/token?roomID=${roomID}&userID=${userID}&userName=${encodeURIComponent(userName)}`
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const { token } = await response.json();

        const zp = ZegoUIKitPrebuilt.create(token);
        zpRef.current = zp;

        zp.joinRoom({
          container: containerRef.current,
          scenario: {
            mode: ZegoUIKitPrebuilt.OneONoneCall,
          },
          showRoomTimer: true,
          turnOnCameraWhenJoining: true,
          turnOnMicrophoneWhenJoining: true,
          showMyCameraToggleButton: true,
          showMyMicrophoneToggleButton: true,
          showAudioVideoSettingsButton: true,
          showScreenSharingButton: true,
          showTextChat: false,
          showUserList: false,
          onLeaveRoom: () => {
            onClose();
          },
        });

        setIsLoading(false);
      } catch (error) {
        console.error('Erreur ZegoCloud:', error);
        alert('Impossible de démarrer l’appel : ' + error.message);
        onClose();
      }
    };

    initZegoCall();

    // Nettoyage propre
    return () => {
      if (zpRef.current) {
        zpRef.current.destroy();
        zpRef.current = null;
      }
    };
  }, [user, selectedChat, onClose]);


  // Ajoute ça quelque part après tes autres useEffect, dans ChatWindow.jsx
useEffect(() => {
  // À chaque fois qu’on change de conversation, on ferme tout appel vidéo en cours
  setIsVideoCallOpen(false);
  setActiveCall(null);
  setIncomingCall(null);
}, [selectedChat?._id]);

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