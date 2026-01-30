import React, { useState, useEffect } from "react"; // ← AJOUT useEffect

const formatAudioDuration = (seconds) => {
  if (!seconds || Number.isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const AudioMessage = React.memo(({ src }) => {
  const [duration, setDuration] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false); // ← Nouveau état pour éviter les resets

  useEffect(() => {
    // Reset seulement si src change (pas à chaque re-render)
    setHasLoaded(false);
    setDuration(0);
  }, [src]);

  return (
    <div className="flex items-center gap-2 min-w-[200px]">
      <audio
        src={src}
        controls
        className="flex-1"
        onLoadedMetadata={(e) => {
          if (!hasLoaded) { // ← Met à jour seulement une fois
            setDuration(e.target.duration);
            setHasLoaded(true);
          }
        }}
      />
      <span className="text-xs opacity-70">
        {formatAudioDuration(duration)}
      </span>
    </div>
  );
});

export default AudioMessage;