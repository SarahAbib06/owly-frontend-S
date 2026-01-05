import React from 'react';

const MessageRequestBanner = ({ conversationName, conversationAvatar, onAccept, onDelete }) => (
  <div className="fixed top-16 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 rounded-2xl shadow-2xl z-50 max-w-sm w-full mx-4">
    <div className="flex items-center gap-3 mb-4">
      <img src={conversationAvatar || '/default-avatar.png'} alt={conversationName} className="w-12 h-12 rounded-full" />
      <div>
        <p className="font-bold text-lg">{conversationName}</p>
        <p className="text-sm opacity-90">veut discuter avec vous</p>
      </div>
    </div>
    <div className="flex gap-3 justify-center">
      <button 
        onClick={onAccept}
        className="bg-white text-indigo-600 px-8 py-3 rounded-full font-semibold hover:scale-105 transition-all shadow-lg"
      >
        Accepter
      </button>
      <button 
        onClick={onDelete}
        className="border-2 border-white px-8 py-3 rounded-full font-semibold hover:bg-white/20 transition-all"
      >
        Refuser
      </button>
    </div>
  </div>
);

export default MessageRequestBanner;
