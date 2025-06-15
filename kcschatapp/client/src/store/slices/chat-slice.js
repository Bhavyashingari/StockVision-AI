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
  // Old addMessage, keep for reference or specific use cases if any, but prefer addMessageToStore for sockets
  // addMessage: (message) => { ... } 

  addMessageToStore: (message, currentSelectedChat, currentUserInfo, isChannelMessage = false) => {
    set((state) => {
      let newSelectedChatMessages = state.selectedChatMessages;
      // Check if the message belongs to the currently selected chat
      if (isChannelMessage) {
        if (currentSelectedChat && currentSelectedChat._id === message.channelId) {
          newSelectedChatMessages = [...state.selectedChatMessages, message];
        }
        // Call helper to update channels list (unread count, move to top)
        // This will internally check if message is from self for unread count
        const updatedChannels = get()._updateChannelListForNewMessage(message, currentUserInfo);
        return { selectedChatMessages: newSelectedChatMessages, channels: updatedChannels };

      } else { // Direct Message
        const otherUserId = message.sender._id === currentUserInfo.id ? message.recipient._id : message.sender._id;
        if (currentSelectedChat && currentSelectedChat._id === otherUserId) {
          newSelectedChatMessages = [...state.selectedChatMessages, message];
        }
        // Call helper to update DM contacts list
        const updatedDmContacts = get()._updateDMContactListForNewMessage(message, currentUserInfo);
        return { selectedChatMessages: newSelectedChatMessages, directMessagesContacts: updatedDmContacts };
      }
    });
  },

  // Helper function for DM list updates (internal to slice)
  _updateDMContactListForNewMessage: (message, currentUserInfo) => {
    const { directMessagesContacts, selectedChatType, selectedChatData } = get();
    const currentUserId = currentUserInfo.id;
    const otherUser = message.sender._id === currentUserId ? message.recipient : message.sender;

    if (!otherUser || !otherUser._id) return directMessagesContacts;

    let contactExists = false;
    let updatedDmContacts = directMessagesContacts.map(contact => {
      if (contact._id === otherUser._id) {
        contactExists = true;
        const isChatActive = selectedChatType === "contact" && selectedChatData && selectedChatData._id === otherUser._id;
        const unreadCount = (contact.unreadCount || 0) + 
                            (!isChatActive && message.sender._id !== currentUserId ? 1 : 0);
        return { ...contact, lastMessage: message, unreadCount, updatedAt: message.timestamp };
      }
      return contact;
    });

    if (!contactExists) {
      const unreadCount = message.sender._id !== currentUserId ? 1 : 0;
      updatedDmContacts.unshift({ ...otherUser, lastMessage: message, unreadCount, updatedAt: message.timestamp });
    } else {
      // Move updated contact to the top
      const contactIndex = updatedDmContacts.findIndex(c => c._id === otherUser._id);
      if (contactIndex > -1) { // Ensure contact exists before splicing
        const contactToMove = updatedDmContacts.splice(contactIndex, 1)[0];
        updatedDmContacts.unshift(contactToMove);
      }
    }
    return updatedDmContacts;
  },

  // Helper function for Channel list updates (internal to slice)
  _updateChannelListForNewMessage: (message, currentUserInfo) => {
    const { channels, selectedChatType, selectedChatData } = get();
    const currentUserId = currentUserInfo.id;
    const { channelId } = message;

    let channelExists = false;
    let updatedChannels = channels.map(channel => {
      if (channel._id === channelId) {
        channelExists = true;
        const isChannelActive = selectedChatType === "channel" && selectedChatData && selectedChatData._id === channelId;
        const unreadCount = (channel.unreadCount || 0) + 
                            (!isChannelActive && message.sender._id !== currentUserId ? 1 : 0);
        // Assuming channel object might store lastMessage or similar, if not, this is just for unreadCount
        return { ...channel, lastMessage: message, unreadCount, updatedAt: message.timestamp }; 
      }
      return channel;
    });
    
    if (channelExists) {
      // Move updated channel to the top
      const channelIndex = updatedChannels.findIndex(c => c._id === channelId);
       if (channelIndex > -1) { // Ensure channel exists
        const channelToMove = updatedChannels.splice(channelIndex, 1)[0];
        updatedChannels.unshift(channelToMove);
      }
    }
    // If channel doesn't exist, it should be added via 'new-channel-added' socket event then 'addChannel' action.
    // This function primarily updates existing channels based on new messages.
    return updatedChannels;
  },


  addChannel: (newChannel) => {
    const channels = get().channels;
    // Ensure new channel has unreadCount initialized
    set({ channels: [{ ...newChannel, unreadCount: 0 }, ...channels.filter(ch => ch._id !== newChannel._id)] });
  },
  addContactInDMContacts: (message) => { // message is the incoming message object
    const { channels } = get();
    // Ensure new channel has unreadCount initialized, and potentially lastMessage
    const existingChannel = channels.find(ch => ch._id === newChannel._id);
    if (existingChannel) return; // Do not add if already exists
    set({ channels: [{ ...newChannel, unreadCount: 0, lastMessage: null, updatedAt: newChannel.updatedAt || new Date() }, ...channels] });
  },

  // REMOVE addContactInDMContacts and addChannelInChannelLists as their logic is now in helpers _updateDMContactListForNewMessage and _updateChannelListForNewMessage
  // These helpers are called by addMessageToStore.

  incrementUnreadCountForDM: (dmContactId) => {
    set((state) => ({
      directMessagesContacts: state.directMessagesContacts.map(contact =>
        contact._id === dmContactId && (!state.selectedChatData || state.selectedChatData._id !== dmContactId || state.selectedChatType !== 'contact')
          ? { ...contact, unreadCount: (contact.unreadCount || 0) + 1 }
          : contact
      ),
    }));
  },

  incrementUnreadCountForChannel: (channelIdToUpdate) => {
    set((state) => ({
      channels: state.channels.map(channel =>
        channel._id === channelIdToUpdate && (!state.selectedChatData || state.selectedChatData._id !== channelIdToUpdate || state.selectedChatType !== 'channel')
          ? { ...channel, unreadCount: (channel.unreadCount || 0) + 1 }
          : channel
      ),
    }));
  },
  
  // updateMessageInStore can be an alias or replacement for handleMessageEdited/handleMessageDeleted
  // For now, WebSocketEvents.jsx uses updateMessageInStore, so let's define it to call the specific handlers
  // Or, directly use handleMessageEdited/handleMessageDeleted in WebSocketEvents.jsx
  // Let's stick to specific handlers for clarity in WebSocketEvents.jsx and ensure they are correctly used.
  // So, WebSocketEvents.jsx should be updated to use handleMessageEdited and handleMessageDeleted directly.

  updateChannelDetails: (channelData) => {
    set((state) => ({
      selectedChatData: state.selectedChatData && state.selectedChatData._id === channelData._id ? channelData : state.selectedChatData,
      channels: state.channels.map(channel => channel._id === channelData._id ? channelData : channel),
    }));
  },
  handleMessageDeleted: (messageData) => {
    set((state) => ({
      selectedChatMessages: state.selectedChatMessages.map(msg =>
        msg._id === messageData._id // messageData is the raw message from server
          ? { // Construct the full message object as expected by the client
              ...msg, // Keep existing client-side fields if any, then overwrite with server data
              ...messageData, // server data
              content: messageData.content, // explicit for clarity
              messageType: messageData.messageType, // explicit
              isDeleted: true, // specific to delete action
              fileUrl: undefined, // Clear fileUrl on delete
              // audioUrl etc. clear as needed
              originalContentType: messageData.originalContentType || msg.messageType, // store original type
              editedAt: messageData.editedAt, // server provides this
            }
          : msg
      ),
    }));
  },

  handleMessageEdited: (messageData) => { // messageData is the raw message from server
    set((state) => ({
      selectedChatMessages: state.selectedChatMessages.map(msg =>
        msg._id === messageData._id
          ? { // Construct the full message object
              ...msg, // Keep existing client-side fields
              ...messageData, // server data
              content: messageData.content, // explicit
              isEdited: true, // specific to edit action
              editedAt: messageData.editedAt, // server provides this
            }
          : msg
      ),
    }));
  },

  // Ensure existing addMessage is removed or commented out if addMessageToStore replaces its primary use for new messages
  addMessage: (message) => { // This is likely used by the client when *sending* a message optimistically.
                             // Let's ensure it's compatible or decide if it should also use addMessageToStore logic.
                             // For now, assuming it's for optimistic updates and should mostly work.
                             // However, the socket handlers should use addMessageToStore.
    const selectedChatMessages = get().selectedChatMessages;
    set({
      selectedChatMessages: [
        ...selectedChatMessages,
        { // Ensure structure matches incoming messages from socket
          ...message,
          sender: message.sender._id ? message.sender : { _id: message.sender }, // Normalize sender
          recipient: message.recipient ? (message.recipient._id ? message.recipient : { _id: message.recipient }) : null, // Normalize recipient
        },
      ],
    });
  },
});
