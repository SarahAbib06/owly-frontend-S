// frontend/src/pages/MessagesPage.jsx
import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import ConversationList from "../components/ConversationList";
import ChatWindow from "../components/ChatWindow";
import WelcomeChatScreen from "../components/WelcomeChatScreen";
import { Search, Plus, QrCode  } from "lucide-react";
import SearchModal from "../components/SearchModal"; // NOUVEAU COMPOSANT
export default function Messages() {
  const [selectedChat, setSelectedChat] = useState(null);
  const [showSearchModal, setShowSearchModal] = useState(false); // ÉTAT POUR LA MODAL


  const { setChatOpen } = useOutletContext();

  const openChat = (chat, isFromArchived = false) => {
  setSelectedChat({
    ...chat,
    isFromArchived,
  });
  setChatOpen(true);
};


  const closeChat = () => {
    setSelectedChat(null);


    setChatOpen(false);
  };

  return (
    <div className="flex h-screen relative">
      
      {/* === BOUTON NOUVELLE DISCUSSION === */}



      {/* LISTE DES CONVERSATIONS */}
      <div className={`
        ${selectedChat ? "hidden md:block" : "block"} 
        w-full md:w-[360px] border-r border-gray-300 dark:border-gray-700
      `}>
        <ConversationList
  onSelect={openChat}
  onNewChat={() => setShowSearchModal(true)}
/>
      </div>

      {/* FENÊTRE DE CHAT */}
      <div className={`flex-1 ${selectedChat ? "block" : "hidden md:block"}`}>
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
        onUserSelect={async (user) => {
          setShowSearchModal(false);

          const token = localStorage.getItem('token');

          try {
            const res = await fetch('http://localhost:5000/api/conversations/private', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ receiverId: user._id })
            });

            if (!res.ok) {
              const errorData = await res.json().catch(() => ({}));
              throw new Error(errorData.error || 'Erreur serveur');
            }

            const data = await res.json();

            if (data.success && data.conversation) {
              openChat({
                _id: data.conversation._id,
                type: 'private',
                participants: [user]
              });
            }
          } catch (err) {
            console.error(err);
            alert("Impossible d'ouvrir la conversation");
          }
        }}
      />
    )}
    </div>
  );
}
