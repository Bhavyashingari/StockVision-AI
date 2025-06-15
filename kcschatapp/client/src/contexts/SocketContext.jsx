import { SOCKET_HOST } from "@/lib/constants";
import { useAppStore } from "@/store";
import React, { createContext, useContext, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { toast } from "sonner"; // Import toast

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const socket = useRef();
  const { userInfo } = useAppStore();

  useEffect(() => {
    if (userInfo) {
      socket.current = io(SOCKET_HOST, {
        withCredentials: true,
        query: { userId: userInfo.id },
      });
      socket.current.on("connect", () => {
        console.log("Connected to socket server");
      });

      const handleReceiveMessage = (message) => {
        // Access the latest state values
        const {
          selectedChatData: currentChatData,
          selectedChatType: currentChatType,
          addMessage,
          addContactInDMContacts,
          userInfo, // Get userInfo for comparison
        } = useAppStore.getState();

        const isActiveChat =
          currentChatType === "contact" &&
          currentChatData &&
          (currentChatData._id === message.sender._id || currentChatData._id === message.recipient._id);

        if (isActiveChat) {
          addMessage(message);
        } else {
          // Only show toast if the message is not from the current user
          if (message.sender._id !== userInfo.id) {
            toast.info(
              `New message from ${message.sender.firstName || message.sender.email}`,
              {
                description: message.content || message.messageType,
                duration: 5000,
              }
            );
          }
        }
        // This will handle reordering/updating the DM list regardless
        addContactInDMContacts(message);
      };

      const handleReceiveChannelMessage = (message) => {
        const {
          selectedChatData,
          selectedChatType,
          addMessage,
          addChannelInChannelLists,
          userInfo, // Get userInfo for comparison
        } = useAppStore.getState();

        const isActiveChannel =
          selectedChatType === "channel" &&
          selectedChatData &&
          selectedChatData._id === message.channelId;

        if (isActiveChannel) {
          addMessage(message);
        } else {
          // Only show toast if the message is not from the current user
          if (message.sender._id !== userInfo.id) {
            // Assuming channel data is part of the message or we fetch it
            // For now, using channelId. A better toast would include channel name.
            toast.info(
              `New message in channel ${message.channelId}`, // Placeholder, ideally channel name
              {
                description: `${message.sender.firstName || message.sender.email}: ${
                  message.content || message.messageType
                }`,
                duration: 5000,
              }
            );
          }
        }
        // This will handle reordering/updating the channel list
        addChannelInChannelLists(message);
      };

      const addNewChannel = (channel) => {
        const { addChannel } = useAppStore.getState();
        addChannel(channel);
        toast.success(`You've been added to channel: ${channel.name}`, {
          duration: 5000,
        });
      };

      const handleMessageDeleted = (messageData) => {
        const { handleMessageDeleted: dispatchMessageDeleted } = useAppStore.getState();
        dispatchMessageDeleted(messageData);
         // Optional: Show a toast that a message was deleted if it's not the current user's action
        const { userInfo } = useAppStore.getState();
        if (messageData.sender._id !== userInfo.id) {
            toast.info("A message was deleted in the chat.", { duration: 3000 });
        }
      };

      const handleMessageEdited = (messageData) => {
        const { handleMessageEdited: dispatchMessageEdited } = useAppStore.getState();
        dispatchMessageEdited(messageData);
        // Optional: Show a toast that a message was edited
        const { userInfo } = useAppStore.getState();
        if (messageData.sender._id !== userInfo.id) {
             toast.info("A message was edited in the chat.", { duration: 3000 });
        }
      };

      const handleChannelUpdated = (updatedChannelData) => {
        const { updateChannelDetails } = useAppStore.getState();
        updateChannelDetails(updatedChannelData);
        // Optionally, if this specific user was the one who pinned/unpinned,
        // a success toast might have already been shown.
        // If the update is from another user, a generic toast might be useful.
        const { userInfo, selectedChatData } = useAppStore.getState();
        if (selectedChatData && selectedChatData._id === updatedChannelData._id) {
            if (updatedChannelData.pinnedMessage) {
                 if(updatedChannelData.admin._id !== userInfo.id) { // If action was by another admin
                    toast.info(`A message has been pinned in ${updatedChannelData.name}.`);
                 }
            } else {
                 if(updatedChannelData.admin._id !== userInfo.id) { // If action was by another admin
                    toast.info(`Pinned message removed in ${updatedChannelData.name}.`);
                 }
            }
        }
      };

      const handleDmBlocked = (data) => {
        toast.error(
          `Your message to ${data.recipientName || data.recipientId} was not sent. They are not currently accepting direct messages.`,
          {
            description: `Message: "${data.messageContent}"` // Show the original message content
          }
        );
        // Optionally, re-fill message bar:
        // const { setMessageBarContent } = useAppStore.getState(); // Assuming such an action exists
        // if(setMessageBarContent) setMessageBarContent(data.messageContent);
      };

      const handleSendMessageError = (errorData) => {
        toast.error(errorData.message || "Failed to send message.");
      };

      socket.current.on("receiveMessage", handleReceiveMessage);
      socket.current.on("receive-channel-message", handleReceiveChannelMessage);
      socket.current.on("new-channel-added", addNewChannel);
      socket.current.on("messageDeleted", handleMessageDeleted);
      socket.current.on("messageEdited", handleMessageEdited);
      socket.current.on("channelUpdated", handleChannelUpdated);
      socket.current.on("dmBlocked", handleDmBlocked); // Added listener
      socket.current.on("sendMessageError", handleSendMessageError); // Added listener


      return () => {
        socket.current.off("receiveMessage", handleReceiveMessage);
        socket.current.off("receive-channel-message", handleReceiveChannelMessage);
        socket.current.off("new-channel-added", addNewChannel);
        socket.current.off("messageDeleted", handleMessageDeleted);
        socket.current.off("messageEdited", handleMessageEdited);
        socket.current.off("channelUpdated", handleChannelUpdated);
        socket.current.off("dmBlocked", handleDmBlocked); // Added listener removal
        socket.current.off("sendMessageError", handleSendMessageError); // Added listener removal
        socket.current.disconnect();
      };
    }
  }, [userInfo]);

  return (
    <SocketContext.Provider value={socket.current}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketProvider;
