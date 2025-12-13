// frontend/src/pages/MessagesPage.jsx
import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import ConversationList from "../components/ConversationList";
import ChatWindow from "../components/ChatWindow";
import WelcomeChatScreen from "../components/WelcomeChatScreen";
import { Search } from "lucide-react";

export default function MessagesPage() {
  const [selectedChat, setSelectedChat] = useState(null);
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
      
 

      {/* LISTE DES CONVERSATIONS */}
      <div className={`
        ${selectedChat ? "hidden md:block" : "block"} 
        w-full md:w-[360px] border-r border-gray-300 dark:border-gray-700
      `}>
        <ConversationList onSelect={openChat} />
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

    </div>
  );
}