// frontend/src/components/ChatInput.jsx
import React, { useState, useRef, useEffect } from "react";
import { Smile, Paperclip, Mic, Send } from "lucide-react";
import EmojiPicker from 'emoji-picker-react';

const ChatInput = React.memo(({ 
  onSendMessage,
  isRecording,
  recordingTime,
  onMicClick,
  onCancelRecording,
  selectedFile,
  filePreview,
  onFileSelect,
  onClearFile,
  t
}) => {
  const [inputText, setInputText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef(null);

  const handleInputChange = (e) => {
    setInputText(e.target.value);
  };

  const handleSend = () => {
    if (selectedFile || inputText.trim()) {
      onSendMessage(inputText, selectedFile);
      setInputText("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !isRecording) {
      e.preventDefault();
      handleSend();
    }
  };

  const onEmojiClick = (emojiObject) => {
    setInputText((prev) => prev + emojiObject.emoji);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showEmojiPicker && !event.target.closest('.EmojiPickerReact')) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  return (
    <>
      {isRecording && (
        <div className="mb-2 flex items-center justify-center gap-2 text-red-500">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">
            {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, "0")}
          </span>
          <button onClick={onCancelRecording} className="ml-4 text-xs underline">
            {t("cancelRecording") || "Annuler"}
          </button>
        </div>
      )}

      {selectedFile && (
        <div className="mb-2 p-2 border rounded bg-white dark:bg-neutral-800">
          {selectedFile.type.startsWith("image/") && (
            <img src={filePreview} className="max-h-40 rounded" alt="preview" />
          )}
          {selectedFile.type.startsWith("video/") && (
            <video src={filePreview} controls className="max-h-40 rounded" />
          )}
          {!selectedFile.type.startsWith("image/") && !selectedFile.type.startsWith("video/") && (
            <p className="text-sm">📎 {selectedFile.name}</p>
          )}
          <button onClick={onClearFile} className="text-xs text-red-500 underline mt-1">
            {t("cancel") || "Annuler"}
          </button>
        </div>
      )}

      <div className="relative">
        {showEmojiPicker && (
          <div className="absolute bottom-16 left-0 z-50">
            <EmojiPicker
              onEmojiClick={onEmojiClick}
              theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
              searchDisabled={false}
              skinTonesDisabled={false}
              height={400}
              width={320}
            />
          </div>
        )}

        <div className="flex items-center gap-2 w-full">
          <div className="flex-1 flex items-center gap-2 px-4 py-4 rounded-xl bg-myGray4 dark:bg-[#2E2F2F] backdrop-blur-md">
            <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} type="button">
              <Smile
                size={18}
                className={`cursor-pointer transition-colors ${
                  showEmojiPicker ? 'text-myYellow' : 'text-gray-700 dark:text-gray-300'
                }`}
              />
            </button>

            <Paperclip
              size={18}
              className="text-gray-700 dark:text-gray-300 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            />
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) onFileSelect(file);
              }}
              className="hidden"
              accept="image/*,video/*,application/*"
            />
            <input
              type="text"
              className="flex items-center flex-1 bg-transparent outline-none text-xs text-myBlack dark:text-white"
              placeholder={t("chat.inputPlaceholder") || "Tapez un message..."}
              value={inputText}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              disabled={isRecording}
            />
          </div>

          <button
            className={`w-12 h-12 flex items-center justify-center rounded-xl text-sm font-bold ${
              isRecording ? 'bg-red-500 animate-pulse' : 'bg-myYellow2 dark:bg-mydarkYellow'
            }`}
            onClick={
              isRecording
                ? onMicClick
                : selectedFile || inputText.trim() !== ""
                ? handleSend
                : onMicClick
            }
            disabled={isRecording && recordingTime < 1}
          >
            {isRecording ? (
              <Send size={18} className="text-white" />
            ) : selectedFile || inputText.trim() !== "" ? (
              <Send size={18} />
            ) : (
              <Mic size={18} className="text-gray-700 dark:myBlack" />
            )}
          </button>
        </div>
      </div>
    </>
  );
});

ChatInput.displayName = "ChatInput";

export default ChatInput;