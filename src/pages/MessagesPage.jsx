import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import ConversationList from "../components/ConversationList";
import ChatWindow from "../components/ChatWindow";
import WelcomeChatScreen from "../components/WelcomeChatScreen";

export default function Messages() {
  const [selectedChat, setSelectedChat] = useState(null);

  const { setChatOpen } = useOutletContext();

  const openChat = (chat) => {
    setSelectedChat(chat);
    setChatOpen(true);   // 🔥 Dit à MainLayout de cacher Sidebar
  };

  const closeChat = () => {
    setSelectedChat(null);
    setChatOpen(false);  // 🔥 Remet le Sidebar
  };

  return (
    <div className="flex h-screen">

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

    </div>
  );
}
