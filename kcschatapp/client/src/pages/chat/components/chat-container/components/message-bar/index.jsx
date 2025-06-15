import MentionSuggestions from "./components/MainSuggestions"; // ✅ FIXED: move import to top
import { IoSend } from "react-icons/io5";
import { GrAttachment } from "react-icons/gr";
import { RiEmojiStickerLine } from "react-icons/ri";
import EmojiPicker from "emoji-picker-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { useAppStore } from "@/store";
import { useSocket } from "@/contexts/SocketContext";
import { MESSAGE_TYPES, UPLOAD_FILE } from "@/lib/constants";
import apiClient from "@/lib/api-client";


const MessageBar = () => {
  const emojiRef = useRef();
  const fileInputRef = useRef();
  const messageInputRef = useRef();
  const {
    selectedChatData,
    userInfo,
    selectedChatType,
    setIsUploading,
    setFileUploadProgress,
  } = useAppStore();
  const [message, setMessage] = useState("");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const socket = useSocket();

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionQuery, setSuggestionQuery] = useState("");
  const [currentMentionStartIndex, setCurrentMentionStartIndex] = useState(-1);
  const [currentMentionedUserIds, setCurrentMentionedUserIds] = useState([]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (emojiRef.current && !emojiRef.current.contains(event.target)) {
        setEmojiPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddEmoji = (emoji) => {
    setMessage((msg) => msg + emoji.emoji);
    if (messageInputRef.current) messageInputRef.current.focus();
  };

  const processSuggestions = useCallback((text, cursorPosition) => {
    if (selectedChatType !== "channel" || !selectedChatData?.members) {
      setShowSuggestions(false);
      return;
    }

    let atIndex = -1;
    let query = "";
    let activeMention = false;

    for (let i = cursorPosition - 1; i >= 0; i--) {
      if (text[i] === '@' && (i === 0 || text[i - 1] === ' ' || text[i - 1] === '\n')) {
        const partAfterAt = text.substring(i + 1, cursorPosition);
        const spaceAfterQuery = text.substring(cursorPosition).startsWith(' ');
        if (!partAfterAt.includes(' ') && !spaceAfterQuery) {
          atIndex = i;
          query = partAfterAt;
          activeMention = true;
        }
        break;
      }
      if (text[i] === ' ' || text[i] === '\n') {
        if (atIndex === -1) activeMention = false;
        break;
      }
    }

    if (activeMention && atIndex !== -1) {
      setCurrentMentionStartIndex(atIndex);
      setSuggestionQuery(query);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setCurrentMentionStartIndex(-1);
      setSuggestionQuery("");
    }
  }, [selectedChatData, selectedChatType]);

  const handleMessageChange = (event) => {
    const text = event.target.value;
    setMessage(text);
    processSuggestions(text, event.target.selectionStart);
    if (text === "") setCurrentMentionedUserIds([]);
  };

  const handleSelectSuggestion = (member) => {
    if (currentMentionStartIndex === -1) return;

    const textBeforeMention = message.substring(0, currentMentionStartIndex);
    const mentionDisplayName = `${member.firstName}${member.lastName || ""}`;
    const mention = `@${mentionDisplayName} `;
    const queryEndPosition = currentMentionStartIndex + suggestionQuery.length + 1;
    const textAfterMention = message.substring(queryEndPosition);

    setMessage(textBeforeMention + mention + textAfterMention);
    setCurrentMentionedUserIds((prevIds) => {
      const newIds = new Set([...prevIds, member._id]);
      return Array.from(newIds);
    });

    setShowSuggestions(false);
    setSuggestionQuery("");
    setCurrentMentionStartIndex(-1);

    setTimeout(() => {
      if (messageInputRef.current) {
        messageInputRef.current.focus();
        const newCursorPosition = textBeforeMention.length + mention.length;
        messageInputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape" && showSuggestions) {
      event.preventDefault();
      setShowSuggestions(false);
    }
  };

  const handleSendMessage = async () => {
    if (message.trim() === "") {
      setCurrentMentionedUserIds([]);
      return;
    }

    const tempId = Date.now().toString();

    if (selectedChatType === "contact") {
      socket.emit("sendMessage", {
        sender: userInfo.id,
        content: message,
        recipient: selectedChatData._id,
        messageType: MESSAGE_TYPES.TEXT,
        tempId,
      });
    } else if (selectedChatType === "channel") {
      socket.emit("send-channel-message", {
        sender: userInfo.id,
        content: message,
        messageType: MESSAGE_TYPES.TEXT,
        channelId: selectedChatData._id,
        mentionedUserIds: currentMentionedUserIds,
        tempId,
      });
    }

    setMessage("");
    setCurrentMentionedUserIds([]);
    setShowSuggestions(false);
  };

  const handleAttachmentChange = async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;

      const tempId = Date.now().toString();
      const formData = new FormData();
      formData.append("file", file);
      setIsUploading(true);

      const response = await apiClient.post(UPLOAD_FILE, formData, {
        withCredentials: true,
        onUploadProgress: (data) => {
          setFileUploadProgress(Math.round((100 * data.loaded) / data.total));
        },
      });

      setIsUploading(false);
      if (response.status === 200 && response.data) {
        const payload = {
          sender: userInfo.id,
          fileUrl: response.data.filePath,
          messageType: MESSAGE_TYPES.FILE,
          tempId,
        };

        if (selectedChatType === "contact") {
          socket.emit("sendMessage", {
            ...payload,
            recipient: selectedChatData._id,
          });
        } else {
          socket.emit("send-channel-message", {
            ...payload,
            channelId: selectedChatData._id,
            mentionedUserIds: [],
          });
        }
      }
    } catch (error) {
      setIsUploading(false);
      setFileUploadProgress(0);
      console.error("Error uploading file:", error);
    }
  };

  const handleAttachmentClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="h-[10vh] bg-[#1c1d25] flex justify-center items-center px-8 gap-6 mb-5 relative">
      {selectedChatType === "channel" && selectedChatData && (
        <MentionSuggestions
          members={selectedChatData.members || []}
          admin={selectedChatData.admin}
          query={suggestionQuery}
          onSelectUser={handleSelectSuggestion}
          show={showSuggestions}
        />
      )}

      <div className="flex-1 flex bg-[#2a2b33] rounded-md items-center gap-5 pr-5">
        <input
          ref={messageInputRef}
          type="text"
          className="flex-1 p-5 bg-transparent rounded-md focus:border-none focus:outline-none"
          placeholder="Enter message"
          value={message}
          onChange={handleMessageChange}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
        />
        <button
          className="text-neutral-300 focus:border-none focus:outline-none focus:text-white transition-all duration-300"
          onClick={handleAttachmentClick}
        >
          <GrAttachment className="text-2xl" />
        </button>
        <input
          type="file"
          className="hidden"
          ref={fileInputRef}
          onChange={handleAttachmentChange}
        />
        <div className="relative">
          <button
            className="text-neutral-300 focus:border-none focus:outline-none focus:text-white transition-all duration-300"
            onClick={() => setEmojiPickerOpen(true)}
          >
            <RiEmojiStickerLine className="text-2xl " />
          </button>
          <div className="absolute bottom-16 right-0" ref={emojiRef}>
            <EmojiPicker
              theme="dark"
              open={emojiPickerOpen}
              onEmojiClick={handleAddEmoji}
              autoFocusSearch={false}
            />
          </div>
        </div>
      </div>
      <button
        className="bg-[#8417ff] rounded-md flex items-center justify-center p-5 gap-2 focus:border-none focus:outline-none hover:bg-[#741bda] focus:bg-[#741bda] transition-all duration-300 "
        onClick={handleSendMessage}
      >
        <IoSend className="text-2xl" />
      </button>
    </div>
  );
};

export default MessageBar;
