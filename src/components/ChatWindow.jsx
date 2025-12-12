import React, { useState, useEffect } from "react";
import { Phone, Video, MoreVertical, Smile, Paperclip, Mic } from "lucide-react";
import { useTranslation } from "react-i18next";
import VideoCallScreen from "../components/VideoCallScreen";
import ThemeSelector from "../components/ThemeSelector";
import ChatOptionsMenu from "./ChatOptionMenu";
import InfoContactModal from "./InfoContactModal";
import { motion, AnimatePresence } from "framer-motion";
import { FiSearch } from "react-icons/fi";

// Icon "vu"
const SeenIconGray = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 48 48">
    <path d="M14 27L7 20l1.6-1.6 5.4 5.4 9.5-9.5 1.6 1.6-12 12z" fill="none" stroke="#9e9e9e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M25 27l-4-4 1.6-1.6 4 4 10-10 1.6 1.6-12 12z" fill="none" stroke="#9e9e9e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Format date
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

// Couleur sombre
const isDarkColor = (color) => {
  if (!color) return false;
  let r, g, b;
  if (color.startsWith("#") && color.length === 7) {
    r = parseInt(color.substr(1, 2), 16);
    g = parseInt(color.substr(3, 2), 16);
    b = parseInt(color.substr(5, 2), 16);
  } else return false;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 128;
};

// Fichier → Base64
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });

