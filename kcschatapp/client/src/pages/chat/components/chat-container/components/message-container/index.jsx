import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import apiClient from "@/lib/api-client";
import {
  FETCH_ALL_MESSAGES_ROUTE,
  GET_CHANNEL_MESSAGES,
  HOST,
  MESSAGE_TYPES,
} from "@/lib/constants";
import { getColor } from "@/lib/utils";
import { useAppStore } from "@/store";
import moment from "moment";
import { useEffect, useRef, useState } from "react";
import { IoMdArrowRoundDown } from "react-icons/io";
import { IoCloseSharp } from "react-icons/io5";
import { MdFolderZip } from "react-icons/md";
import { Pencil, Trash2, Save, XCircle, Thumbtack } from "lucide-react"; // Added Thumbtack icon
import { Button } from "@/components/ui/button"; // Button
import { toast } from "sonner"; // Toast

const MessageContainer = ({ handlePinMessage }) => { // Added handlePinMessage prop
  const [showImage, setShowImage] = useState(false);
  const [imageURL, setImageURL] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingContent, setEditingContent] = useState("");

  const {
    selectedChatData,
    setSelectedChatMessages,
    selectedChatMessages,
    selectedChatType,
    userInfo,
    setDownloadProgress,
    setIsDownloading,
    // No direct dispatch from here, actions will be in chat-slice via WebSocket events
  } = useAppStore();
  const messageEndRef = useRef(null);


  // API Call Handlers
  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm("Are you sure you want to delete this message?")) return;
    try {
      await apiClient.delete(`/messages/${messageId}`, {
        withCredentials: true,
      });
      toast.success("Message delete request sent.");
      // UI update will be handled by WebSocket event 'messageDeleted'
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error(
        error.response?.data?.message || "Failed to delete message."
      );
    }
  };

  const handleSaveEdit = async (messageId) => {
    if (editingContent.trim() === "") {
      toast.error("Message content cannot be empty.");
      return;
    }
    try {
      await apiClient.put(
        `/messages/${messageId}`,
        { newContent: editingContent },
        { withCredentials: true }
      );
      toast.success("Message edit request sent.");
      setEditingMessageId(null);
      setEditingContent("");
      // UI update will be handled by WebSocket event 'messageEdited'
    } catch (error) {
      console.error("Error editing message:", error);
      toast.error(error.response?.data?.message || "Failed to edit message.");
    }
  };

  const startEditMode = (message) => {
    if (message.messageType !== "text" && !message.isDeleted) { // Cannot edit non-text (unless already deleted placeholder)
        toast.error("Only text messages can be edited.");
        return;
    }
    setEditingMessageId(message._id);
    setEditingContent(message.content);
  };

  const cancelEditMode = () => {
    setEditingMessageId(null);
    setEditingContent("");
  };


  useEffect(() => {
    const getMessages = async () => {
      const response = await apiClient.post(
        FETCH_ALL_MESSAGES_ROUTE,
        {
          id: selectedChatData._id,
        },
        { withCredentials: true }
      );

      if (response.data.messages) {
        setSelectedChatMessages(response.data.messages);
      }
    };
    const getChannelMessages = async () => {
      const response = await apiClient.get(
        `${GET_CHANNEL_MESSAGES}/${selectedChatData._id}`,
        { withCredentials: true }
      );
      if (response.data.messages) {
        setSelectedChatMessages(response.data.messages);
      }
    };
    if (selectedChatData._id) {
      if (selectedChatType === "contact") getMessages();
      else if (selectedChatType === "channel") getChannelMessages();
    }
  }, [selectedChatData, selectedChatType, setSelectedChatMessages]);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedChatMessages]);

  const checkIfImage = (filePath) => {
    const imageRegex =
      /\.(jpg|jpeg|png|gif|bmp|tiff|tif|webp|svg|ico|heic|heif)$/i;
    return imageRegex.test(filePath);
  };

  const downloadFile = async (url) => {
    setIsDownloading(true);
    setDownloadProgress(0);
    const response = await apiClient.get(`${HOST}/${url}`, {
      responseType: "blob",
      onDownloadProgress: (progressEvent) => {
        const { loaded, total } = progressEvent;
        const percentCompleted = Math.round((loaded * 100) / total);
        setDownloadProgress(percentCompleted);
      },
    });
    const urlBlob = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = urlBlob;
    link.setAttribute("download", url.split("/").pop()); // Optional: Specify a file name for the download
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(urlBlob); // Clean up the URL object
    setIsDownloading(false);
    setDownloadProgress(0);
  };

  const renderMessages = () => {
    let lastDate = null;
    return selectedChatMessages.map((message) => { // Removed index from key, use message._id
      const messageDate = moment(message.timestamp).format("YYYY-MM-DD");
      const showDate = messageDate !== lastDate;
      lastDate = messageDate;
      const isSender = message.sender && message.sender._id === userInfo.id;

      // If editing this message
      if (editingMessageId === message._id && !message.isDeleted) {
        return (
          <div key={message._id} className={`message my-2 ${isSender ? "text-right" : "text-left"}`}>
             {showDate && (
              <div className="text-center text-gray-500 my-2">
                {moment(message.timestamp).format("LL")}
              </div>
            )}
            <div className={`inline-block p-2 rounded ${isSender ? "bg-[#8417ff]/20" : "bg-[#2a2b33]/70"}`}>
              <input
                type="text"
                value={editingContent}
                onChange={(e) => setEditingContent(e.target.value)}
                className="bg-transparent border-b border-gray-400 text-white focus:outline-none w-full p-1"
              />
              <div className="flex justify-end gap-2 mt-2">
                <Button variant="ghost" size="sm" onClick={() => handleSaveEdit(message._id)} className="text-green-400 hover:text-green-300">
                  <Save size={18} />
                </Button>
                <Button variant="ghost" size="sm" onClick={cancelEditMode} className="text-red-400 hover:text-red-300">
                  <XCircle size={18} />
                </Button>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div key={message._id} className={`message group relative my-1 ${ selectedChatType === "channel" ? (isSender ? "text-right" : "text-left") : (message.sender === selectedChatData._id ? "text-left" : "text-right") }`}>
          {showDate && (
            <div className="text-center text-gray-500 my-2">
              {moment(message.timestamp).format("LL")}
            </div>
          )}
          {/* Edit/Delete/Pin Options - shown on hover */}
          {!message.isDeleted && (
          <div className="absolute top-0 right-0 flex items-center p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
            {isSender && ( // Edit and Delete for sender
              <>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-yellow-400 hover:text-yellow-300" onClick={() => startEditMode(message)}>
                  <Pencil size={16} />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-400" onClick={() => handleDeleteMessage(message._id)}>
                  <Trash2 size={16} />
                </Button>
              </>
            )}
            {selectedChatType === "channel" &&
              userInfo.id === selectedChatData.admin._id && ( // Pin/Unpin for admin in channels
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-7 w-7 ${selectedChatData.pinnedMessage?._id === message._id ? "text-green-500 hover:text-green-400" : "text-gray-400 hover:text-gray-300"}`}
                  onClick={() =>
                    handlePinMessage(
                      selectedChatData._id,
                      selectedChatData.pinnedMessage?._id === message._id ? null : message._id
                    )
                  }
                  title={selectedChatData.pinnedMessage?._id === message._id ? "Unpin Message" : "Pin Message"}
                >
                  <Thumbtack size={16} />
                </Button>
              )}
          </div>
          )}
          {selectedChatType === "contact" && renderPersonalMessages(message, isSender)}
          {selectedChatType === "channel" && renderChannelMessages(message, isSender)}
        </div>
      );
    });
  };

  const renderPersonalMessages = (message, isSender) => { // isSender passed now
    // Deleted message styling
    if (message.isDeleted) {
      return (
         <div className={`message ${isSender ? "text-right" : "text-left"}`}>
          <div className="italic text-gray-500 border border-transparent inline-block p-4 rounded my-1 max-w-[50%] break-words">
            {message.content}
          </div>
           <div className="text-xs text-gray-600">
            {moment(message.editedAt || message.timestamp).format("LT")}
            {message.isEdited && <span className="text-gray-500 text-xs"> (edited)</span>}
          </div>
        </div>
      );
    }

    // Normal message rendering
    return (
      <div className={`message ${isSender ? "text-right" : "text-left"}`}>
        {message.messageType === MESSAGE_TYPES.TEXT && (
          <div
            className={`${
              !isSender // Direct comparison to selectedChatData._id might be problematic if selectedChatData is not the other user.
                ? "bg-[#8417ff]/5 text-[#8417ff]/90 border-[#8417ff]/50"
                : "bg-[#2a2b33]/50 text-white/80 border-[#ffffff]/20"
            } border inline-block p-4 rounded my-1 max-w-[50%] break-words`}
          >
            {message.content}
          </div>
        )}
        {message.messageType === MESSAGE_TYPES.FILE && (
          <div
            className={`${
              !isSender
                ? "bg-[#8417ff]/5 text-[#8417ff]/90 border-[#8417ff]/50"
                : "bg-[#2a2b33]/50 text-white/80 border-[#ffffff]/20"
            } border inline-block p-4 rounded my-1 lg:max-w-[50%] break-words`}
          >
            {checkIfImage(message.fileUrl) ? (
              <div
                className="cursor-pointer"
                onClick={() => {
                  setShowImage(true);
                  setImageURL(message.fileUrl);
                }}
              >
                <img
                  src={`${HOST}/${message.fileUrl}`}
                  alt=""
                  height={300}
                  width={300}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center gap-4 p-2">
                <MdFolderZip className="text-4xl text-white/70" />
                <span className="text-sm text-white/90">{message.fileUrl.split("/").pop()}</span>
                <Button variant="outline" size="sm" onClick={() => downloadFile(message.fileUrl)} className="bg-transparent hover:bg-gray-700">
                  <IoMdArrowRoundDown className="text-lg" />
                </Button>
              </div>
            )}
          </div>
        )}
        <div className="text-xs text-gray-600 mt-1">
          {moment(message.timestamp).format("LT")}
          {message.isEdited && <span className="text-gray-500 text-xs"> (edited)</span>}
        </div>
      </div>
    );
  };

  const renderChannelMessages = (message, isSender) => { // isSender passed now
     // Deleted message styling
    if (message.isDeleted) {
      return (
         <div className={`message mt-1 ${isSender ? "text-right" : "text-left"}`}>
           { !isSender && (
            <div className="flex items-center justify-start gap-2 mb-1 ml-1">
              <Avatar className="h-6 w-6">
                {message.sender.image && <AvatarImage src={`${HOST}/${message.sender.image}`} alt="profile" className="rounded-full"/>}
                <AvatarFallback className={`uppercase h-6 w-6 text-xs flex ${getColor(message.sender.color)} items-center justify-center rounded-full`}>
                  {message.sender.firstName?.split("").shift()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-white/50">{`${message.sender.firstName} ${message.sender.lastName || ""}`}</span>
            </div>
          )}
          <div className={`italic text-gray-500 border border-transparent inline-block p-4 rounded my-1 max-w-[50%] break-words ${!isSender ? "ml-8" : ""}`}>
            {message.content}
          </div>
           <div className={`text-xs text-gray-600 ${!isSender ? "ml-8" : ""}`}>
            {moment(message.editedAt || message.timestamp).format("LT")}
            {message.isEdited && <span className="text-gray-500 text-xs"> (edited)</span>}
          </div>
        </div>
      );
    }

    // Normal message rendering
    return (
      <div className={`message mt-1 ${isSender ? "text-right" : "text-left"}`}>
         { !isSender && ( // Show avatar and name for other users
            <div className="flex items-center justify-start gap-2 mb-1 ml-1">
              <Avatar className="h-6 w-6">
                {message.sender.image && <AvatarImage src={`${HOST}/${message.sender.image}`} alt="profile" className="rounded-full"/>}
                <AvatarFallback className={`uppercase h-6 w-6 text-xs flex ${getColor(message.sender.color)} items-center justify-center rounded-full`}>
                  {message.sender.firstName?.split("").shift()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-white/50">{`${message.sender.firstName} ${message.sender.lastName || ""}`}</span>
            </div>
          )}
        {message.messageType === MESSAGE_TYPES.TEXT && (
          <div
            className={`${
              isSender
                ? "bg-[#8417ff]/5 text-[#8417ff]/90 border-[#8417ff]/50"
                : "bg-[#2a2b33]/50 text-white/80 border-[#ffffff]/20"
            } border inline-block p-4 rounded my-1 max-w-[50%] break-words ${!isSender ? "ml-8" : ""}`}
          >
            {message.content}
          </div>
        )}
        {message.messageType === MESSAGE_TYPES.FILE && (
          <div
            className={`${
              isSender
                ? "bg-[#8417ff]/5 text-[#8417ff]/90 border-[#8417ff]/50"
                : "bg-[#2a2b33]/50 text-white/80 border-[#ffffff]/20"
            } border inline-block p-4 rounded my-1 max-w-[50%] break-words ${!isSender ? "ml-8" : ""}`}
          >
            {checkIfImage(message.fileUrl) ? (
              <div
                className="cursor-pointer"
                onClick={() => {
                  setShowImage(true);
                  setImageURL(message.fileUrl);
                }}
              >
                <img
                  src={`${HOST}/${message.fileUrl}`}
                  alt=""
                  height={300}
                  width={300}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center gap-5">
                <span className="text-white/80 text-3xl bg-black/20 rounded-full p-3">
                  <MdFolderZip />
                </span>
                <span>{message.fileUrl.split("/").pop()}</span>
                <span
                  className="bg-black/20 p-3 text-2xl rounded-full hover:bg-black/50 cursor-pointer transition-all duration-300"
                  onClick={() => downloadFile(message.fileUrl)}
                >
                  <IoMdArrowRoundDown />
                </span>
              </div>
            )}
          </div>
        )}
         <div className={`text-xs text-gray-600 mt-1 ${!isSender ? "ml-8" : ""}`}>
            {moment(message.timestamp).format("LT")}
           {message.isEdited && <span className="text-gray-500 text-xs"> (edited)</span>}
          </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hidden p-4 px-8 md:w-[65vw] lg:w-[70vw] xl:w-[80vw] w-full relative">
      {renderMessages()}
      <div ref={messageEndRef} />
      {showImage && (
        <div className="fixed z-[1000] top-0 left-0 h-[100vh] w-[100vw] flex items-center justify-center backdrop-blur-lg flex-col">
          <div>
            <img
              src={`${HOST}/${imageURL}`}
              className="h-[80vh] w-full bg-cover"
              alt=""
            />
          </div>
          <div className="flex gap-5 fixed top-0 mt-5">
            <button
              className="bg-black/20 p-3 text-2xl rounded-full hover:bg-black/50 cursor-pointer transition-all duration-300"
              onClick={() => downloadFile(imageURL)}
            >
              <IoMdArrowRoundDown />
            </button>
            <button
              className="bg-black/20 p-3 text-2xl rounded-full hover:bg-black/50 cursor-pointer transition-all duration-300"
              onClick={() => {
                setShowImage(false);
                setImageURL(null);
              }}
            >
              <IoCloseSharp />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageContainer;
