// frontend/src/components/ScheduledMessagesList.jsx
import React from 'react';
import { Calendar, Clock, X } from 'lucide-react';

export default function ScheduledMessagesList({ messages, onCancel }) {
  if (!messages || messages.length === 0) return null;

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
      <div className="px-4 py-2">
        <p className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-2">
          📅 {messages.length} message{messages.length > 1 ? 's' : ''} programmé{messages.length > 1 ? 's' : ''}
        </p>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {messages.map((msg) => (
            <div
              key={msg._id}
              className="bg-white dark:bg-neutral-800 rounded-lg p-2 flex items-start gap-2 text-xs"
            >
              <div className="flex-1">
                <p className="text-gray-900 dark:text-white line-clamp-1 font-medium">
                  {msg.content}
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-[10px] mt-1">
                  <Clock size={10} className="inline mr-1" />
                  {new Date(msg.scheduledFor).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <button
                onClick={() => onCancel(msg._id)}
                className="text-red-500 hover:text-red-700 transition"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}