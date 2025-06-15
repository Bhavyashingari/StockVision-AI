import { useEffect } from "react";
import { useSocket } from "../context/SocketContext";
import { useAppStore } from "../../store";
import { toast } from "sonner"; // Assuming sonner (react-hot-toast) is used

const WebSocketEvents = () => {
  const { socket } = useSocket();
  const {
    selectedChatData,
    setSelectedChatMessages,
    selectedChatMessages,
    setSelectedChatData,
    updateChannelDetails,
    addMessageToStore,
    handleMessageEdited, // Use specific handler
    handleMessageDeleted, // Use specific handler
    incrementUnreadCountForChannel,
    incrementUnreadCountForDM,
    userInfo,
  } = useAppStore((state) => ({
    selectedChatData: state.chat.selectedChatData,
    // setSelectedChatMessages is not directly needed here if handlers manage it
    // selectedChatMessages: state.chat.selectedChatMessages, 
    setSelectedChatData: state.chat.setSelectedChatData,
    updateChannelDetails: state.chat.updateChannelDetails,
    addMessageToStore: state.chat.addMessageToStore,
    handleMessageEdited: state.chat.handleMessageEdited, // Get from store
    handleMessageDeleted: state.chat.handleMessageDeleted, // Get from store
    incrementUnreadCountForChannel: state.chat.incrementUnreadCountForChannel,
    incrementUnreadCountForDM: state.chat.incrementUnreadCountForDM,
    userInfo: state.auth.userInfo,
  }));

  useEffect(() => {
    if (socket) {
      // Listener for direct messages
      socket.on("receiveMessage", (message) => {
        console.log("Received DM: ", message);
        addMessageToStore(message, selectedChatData, userInfo);

        if (selectedChatData?._id !== message.sender._id && selectedChatData?._id !== message.recipient._id ) {
          // Notify if not for active chat (check based on sender/recipient for DM)
          // and message is not from self
          if (message.sender._id !== userInfo.id) {
             incrementUnreadCountForDM(message.sender._id);
             toast.info(
              `New message from ${message.sender.firstName || message.sender.email}: ${
                message.content?.substring(0, 20) || message.messageType
              }...`
            );
          }
        }
      });

      // Listener for channel messages
      socket.on("receive-channel-message", (message) => {
        console.log("Received Channel Message: ", message);
        addMessageToStore(message, selectedChatData, userInfo, true); // true indicates channel message

        if (selectedChatData?._id !== message.channelId) {
          // Notify if not for active channel and message is not from self
           if (message.sender._id !== userInfo.id) {
            incrementUnreadCountForChannel(message.channelId);
            toast.info(
              `New message in ${message.channel?.name || "Channel"}: ${
                message.content?.substring(0, 20) || message.messageType
              }...`
            );
          }
        }
      });

      // Listener for message edits
      socket.on("messageEdited", (editedMessage) => {
        console.log("Message Edited: ", editedMessage);
        handleMessageEdited(editedMessage); // Call the specific store action
      });

      // Listener for message deletions
      socket.on("messageDeleted", (deletedMessage) => {
        console.log("Message Deleted: ", deletedMessage);
        handleMessageDeleted(deletedMessage); // Call the specific store action
      });

      // Listener for channel updates (e.g., pinned message)
      socket.on("channelUpdated", (updatedChannel) => {
        console.log("Channel Updated: ", updatedChannel);
        updateChannelDetails(updatedChannel); // This action should handle selectedChatData and channels list
         toast.info(
          `Channel "${updatedChannel.name}" has been updated.` +
          (updatedChannel.pinnedMessage ? ` New pinned message.` : "")
        );
      });
      
      // Listener for DM blocked
      socket.on("dmBlocked", (data) => {
        console.log("DM Blocked:", data);
        toast.error(
          `Could not send DM to ${data.recipientName || 'user'}: They are not accepting DMs. Your message: "${data.messageContent?.substring(0,30) || ''}..."`,
          { id: data.tempId } // Use tempId to allow potential UI updates/toast management
        );
      });

      // Listener for sendMessageError
      socket.on("sendMessageError", (data) => {
        console.log("Send Message Error:", data);
        toast.error(
          `Error sending message: ${data.message || 'Unknown error.'}`,
          { id: data.tempId } // Use tempId here as well
        );
      });


      return () => {
        socket.off("receiveMessage");
        socket.off("receive-channel-message");
        socket.off("messageEdited");
        socket.off("messageDeleted");
        socket.off("channelUpdated");
        socket.off("dmBlocked");
        socket.off("sendMessageError");
      };
    }
  }, [
    socket,
    selectedChatData,
    addMessageToStore,
    handleMessageEdited, // update dependency array
    handleMessageDeleted, // update dependency array
    incrementUnreadCountForChannel,
    incrementUnreadCountForDM,
    updateChannelDetails,
    userInfo,
    // selectedChatMessages and setSelectedChatMessages are not direct dependencies for the effect
    // if the handler functions (handleMessageEdited, etc.) correctly use get() from Zustand
  ]);

  return null; // This component does not render anything
};

export default WebSocketEvents;
