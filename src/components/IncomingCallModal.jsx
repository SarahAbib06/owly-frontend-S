import React, { useEffect, useRef } from 'react';
import { Phone, X } from 'lucide-react';
import './IncomingCallModal.css';

const IncomingCallModal = ({ callData, onAccept, onReject }) => {
  const ringtoneAudioRef = useRef(null);

  console.log('📞 IncomingCallModal rendu avec callData:', callData);

  // Jouer la sonnerie quand le modal s'affiche
  useEffect(() => {
    console.log('🔄 useEffect appelé avec callData:', callData);
    if (callData) {
      console.log('🎵 Appel de playRingtone');
      playRingtone();
    }

    return () => {
      console.log('🛑 Cleanup: arrêt de la sonnerie');
      stopRingtone();
    };
  }, [callData]);

  // Jouer une sonnerie
  const playRingtone = async () => {
    console.log('🔔 Sonnerie du modal jouée');
    stopRingtone(); // Arrêter d'abord si en cours

    try {
      // Créer un contexte audio et le reprendre si nécessaire
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Reprendre le contexte audio (nécessaire pour les navigateurs modernes)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Fonction pour jouer un bip
      const playBeep = () => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.5);
      };

      // Jouer le premier bip immédiatement
      playBeep();

      // Répéter toutes les 2 secondes
      ringtoneAudioRef.current = {
        interval: setInterval(playBeep, 2000),
        context: audioContext
      };

    } catch (error) {
      console.log('❌ Erreur sonnerie Web Audio:', error);
      // Fallback: utiliser un fichier audio existant
      try {
        const audio = new Audio('/assets/sounds/click.wav');
        audio.loop = true;
        audio.volume = 0.8;
        await audio.play();
        ringtoneAudioRef.current = { audio };
        console.log('✅ Fallback sonnerie jouée avec fichier audio');
      } catch (fallbackError) {
        console.log('❌ Fallback sonnerie aussi échoué:', fallbackError);
        // Dernier fallback: utiliser Notification API si disponible
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Appel entrant', {
            body: `Appel de ${callData?.callerName || 'Quelqu\'un'}`,
            icon: '/assets/images/owlylogo.png'
          });
        }
      }
    }
  };

  // Arrêter la sonnerie
  const stopRingtone = () => {
    console.log('🔕 Sonnerie du modal arrêtée');
    if (ringtoneAudioRef.current) {
      if (ringtoneAudioRef.current.interval) {
        clearInterval(ringtoneAudioRef.current.interval);
      }
      if (ringtoneAudioRef.current.pause) {
        ringtoneAudioRef.current.pause();
      }
      ringtoneAudioRef.current = null;
    }
  };

  // Gestionnaires d'événements pour arrêter la sonnerie
  const handleAccept = () => {
    stopRingtone();
    onAccept();
  };

  const handleReject = () => {
    stopRingtone();
    onReject();
  };

  if (!callData) return null;

  return (
    <div className="incoming-call-modal-overlay">
      <div className="incoming-call-modal">
        <div className="modal-content">
          <div className="caller-avatar">
            {callData.callerName?.charAt(0).toUpperCase() || 'U'}
          </div>

          <div className="caller-info">
            <h3>Appel vidéo entrant</h3>
            <p className="caller-name">{callData.callerName}</p>
            <p className="call-type">Appel vidéo</p>
          </div>

          <div className="modal-controls">
            <button
              className="accept-btn"
              onClick={handleAccept}
            >
              <Phone size={24} />
              <span>Accepter</span>
            </button>

            <button
              className="reject-btn"
              onClick={handleReject}
            >
              <X size={24} />
              <span>Refuser</span>
            </button>
          </div>

          {/* Bouton de test pour la sonnerie */}
          <div style={{ marginTop: '10px', textAlign: 'center' }}>
            <button
              onClick={() => playRingtone()}
              style={{
                background: '#007bff',
                color: 'white',
                border: 'none',
                padding: '5px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              🔊 Test Sonnerie
            </button>
          </div>

          <div className="ringing-animation">
            <div className="ring-ring"></div>
            <div className="ring-ring"></div>
            <div className="ring-ring"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;