export default function ChatWindow({ isGroup = false, selectedChat }) {
  const { t } = useTranslation();
  const chatKey = `theme_${selectedChat?.id ?? "default"}`;

  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [themeStyle, setThemeStyle] = useState({});
  const [bubbleBg, setBubbleBg] = useState("");
  const [sendBtnColor, setSendBtnColor] = useState("");
  // themeEmojis will be an array when seasonal theme applied, else []
  const [themeEmojis, setThemeEmojis] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [messages, setMessages] = useState(
    (selectedChat && selectedChat.messages) || [
      { text: "Salut cv ?", fromMe: false, senderName: "Ahmed", date: "2025-11-20", time: "10:00", seen: false },
      { text: "Ça va bien et toi ?", fromMe: true, date: "2025-11-20", time: "10:01", seen: true },
      { text: "Oui tout va bien merci !", fromMe: false, senderName: "Ahmed", date: "2025-11-20", time: "10:02", seen: false },
    ]
  );

  const [reactionPicker, setReactionPicker] = useState(null);
  const [reactionDetails, setReactionDetails] = useState(null);

  // Floating emojis state
  const [floatingEmojis, setFloatingEmojis] = useState([]); // each item: {id,left,top,size,speed,rotate,direction}

  // Smart Search Bubble
  const [openSearch, setOpenSearch] = useState(false);  // si le champ de recherche est visible
  const [searchTerm, setSearchTerm] = useState("");     // texte tapé par l'utilisateur

  const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

  // BUBBLES LIGHT / DARK
  const bubbleClasses = (fromMe) =>
    fromMe
      ? "bg-myYellow2 dark:bg-mydarkYellow text-myBlack rounded-t-xl rounded-bl-xl rounded-br-none px-3 py-2 text-xs"
      : "bg-myGray4 dark:bg-[#2E2F2F] text-myBlack dark:text-white rounded-t-xl rounded-br-xl rounded-bl-none px-3 py-2 text-xs";

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

  // applyTheme now supports seasonal with theme.emojis (array) or theme.emoji (string) for backward compat
  const applyTheme = async (theme, save = true) => {
    let style = {};
    setThemeEmojis([]); // reset

    // Support old single emoji key 'emoji' and new 'emojis' array
    const emojisFromTheme = theme?.emojis ?? (theme?.emoji ? [theme.emoji] : null);

    // Upload fichier
    if (theme.type === "upload" && theme.value instanceof File) {
      const base64 = await fileToBase64(theme.value);
      style = { backgroundImage: `url(${base64})`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" };
      setThemeStyle(style);
      setSendBtnColor("");
      setBubbleBg("");
      if (save) localStorage.setItem(chatKey, JSON.stringify({ ...theme, value: base64 }));
      return;
    }

    // Image Base64
    if ((theme.type === "image" || theme.type === "upload") && typeof theme.value === "string") {
      style = { backgroundImage: `url(${theme.value})`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" };
      setThemeStyle(style);
      setSendBtnColor("");
      setBubbleBg("");
      if (save) localStorage.setItem(chatKey, JSON.stringify(theme));
      return;
    }

    // Couleur, gradient ou saison
    if (theme.type === "color" || theme.type === "gradient" || theme.type === "seasonal") {
      style = { background: theme.value };
      setThemeStyle(style);
      setBubbleBg(theme.value || "");
      setSendBtnColor(theme.value || "");

      // If seasonal and emojis provided -> set them and generate floatingEmojis
      if (theme.type === "seasonal" && emojisFromTheme && Array.isArray(emojisFromTheme) && emojisFromTheme.length > 0) {
        setThemeEmojis(emojisFromTheme);

        // generate floatingEmojis (choose a count you like; 35 is a good default)
        const count = 35;
        const arr = Array.from({ length: count }).map((_, i) => ({
          id: `${Date.now()}_${i}`,
          left: Math.random() * 100, // percent
          top: Math.random() * 60, // percent (0..60) so emojis appear behind messages area (not just top)
          size: 12 + Math.random() * 20, // px
          speed: 0.25 + Math.random() * 0.6,
          rotate: (Math.random() - 0.5) * 30,
          direction: Math.random() > 0.5 ? 1 : -1,
        }));
        setFloatingEmojis(arr);
      } else {
        // not seasonal or no emojis -> clear floatingEmojis
        setThemeEmojis([]);
        setFloatingEmojis([]);
      }

      if (save) localStorage.setItem(chatKey, JSON.stringify(theme));
    }
  };

  const removeTheme = () => {
    setThemeStyle({});
    setBubbleBg("");
    setSendBtnColor("");
    setThemeEmojis([]);
    setFloatingEmojis([]);
    localStorage.removeItem(chatKey);
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem(chatKey);
    if (savedTheme) {
      try {
        const parsed = JSON.parse(savedTheme);
        applyTheme(parsed, false);
      } catch (e) {
        // ignore parse errors
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat]);

  // animation loop for floating emojis
  useEffect(() => {
    if (!themeEmojis || themeEmojis.length === 0) return;
    // update positions periodically
    const id = setInterval(() => {
      setFloatingEmojis(prev => {
        // if prev is empty (race), bail out
        if (!prev || prev.length === 0) return prev;
        return prev.map(e => {
          let newTop = e.top + (e.speed * 0.25); // move down gradually (percent)
          // If emoji moved beyond container (we store top as percent), wrap to top
          if (newTop > 110) newTop = -10;
          let newLeft = e.left + (0.2 * e.direction);
          if (newLeft < 0) {
            newLeft = 0;
            e.direction = 1;
          } else if (newLeft > 100) {
            newLeft = 100;
            e.direction = -1;
          }
          const newRotate = e.rotate + (Math.random() - 0.5) * 2;
          return { ...e, top: newTop, left: newLeft, rotate: newRotate };
        });
      });
    }, 60); // ~16fps

    return () => clearInterval(id);
  }, [themeEmojis]);

  // Cleanly remove floating emojis if user removes theme
  useEffect(() => {
    if (!themeEmojis || themeEmojis.length === 0) {
      setFloatingEmojis([]);
    }
  }, [themeEmojis]);

  return (
    <div className="relative flex flex-col w-full h-full bg-myWhite dark:bg-neutral-900 text-myBlack dark:text-white transition-colors duration-300 min-w-[150px]" style={themeStyle}>
      {/* Floating emojis: render behind content with low z-index */}
      <div aria-hidden className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {floatingEmojis.map(e => {
          // choose a random emoji from themeEmojis for each render
          const randomEmoji = Array.isArray(themeEmojis) && themeEmojis.length > 0
            ? themeEmojis[Math.floor(Math.random() * themeEmojis.length)]
            : null;
          if (!randomEmoji) return null;
          // top/left are percentages (top was percent), ensure px/%
          const topValue = typeof e.top === "number" ? `${e.top}%` : e.top;
          const leftValue = typeof e.left === "number" ? `${e.left}%` : e.left;
          return (
            <span
              key={e.id}
              style={{
                position: "absolute",
                left: leftValue,
                top: topValue,
                fontSize: `${e.size}px`,
                opacity: 0.2 + Math.random() * 0.25,
                transform: `rotate(${e.rotate}deg)`,
                pointerEvents: "none",
                transition: "top 0.06s linear, left 0.06s linear, transform 0.06s linear",
                // subtle blur for background feel (optional)
                WebkitTextStroke: "0px transparent",
                userSelect: "none"
              }}
            >
              {randomEmoji}
            </span>
          );
        })}
      </div>

      {/* HEADER */}
      <header className="flex items-center justify-between px-2 py-2 border-b border-gray-300 dark:border-gray-700 backdrop-blur-sm bg-white/20 dark:bg-black/20 z-20">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => window.history.back()} className="md:hidden mr-2 text-xl">←</button>
          <img src={selectedChat?.avatar} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
          <div className="truncate">
            <div className="text-sm font-semibold truncate">{selectedChat?.name}</div>
            <div className="text-xs truncate text-gray-700 dark:text-gray-300">{isGroup ? `${selectedChat?.members} membres` : selectedChat?.lastSeen || t("chat.online")}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Phone size={16} className="text-gray-600 dark:text-gray-300" />
          <Video size={16} className="text-gray-600 dark:text-gray-300 cursor-pointer" onClick={() => setIsVideoCallOpen(true)} />
          <button onClick={() => setIsOptionsOpen(true)}><MoreVertical size={16} className="text-gray-600 dark:text-gray-300 cursor-pointer" /></button>
        </div>
      </header>

      {/* THEME SELECTOR */}
      {showThemeSelector && <ThemeSelector onSelectTheme={applyTheme} onRemoveTheme={removeTheme} onClose={() => setShowThemeSelector(false)} />}

      {/* MESSAGES (content) — z-10 to be above floating emojis */}
      <main className="flex-1 overflow-y-auto px-2 py-2 space-y-2 relative z-10">
        {messages.map((msg, i) => {
          const showDate = i === 0 || messages[i - 1].date !== msg.date;
          const textColor = msg.fromMe
            ? bubbleBg ? isDarkColor(bubbleBg) ? "#fff" : "#000" : "#000"
            : themeStyle.backgroundImage
              ? "#fff"
              : themeStyle.background
                ? isDarkColor(themeStyle.background) ? "#fff" : "#000"
                : "#000";
          const isMatch = searchTerm && msg.text.toLowerCase().includes(searchTerm.toLowerCase());

          return (
            <div key={i}>
              {showDate && <div className="text-center text-[10px] text-gray-700 dark:text-gray-300 my-2">{formatDateLabel(msg.date, t)}</div>}
              <div className={`flex ${msg.fromMe ? "justify-end" : "justify-start"}`}>
                <div className="flex flex-col max-w-[85%]">
                  {!msg.fromMe && isGroup && <p className="text-[10px] ml-1 mb-1 text-gray-700 dark:text-gray-300">{msg.senderName}</p>}
                  <div
                    className={`${bubbleClasses(msg.fromMe)} ${isMatch ? "ring-2 ring-blue-400" : ""}`}
                    style={{ background: msg.fromMe ? bubbleBg || undefined : undefined, color: textColor }}
                    onClick={() => toggleReactionPicker(i)}
                  >
                    {msg.text}
                  </div>
                  {reactionPicker === i && (
                    <div className={`flex gap-1 bg-myGray3 dark:bg-[#2E2F2F] px-2 py-1 rounded-full shadow mt-1 ${msg.fromMe ? "self-end" : "self-start"}`}>
                      {EMOJIS.map((e) => (
                        <button key={e} className="text-xs" onClick={() => addReaction(i, e)}>{e}</button>
                      ))}
                    </div>
                  )}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="flex mt-1 bg-myGray3 dark:bg-[#2E2F2F] px-2 py-0.5 rounded-full text-[10px] cursor-pointer self-end" onClick={() => setReactionDetails(msg.reactions)}>
                      {msg.reactions.slice(0, 2).map((r, idx) => <span key={idx} className="mr-1">{r.emoji}</span>)}
                      {msg.reactions.length > 2 && <span>+{msg.reactions.length - 2}</span>}
                    </div>
                  )}
                  <div className="text-[8px] mt-1 flex items-center gap-1 justify-end text-gray-700 dark:text-gray-300">
                    <span>{msg.time}</span>
                    {msg.fromMe && msg.seen && <SeenIconGray />}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </main>

      {/* INPUT */}
      <footer className="px-2 py-2 backdrop-blur-sm bg-white/20 dark:bg-black/20 z-20">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-2 rounded-xl flex-1 bg-myGray4 dark:bg-[#2E2F2F] backdrop-blur-md">
            <Smile size={18} className="text-gray-700 dark:text-gray-300" />
            <Paperclip size={18} className="text-gray-700 dark:text-gray-300" />
            <input
              type="text"
              className="flex-1 bg-transparent outline-none text-xs text-myBlack dark:text-white"
              placeholder={t("chat.inputPlaceholder")}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
            />
          </div>
          <button className="w-9 h-9 flex items-center justify-center rounded-xl text-sm font-bold text-myBlack" style={{ background: sendBtnColor || "#FFD700" }} onClick={() => { /* envoyer message */ }}>
            {inputText.trim() === "" ? <Mic size={18} className={`text-gray-700 dark:text-gray-300 ${isRecording ? "animate-pulse" : ""}`} /> : <>➤</>}
          </button>
        </div>
      </footer>

      {isVideoCallOpen && <VideoCallScreen selectedChat={selectedChat} onClose={() => setIsVideoCallOpen(false)} />}

      {/* OPTIONS MODAL */}
      {isOptionsOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-30" onClick={() => setIsOptionsOpen(false)}></div>
          <ChatOptionsMenu
            selectedChat={{
              ...selectedChat,
              openInfo: () => setIsInfoOpen(true),
              openTheme: () => { setShowThemeSelector(true); setIsOptionsOpen(false); }
            }}
            onClose={() => setIsOptionsOpen(false)}
            onOpenSearch={() => setOpenSearch(true)}
          />
        </>
      )}

      {/* INFO MODAL */}
      {isInfoOpen && (
        <InfoContactModal
          chat={{ ...selectedChat, openTheme: () => setShowThemeSelector(true) }}
          onClose={() => setIsInfoOpen(false)}
        />
      )}

      {/* REACTION DETAILS */}
      {reactionDetails && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-myWhite dark:bg-neutral-800 text-myBlack dark:text-white shadow-xl p-3 rounded-xl w-56 z-40">
          <h3 className="font-semibold mb-2 text-sm">{t("chat.reactions")}</h3>
          {reactionDetails.map((r, i) => (
            <div key={i} className="flex justify-between py-1 border-b border-gray-300 dark:border-gray-600 cursor-pointer text-xs" onClick={() => {
              setMessages(prev => {
                const up = [...prev];
                const msgIndex = up.findIndex(m => m.reactions === reactionDetails);
                if (msgIndex !== -1) up[msgIndex].reactions = up[msgIndex].reactions.filter((rr) => !(rr.user === r.user && rr.emoji === r.emoji));
                return up;
              });
            }}>
              <span>{r.user}</span>
              <span>{r.emoji}</span>
            </div>
          ))}
          <button className="mt-2 w-full py-1 bg-myGray4 dark:bg-[#2E2F2F] rounded-lg text-xs" onClick={() => setReactionDetails(null)}>
            {t("chat.close")}
          </button>
        </div>
      )}

      {/* SMART SEARCH BUBBLE */}
      <AnimatePresence>
        {openSearch && (
          <>
            {/* overlay invisible derrière la recherche */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpenSearch(false)}
            ></div>

            {/* champ de recherche */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-20 right-6 w-[300px] bg-white dark:bg-gray-700 rounded-lg shadow-lg p-3 z-50"
            >
              <input
                type="text"
                placeholder={t("chat.searchPlaceholder") || "Rechercher..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 text-xs"
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}