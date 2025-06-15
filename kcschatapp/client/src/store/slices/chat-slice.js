export const createChatSlice = (set, get) => ({
  selectedChatType: undefined,
  selectedChatData: undefined,
  selectedChatMessages: [],
  directMessagesContacts: [],
  channels: [],
  isUploading: false,
  fileUploadProgress: 0,
  isDownloading: false,
  downloadProgress: 0,
  setIsUploading: (isUploading) => set({ isUploading }),
  setFileUploadProgress: (fileUploadProgress) => set({ fileUploadProgress }),
  setIsDownloading: (isDownloading) => set({ isDownloading }),
  setDownloadProgress: (downloadProgress) => set({ downloadProgress }),
  setSelectedChatType: (selectedChatType) => set({ selectedChatType }),
  setSelectedChatData: (selectedChatData) => {
    set((state) => {
      let newDirectMessagesContacts = state.directMessagesContacts;
      let newChannels = state.channels;

      if (selectedChatData) {
        // Reset unread count for the selected chat
        if (state.selectedChatType === "contact") {
          newDirectMessagesContacts = state.directMessagesContacts.map(
            (contact) =>
              contact._id === selectedChatData._id
                ? { ...contact, unreadCount: 0 }
                : contact
          );
        } else if (state.selectedChatType === "channel") {
          newChannels = state.channels.map((channel) =>
            channel._id === selectedChatData._id
              ? { ...channel, unreadCount: 0 }
              : channel
          );
        }
      }

      return {
        selectedChatData,
        directMessagesContacts: newDirectMessagesContacts,
        channels: newChannels,
      };
    });
  },
  setChannels: (channels) => set({ channels: channels.map(c => ({ ...c, unreadCount: c.unreadCount || 0 })) }),
  setSelectedChatMessages: (selectedChatMessages) =>
    set({ selectedChatMessages }),
  setDirectMessagesContacts: (directMessagesContacts) =>
    set({ directMessagesContacts: directMessagesContacts.map(c => ({ ...c, unreadCount: c.unreadCount || 0 })) }),
  closeChat: () =>
    set({
      selectedChatData: undefined,
      selectedChatType: undefined,
      selectedChatMessages: [],
    }),
  addMessage: (message) => {
    const selectedChatMessages = get().selectedChatMessages;
    const selectedChatType = get().selectedChatType; // Used to determine structure
    // Ensure sender/recipient are consistently handled, possibly normalizing here if structure varies wildly
    // Server sends populated sender for both, and populated recipient for DMs.
    set({
      selectedChatMessages: [
        ...selectedChatMessages,
        {
          ...message,
          // recipient for DM is object, for channel is null. Server sends message.recipient._id for DM.
          // sender for DM is object, for channel is object. Server sends message.sender._id for DM.
          // The socket event handlers in SocketContext.jsx pass the direct message object.
          // The addMessage logic in ChatPage.jsx for sent messages correctly structures sender/recipient.
          // So, direct _id access should be fine if objects are always populated.
          // Let's ensure message objects in the store are consistent.
          recipient: message.recipient ? (message.recipient._id || message.recipient) : null,
          sender: message.sender ? (message.sender._id || message.sender) : null,
        },
      ],
    });
  },
  addChannel: (newChannel) => {
    const channels = get().channels;
    // Ensure new channel has unreadCount initialized
    set({ channels: [{ ...newChannel, unreadCount: 0 }, ...channels.filter(ch => ch._id !== newChannel._id)] });
  },
  addContactInDMContacts: (message) => { // message is the incoming message object
    const { userInfo, directMessagesContacts, selectedChatData, selectedChatType } = get();
    const currentUserId = userInfo.id;

    // Determine the other user in the DM
    const otherUser = message.sender._id === currentUserId ? message.recipient : message.sender;
    if (!otherUser || !otherUser._id) return; // Should not happen with valid messages

    let contactExists = false;
    let updatedDmContacts = directMessagesContacts.map(contact => {
      if (contact._id === otherUser._id) {
        contactExists = true;
        // Increment unreadCount if chat is not active and message is not from self
        const isChatActive = selectedChatType === "contact" && selectedChatData && selectedChatData._id === otherUser._id;
        const unreadCount = (contact.unreadCount || 0) +
                            (!isChatActive && message.sender._id !== currentUserId ? 1 : 0);
        return { ...contact, unreadCount };
      }
      return contact;
    });

    if (!contactExists) {
      // Add new contact with unreadCount = 1 if message not from self, else 0
      const unreadCount = message.sender._id !== currentUserId ? 1 : 0;
      updatedDmContacts.unshift({ ...otherUser, unreadCount });
    } else {
      // Move updated contact to the top
      const contactIndex = updatedDmContacts.findIndex(c => c._id === otherUser._id);
      if (contactIndex > 0) { // if not already at top
        const contactToMove = updatedDmContacts.splice(contactIndex, 1)[0];
        updatedDmContacts.unshift(contactToMove);
      }
    }
    set({ directMessagesContacts: updatedDmContacts });
  },

  addChannelInChannelLists: (message) => { // message is the incoming message object
    const { channels, selectedChatData, selectedChatType, userInfo } = get();
    const currentUserId = userInfo.id;
    const { channelId } = message;

    let channelExists = false;
    let updatedChannels = channels.map(channel => {
      if (channel._id === channelId) {
        channelExists = true;
        // Increment unreadCount if channel is not active and message is not from self
        const isChannelActive = selectedChatType === "channel" && selectedChatData && selectedChatData._id === channelId;
        const unreadCount = (channel.unreadCount || 0) +
                            (!isChannelActive && message.sender._id !== currentUserId ? 1 : 0);
        return { ...channel, unreadCount };
      }
      return channel;
    });

    if (channelExists) {
      // Move updated channel to the top
      const channelIndex = updatedChannels.findIndex(c => c._id === channelId);
      if (channelIndex > 0) { // if not already at top
         const channelToMove = updatedChannels.splice(channelIndex, 1)[0];
         updatedChannels.unshift(channelToMove);
      }
      set({ channels: updatedChannels });
    }
    // If channel doesn't exist, it should be added via 'new-channel-added' socket event then 'addChannel' action
    // This function primarily updates existing channels based on new messages.
  },
  updateChannelDetails: (channelData) => {
    set((state) => ({
      selectedChatData: state.selectedChatData && state.selectedChatData._id === channelData._id ? channelData : state.selectedChatData,
      channels: state.channels.map(channel => channel._id === channelData._id ? channelData : channel),
    }));
  },
  handleMessageDeleted: (messageData) => {
    set((state) => ({
      selectedChatMessages: state.selectedChatMessages.map(msg =>
        msg._id === messageData._id
          ? {
              ...msg, // Keep original sender/recipient objects if they exist
              ...messageData, // Apply updates from server (content, isDeleted, messageType, etc.)
              content: messageData.content,
              messageType: messageData.messageType,
              isDeleted: true,
              isEdited: messageData.isEdited, // server might send this
              editedAt: messageData.editedAt, // server will send this (timestamp of deletion)
              fileUrl: undefined,
              audioUrl: undefined, // Assuming these are cleared
              originalContentType: messageData.originalContentType,
            }
          : msg
      ),
    }));
  },
  handleMessageEdited: (messageData) => {
    set((state) => ({
      selectedChatMessages: state.selectedChatMessages.map(msg =>
        msg._id === messageData._id
          ? {
              ...msg, // Keep original sender/recipient objects
              ...messageData, // Apply updates from server
              content: messageData.content,
              isEdited: true,
              editedAt: messageData.editedAt,
              // messageType should not change on edit, but if server sends it, it's applied
            }
          : msg
      ),
    }));
  },
});
