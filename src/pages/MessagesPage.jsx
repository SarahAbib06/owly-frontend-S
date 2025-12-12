import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import ConversationList from "../components/ConversationList";
import ChatWindow from "../components/ChatWindow";
import WelcomeChatScreen from "../components/WelcomeChatScreen";

import { Search, QrCode } from "lucide-react"; // AJOUTEZ CES IMPORTS
import SearchModal from "../components/SearchModal"; // NOUVEAU COMPOSANT

export default function Messages() {
  const [selectedChat, setSelectedChat] = useState(null);
  const [showSearchModal, setShowSearchModal] = useState(false); // ÉTAT POUR LA MODAL


  const { setChatOpen } = useOutletContext();

  const openChat = (chat) => {
    setSelectedChat(chat);

    setChatOpen(true);

  };

  const closeChat = () => {
    setSelectedChat(null);

    setChatOpen(false);
  };

  return (
    <div className="flex h-screen relative">
      
      {/* === BOUTON RECHERCHE FLOTTANT === */}
      <button
        onClick={() => setShowSearchModal(true)}
        className="fixed bottom-6 right-6 z-40 bg-[#F9EE34] hover:bg-yellow-500 text-black p-4 rounded-full shadow-lg flex items-center justify-center"
        style={{ width: '60px', height: '60px' }}
      >
        <Search size={24} />
      </button>


      {/* === LISTE === */}
      <div className={` 
        ${selectedChat ? "hidden md:block" : "block"} 
        w-full md:w-[360px] border-r
      `}>
        <ConversationList onSelect={openChat} />
      </div>

      {/* === CHAT === */}
      <div className={`flex-1 
        ${selectedChat ? "block" : "hidden md:block"}
      `}>
        {selectedChat ? (
          <ChatWindow
            selectedChat={selectedChat}
            onBack={closeChat}
          />
        ) : (
          <div className="hidden md:flex flex-1 h-full w-full justify-center items-center">
            <WelcomeChatScreen />
          </div>
        )}
      </div>


      {/* === MODAL DE RECHERCHE === */}
      {showSearchModal && (
        <SearchModal 
          onClose={() => setShowSearchModal(false)}
          onUserSelect={(user) => {
            setShowSearchModal(false);
            // Créer ou ouvrir une conversation avec cet utilisateur
            openChat({
              _id: `direct_${user._id}`,
              type: 'direct',
              participants: [user],
              lastMessage: null
            });
          }}
        />
      )}
    </div>
  );
}

