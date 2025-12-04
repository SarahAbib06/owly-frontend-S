 import React, { useState } from "react";
import { Phone, Video, MoreVertical, Smile, Paperclip } from "lucide-react";
import { useTranslation } from "react-i18next";
import VideoCallScreen from "../components/VideoCallScreen";
import ChatOptionsMenu from "./ChatOptionMenu";
import InfoContactModal from "./InfoContactModal";



// Icône "vu"
const SeenIconGray = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 48 48">
    <path
      d="M14 27L7 20l1.6-1.6 5.4 5.4 9.5-9.5 1.6 1.6-12 12z"
      fill="none"
      stroke="#9e9e9e"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M25 27l-4-4 1.6-1.6 4 4 10-10 1.6 1.6-12 12z"
      fill="none"
      stroke="#9e9e9e"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const formatDateLabel = (dateString, t) => {
  if (!dateString) return "";
  const msgDate = new Date(dateString);
  const today = new Date();

  const diff = today.setHours(0, 0, 0, 0) - msgDate.setHours(0, 0, 0, 0);

  if (diff === 0) return t("chat.today");
  if (diff === 86400000) return t("chat.yesterday");

  return msgDate.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export default function ChatWindow({ isGroup = false, selectedChat }) {

  const { t } = useTranslation();
    const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);
    const [isInfoOpen, setIsInfoOpen] = useState(false);









  const [messages, setMessages] = useState(
    selectedChat.messages || [
      { text: "Salut cv ?", fromMe: false, senderName: "Ahmed", date: "2025-11-20", time: "10:00", seen: false },
      { text: "Ça va bien et toi ?", fromMe: true, date: "2025-11-20", time: "10:01", seen: true },
      { text: "Oui tout va bien merci !", fromMe: false, senderName: "Ahmed", date: "2025-11-20", time: "10:02", seen: false },
    ]
  );

  const [reactionPicker, setReactionPicker] = useState(null);
  const [reactionDetails, setReactionDetails] = useState(null);

  const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

  // BUBBLES LIGHT / DARK
  const bubbleClasses = (fromMe) =>
    fromMe
      ? "bg-myYellow2 dark:bg-mydarkYellow text-myBlack rounded-t-xl rounded-bl-xl rounded-br-none"
      : "bg-myGray4 dark:bg-[#2E2F2F] text-myBlack dark:text-white rounded-t-xl rounded-br-xl rounded-bl-none";

  const toggleReactionPicker = (i) => {
    setReactionPicker(reactionPicker === i ? null : i);
  };

  // ADD / REMOVE REACTION
  const addReaction = (index, emoji) => {
    setMessages((prev) => {
      const updated = [...prev];
      if (!updated[index].reactions) updated[index].reactions = [];

      const user = updated[index].fromMe ? "Moi" : updated[index].senderName;

      if (!updated[index].reactions.find((r) => r.user === user && r.emoji === emoji)) {
        updated[index].reactions.push({ emoji, user });
      }

      return updated;
    });

    setReactionPicker(null);
  };





  return (
    <div className="relative flex flex-col w-full h-full bg-myWhite dark:bg-neutral-900 text-myBlack dark:text-white transition-colors duration-300 min-w-[150px]">

      {/* HEADER */}
      <header className="flex items-center justify-between px-2 py-2 border-b border-gray-300 dark:border-gray-700 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => window.history.back()} className="md:hidden mr-2 text-xl">←</button>
          <img src={selectedChat.avatar} className="w-8 h-8 rounded-full object-cover" />
          <div className="truncate">
            <div className="text-sm font-semibold truncate">{selectedChat.name}</div>
            <div className="text-xs truncate text-gray-500 dark:text-gray-300">
              {isGroup ? `${selectedChat.members} membres` : selectedChat.lastSeen || t("chat.online")}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Phone size={16} className="text-gray-600 dark:text-gray-300" />
         <Video 
  size={16}
  className="text-gray-600 dark:text-gray-300 cursor-pointer"
  onClick={() => setIsVideoCallOpen(true)}
/>

          <MoreVertical
  size={16}
  className="text-gray-600 dark:text-gray-300 cursor-pointer"
  onClick={() => setIsOptionsOpen(!isOptionsOpen)}
/>

        </div>
      </header>

      {/* MESSAGES */}
      <main className="flex-1 overflow-y-auto px-2 py-2 space-y-2">
        {messages.map((msg, i) => {
          const showDate = i === 0 || messages[i - 1].date !== msg.date;
          



          return (
            <div key={i}>
              {showDate && (
                <div className="text-center text-[10px] text-gray-500 dark:text-gray-300 my-2">
                  {formatDateLabel(msg.date, t)}
                </div>
              )}

              <div className={`flex ${msg.fromMe ? "justify-end" : "justify-start"}`}>
                <div className="flex flex-col max-w-[85%]">

                  {/* Name in groups */}
                  {!msg.fromMe && isGroup && (
                    <p className="text-[10px] ml-1 mb-1 text-gray-600 dark:text-gray-300">
                      {msg.senderName}
                    </p>
                  )}

                  {/* BUBBLE */}
                  <div
                    className={`px-3 py-2 text-xs ${bubbleClasses(msg.fromMe)}`}
                    onClick={() => toggleReactionPicker(i)}
                  >
                    {msg.text}
                  </div>

                  {/* REACTION PICKER */}
                  {reactionPicker === i && (
                    <div className={`flex gap-1 bg-myGray3 dark:bg-[#2E2F2F] px-2 py-1 rounded-full shadow mt-1 ${msg.fromMe ? "self-end" : "self-start"}`}>
                      {EMOJIS.map((e) => (
                        <button key={e} className="text-xs" onClick={() => addReaction(i, e)}>
                          {e}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* ⭐ REACTIONS DISPLAYED UNDER MESSAGE */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div
                      className="flex mt-1 bg-myGray3 dark:bg-[#2E2F2F] px-2 py-0.5 rounded-full text-[10px] cursor-pointer self-end"
                      onClick={() => setReactionDetails(msg.reactions)}
                    >
                      {msg.reactions.slice(0, 2).map((r, idx) => (
                        <span key={idx} className="mr-1">{r.emoji}</span>
                      ))}

                      {msg.reactions.length > 2 && (
                        <span>+{msg.reactions.length - 2}</span>
                      )}
                    </div>
                  )}

                  {/* TIME + SEEN */}
                  <div className="text-[8px] mt-1 flex items-center gap-1 justify-end text-gray-600 dark:text-gray-300">
                    <span>{msg.time}</span>
                    {msg.fromMe && msg.seen && <SeenIconGray />}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </main>

      {/* ⭐ POPUP LISTE DES RÉACTIONS */}
      {reactionDetails && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-myWhite dark:bg-neutral-800 text-myBlack dark:text-white shadow-xl p-3 rounded-xl w-56 z-20">
          <h3 className="font-semibold mb-2 text-sm">{t("chat.reactions")}</h3>

          {reactionDetails.map((r, i) => (
            <div
              key={i}
              className="flex justify-between py-1 border-b border-gray-300 dark:border-gray-600 cursor-pointer text-xs"
              onClick={() => {
                // remove reaction
                setMessages(prev => {
                  const up = [...prev];
                  const msgIndex = up.findIndex(m => m.reactions === reactionDetails);
                  if (msgIndex !== -1) {
                    up[msgIndex].reactions = up[msgIndex].reactions.filter(
                      (rr) => !(rr.user === r.user && rr.emoji === r.emoji)
                    );
                  }
                  return up;
                });
              }}
            >
              <span>{r.user}</span>
              <span>{r.emoji}</span>
            </div>
          ))}

          <button
            className="mt-2 w-full py-1 bg-myGray4 dark:bg-[#2E2F2F] rounded-lg text-xs"
            onClick={() => setReactionDetails(null)}
          >
            {t("chat.close")}
          </button>
        </div>
      )}

      {/* INPUT */}
      <footer className="px-2 py-2 bg-myWhite dark:bg-neutral-900">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-2 rounded-xl flex-1 bg-myGray4 dark:bg-[#2E2F2F]">
            <Smile size={18} className="text-gray-700 dark:text-gray-300" />
            <Paperclip size={18} className="text-gray-700 dark:text-gray-300" />

            <input
              type="text"
              className="flex-1 bg-transparent outline-none text-xs text-myBlack dark:text-white"
              placeholder={t("chat.inputPlaceholder")}
            />
          </div>

          <button className="w-9 h-9 flex items-center justify-center rounded-xl text-sm font-bold bg-myYellow2 dark:bg-mydarkYellow text-myBlack">
            ➤
          </button>
        </div>
      </footer>
{isVideoCallOpen && (
  <VideoCallScreen
    selectedChat={selectedChat}
    onClose={() => setIsVideoCallOpen(false)}
  />
)}

{/* ⭐ MODAL OPTIONS (3 points) */}
{isOptionsOpen && (
  <>
    <div
      className="fixed inset-0 bg-black/30 z-30"
      onClick={() => setIsOptionsOpen(false)}
    ></div>

    <ChatOptionsMenu
      selectedChat={{
        ...selectedChat,
        openInfo: () => setIsInfoOpen(true)
      }}
      onClose={() => setIsOptionsOpen(false)}
    />
  </>
)}
{/* ⭐ MODAL INFO DU CONTACT */}
{isInfoOpen && (
  <InfoContactModal
    chat={selectedChat}
    onClose={() => setIsInfoOpen(false)}
  />
)}



 




    </div>
  );
}
