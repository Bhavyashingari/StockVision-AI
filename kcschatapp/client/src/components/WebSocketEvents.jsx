import { useEffect } from "react";
import { useSocket } from "../contexts/SocketContext"; // ✅ FIXED import path
import { useAppStore } from "../store";
import { toast } from "sonner"; // for notifications

const WebSocketEvents = () => {
  const socketContext = useSocket(); // Use the hook
  if (!socketContext) return null; // ✅ Avoid crash if context is missing

  const { socket } = socketContext;

  const {
    selectedChatData,
    setSelectedChatData,
    updateChannelDetails,
    addMessageToStore,
    handleMessageEdited,
    handleMessageDeleted,
    incrementUnreadCountForChannel,
    incrementUnreadCountForDM,
    userInfo,
  } = useAppStore((state) => ({
    selectedChatData: state.chat.selectedChatData,
    setSelectedChatData: state.chat.setSelectedChatData,
    updateChannelDetails: state.chat.updateChannelDetails,
    addMessageToStore: state.chat.addMessageToStore,
    handleMessageEdited: state.chat.handleMessageEdited,
    handleMessageDeleted: state.chat.handleMessageDeleted,
    incrementUnreadCountForChannel: state.chat.incrementUnreadCountForChannel,
    incrementUnreadCountForDM: state.chat.incrementUnreadCountForDM,
    userInfo: state.auth.userInfo,
  }));

  useEffect(() => {
    if (!socket) return;

    // === Listeners ===

    socket.on("receiveMessage", (message) => {
      console.log("Received DM: ", message);
      addMessageToStore(message, selectedChatData, userInfo);

      const notActiveChat =
        selectedChatData?._id !== message.sender._id &&
        selectedChatData?._id !== message.recipient._id;

      if (notActiveChat && message.sender._id !== userInfo.id) {
        incrementUnreadCountForDM(message.sender._id);
        toast.info(
          `New message from ${message.sender.firstName || message.sender.email}: ${
            message.content?.substring(0, 20) || message.messageType
          }...`
        );
      }
    });

    socket.on("receive-channel-message", (message) => {
      console.log("Received Channel Message: ", message);
      addMessageToStore(message, selectedChatData, userInfo, true);

      if (
        selectedChatData?._id !== message.channelId &&
        message.sender._id !== userInfo.id
      ) {
        incrementUnreadCountForChannel(message.channelId);
        toast.info(
          `New message in ${message.channel?.name || "Channel"}: ${
            message.content?.substring(0, 20) || message.messageType
          }...`
        );
      }
    });

    socket.on("messageEdited", (editedMessage) => {
      console.log("Message Edited: ", editedMessage);
      handleMessageEdited(editedMessage);
    });

    socket.on("messageDeleted", (deletedMessage) => {
      console.log("Message Deleted: ", deletedMessage);
      handleMessageDeleted(deletedMessage);
    });

    socket.on("channelUpdated", (updatedChannel) => {
      console.log("Channel Updated: ", updatedChannel);
      updateChannelDetails(updatedChannel);
      toast.info(
        `Channel "${updatedChannel.name}" has been updated.` +
          (updatedChannel.pinnedMessage ? ` New pinned message.` : "")
      );
    });

    socket.on("dmBlocked", (data) => {
      console.log("DM Blocked:", data);
      toast.error(
        `Could not send DM to ${data.recipientName || "user"}: They are not accepting DMs. Your message: "${
          data.messageContent?.substring(0, 30) || ""
        }..."`,
        { id: data.tempId }
      );
    });

    socket.on("sendMessageError", (data) => {
      console.log("Send Message Error:", data);
      toast.error(
        `Error sending message: ${data.message || "Unknown error."}`,
        { id: data.tempId }
      );
    });

    // === Cleanup ===
    return () => {
      socket.off("receiveMessage");
      socket.off("receive-channel-message");
      socket.off("messageEdited");
      socket.off("messageDeleted");
      socket.off("channelUpdated");
      socket.off("dmBlocked");
      socket.off("sendMessageError");
    };
  }, [
    socket,
    selectedChatData,
    addMessageToStore,
    handleMessageEdited,
    handleMessageDeleted,
    incrementUnreadCountForChannel,
    incrementUnreadCountForDM,
    updateChannelDetails,
    userInfo,
  ]);

  return null; // Component is invisible but reactive
};

export default WebSocketEvents;
