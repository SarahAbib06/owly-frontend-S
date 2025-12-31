import React, { useEffect, useState } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { motion } from 'framer-motion';

export default function IncomingCallModal({ call, onAccept, onReject }) {
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    // Auto-reject après 30 secondes
    const timeout = setTimeout(() => {
      onReject();
    }, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [onReject]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl"
      >
        {/* Avatar */}
        <div className="flex flex-col items-center mb-6">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="relative"
          >
            <img
              src={call.callerAvatar || '/default-avatar.png'}
              alt={call.callerName}
              className="w-24 h-24 rounded-full object-cover ring-4 ring-blue-500"
            />
            <div className="absolute -bottom-2 -right-2 bg-blue-500 rounded-full p-2">
              {call.callType === 'video' ? (
                <Video size={20} className="text-white" />
              ) : (
                <Phone size={20} className="text-white" />
              )}
            </div>
          </motion.div>

          <h3 className="text-xl font-bold mt-4 text-gray-900 dark:text-white">
            {call.callerName}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Appel {call.callType === 'video' ? 'vidéo' : 'audio'} entrant...
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
            {timeElapsed}s
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-8">
          {/* Rejeter */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onReject}
            className="bg-red-500 hover:bg-red-600 text-white rounded-full p-5 shadow-lg"
          >
            <PhoneOff size={28} />
          </motion.button>

          {/* Accepter */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onAccept}
            className="bg-green-500 hover:bg-green-600 text-white rounded-full p-5 shadow-lg"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            {call.callType === 'video' ? (
              <Video size={28} />
            ) : (
              <Phone size={28} />
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}