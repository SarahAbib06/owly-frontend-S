// frontend/src/components/ScheduleMessageModal.jsx
import React, { useState } from 'react';
import { X, Calendar, Clock, Send } from 'lucide-react';
import Modal from './Modal';

export default function ScheduleMessageModal({ isOpen, onClose, onSchedule, initialMessage = '' }) {
  const [message, setMessage] = useState(initialMessage);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [loading, setLoading] = useState(false);

  // Date minimale = maintenant + 1 minute
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    return now.toISOString().slice(0, 16);
  };

  const handleSchedule = async () => {
    if (!message.trim() || !scheduledDate || !scheduledTime) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    
    if (scheduledDateTime <= new Date()) {
      alert('La date doit être dans le futur');
      return;
    }

    setLoading(true);
    try {
      await onSchedule({
        content: message.trim(),
        scheduledFor: scheduledDateTime.toISOString()
      });
      
      setMessage('');
      setScheduledDate('');
      setScheduledTime('');
      onClose();
    } catch (error) {
      console.error('Erreur programmation message:', error);
      alert('Erreur lors de la programmation du message');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar size={20} className="text-myYellow" />
            Programmer un message
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Écrivez votre message..."
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-myYellow focus:border-transparent resize-none"
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
              {message.length}/1000
            </p>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar size={16} className="inline mr-1" />
              Date
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-myYellow focus:border-transparent"
            />
          </div>

          {/* Heure */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Clock size={16} className="inline mr-1" />
              Heure
            </label>
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-myYellow focus:border-transparent"
            />
          </div>

          {/* Aperçu date complète */}
          {scheduledDate && scheduledTime && (
            <div className="bg-myYellow/10 dark:bg-myYellow/20 rounded-lg p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                📅 Envoi prévu le{' '}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}{' '}
                  à{' '}
                  {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-neutral-900 border-t border-gray-200 dark:border-neutral-700 flex gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-lg transition"
          >
            Annuler
          </button>
          <button
            onClick={handleSchedule}
            disabled={loading || !message.trim() || !scheduledDate || !scheduledTime}
            className="flex-1 px-4 py-2.5 bg-myYellow hover:bg-yellow-400 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Programmation...
              </>
            ) : (
              <>
                <Send size={16} />
                Programmer
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}