import { IoSend } from "react-icons/io5";
import { GrAttachment } from "react-icons/gr";
import { RiEmojiStickerLine } from "react-icons/ri";
import EmojiPicker from "emoji-picker-react";
import { useEffect, useRef, useState, useCallback } from "react"; // Added useCallback
import { useAppStore } from "@/store";
import { useSocket } from "@/contexts/SocketContext";
import { MESSAGE_TYPES, UPLOAD_FILE } from "@/lib/constants";
import apiClient from "@/lib/api-client";

const MessageBar = () => {
  const emojiRef = useRef();
  const fileInputRef = useRef();
  const messageInputRef = useRef(); // Ref for the message input
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

  // States for @mention suggestions
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionQuery, setSuggestionQuery] = useState("");
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [currentMentionStartIndex, setCurrentMentionStartIndex] = useState(-1);


  useEffect(() => {
    function handleClickOutside(event) {
      if (emojiRef.current && !emojiRef.current.contains(event.target)) {
        setEmojiPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [emojiRef]);

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

    // Find the @ symbol that the user is currently typing after
    for (let i = cursorPosition - 1; i >= 0; i--) {
      if (text[i] === '@' && (i === 0 || text[i-1] === ' ')) { // Ensure @ is start of word
        // Check if this @ is already part of a completed mention (e.g., @JohnDoe )
        const partAfterAt = text.substring(i + 1, cursorPosition);
        if (!partAfterAt.includes(' ')) { // If no space after @ up to cursor, it's active
          atIndex = i;
          query = text.substring(i + 1, cursorPosition);
        }
        break;
      }
      if (text[i] === ' ') break; // Stop if a space is found before an @
    }

    if (atIndex !== -1) {
      setCurrentMentionStartIndex(atIndex);
      setSuggestionQuery(query);
      const members = selectedChatData.members.filter(
        (member) => member._id !== userInfo.id && // Exclude self
                     (member.firstName?.toLowerCase().startsWith(query.toLowerCase()) ||
                      member.lastName?.toLowerCase().startsWith(query.toLowerCase()) ||
                      member.email?.toLowerCase().startsWith(query.toLowerCase()))
      );
      setFilteredMembers(members);
      setShowSuggestions(members.length > 0);
      setActiveSuggestionIndex(0);
    } else {
      setShowSuggestions(false);
      setCurrentMentionStartIndex(-1);
    }
  }, [selectedChatData, selectedChatType, userInfo]);


  const handleMessageChange = (event) => {
    const text = event.target.value;
    const cursorPosition = event.target.selectionStart;
    setMessage(text);
    processSuggestions(text, cursorPosition);
  };

  const handleSelectSuggestion = (member) => {
    if (currentMentionStartIndex === -1) return;

    const textBeforeMention = message.substring(0, currentMentionStartIndex);
    const mention = `@${member.firstName}${member.lastName || ""} `; // Add space after mention
    const textAfterMention = message.substring(currentMentionStartIndex + suggestionQuery.length + 1); // +1 for @

    setMessage(textBeforeMention + mention + textAfterMention);
    setShowSuggestions(false);
    setFilteredMembers([]);
    setSuggestionQuery("");
    setCurrentMentionStartIndex(-1);

    // Focus and set cursor position after the inserted mention
    setTimeout(() => {
        if (messageInputRef.current) {
            messageInputRef.current.focus();
            const newCursorPosition = textBeforeMention.length + mention.length;
            messageInputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
        }
    }, 0);
  };

  const handleKeyDown = (event) => {
    if (showSuggestions && filteredMembers.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveSuggestionIndex((prevIndex) => (prevIndex + 1) % filteredMembers.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveSuggestionIndex((prevIndex) => (prevIndex - 1 + filteredMembers.length) % filteredMembers.length);
      } else if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        handleSelectSuggestion(filteredMembers[activeSuggestionIndex]);
      } else if (event.key === "Escape") {
        event.preventDefault();
        setShowSuggestions(false);
      }
    }
  };


  const handleSendMessage = async () => {
    if (message.trim() === "") return; // Don't send empty messages
    if (selectedChatType === "contact") {
      socket.emit("sendMessage", {
        sender: userInfo.id,
        content: message,
        recipient: selectedChatData._id,
        messageType: MESSAGE_TYPES.TEXT,
        audioUrl: undefined,
        fileUrl: undefined,
      });
    } else if (selectedChatType === "channel") {
      socket.emit("send-channel-message", {
        sender: userInfo.id,
        content: message,
        messageType: MESSAGE_TYPES.TEXT,
        audioUrl: undefined,
        fileUrl: undefined,
        channelId: selectedChatData._id,
      });
    }
    setMessage("");
  };

  const handleAttachmentChange = async (event) => {
    try {
      const file = event.target.files[0];

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        setIsUploading(true);
        const response = await apiClient.post(UPLOAD_FILE, formData, {
          withCredentials: true,
          onUploadProgress: (data) => {
            setFileUploadProgress(Math.round((100 * data.loaded) / data.total));
          },
        });

        if (response.status === 200 && response.data) {
          setIsUploading(false);
          if (selectedChatType === "contact") {
            socket.emit("sendMessage", {
              sender: userInfo.id,
              content: undefined,
              recipient: selectedChatData._id,
              messageType: MESSAGE_TYPES.FILE,
              audioUrl: undefined,
              fileUrl: response.data.filePath,
            });
          } else if (selectedChatType === "channel") {
            socket.emit("send-channel-message", {
              sender: userInfo.id,
              content: undefined,
              messageType: MESSAGE_TYPES.FILE,
              audioUrl: undefined,
              fileUrl: response.data.filePath,
              channelId: selectedChatData._id,
            });
          }
        }
      }
    } catch (error) {
      setIsUploading(false);
      console.log({ error });
    }
  };

  const handleAttachmentClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="h-[10vh] bg-[#1c1d25] flex justify-center items-center px-8 gap-6 mb-5 relative">
      {/* Suggestions Popup */}
      {showSuggestions && filteredMembers.length > 0 && selectedChatType === "channel" && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-[#2f303b] border border-gray-600 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
          {filteredMembers.map((member, index) => (
            <div
              key={member._id}
              className={`p-3 cursor-pointer hover:bg-[#8417ff]/30 ${
                index === activeSuggestionIndex ? "bg-[#8417ff]/50" : ""
              }`}
              onClick={() => handleSelectSuggestion(member)}
            >
              {member.firstName} {member.lastName || ""} ({member.email})
            </div>
          ))}
        </div>
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
          onBlur={() => setTimeout(() => setShowSuggestions(false), 100)} // Delay to allow click on suggestion
        />
        <button
          className="text-neutral-300 focus:border-none focus:outline-none focus:text-white transition-all duration-300"
          onClick={handleAttachmentClick} // Trigger the file input click
        >
          <GrAttachment className="text-2xl" />
        </button>
        <input
          type="file"
          className="hidden" // Hide the file input element
          ref={fileInputRef}
          onChange={handleAttachmentChange} // Handle file selection
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
