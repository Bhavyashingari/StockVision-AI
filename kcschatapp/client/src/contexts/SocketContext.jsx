// import { SOCKET_HOST } from "@/lib/constants"; // Using VITE_SOCKET_URL directly from import.meta.env
import { useAppStore } from "@/store";
import React, { createContext, useContext, useEffect, useState, useRef } from "react"; // Added useState
import { io } from "socket.io-client";
import { useClerk } from "@clerk/clerk-react"; // Import useClerk

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null); // Changed from useRef to useState for easier context update
  const { userInfo } = useAppStore(); // userInfo is now populated after Clerk Auth + local DB fetch
  const { clerk, loaded: isClerkLoaded } = useClerk();
  const currentSocketRef = useRef(null); // To manage disconnects correctly with useState

  useEffect(() => {
    const connectSocket = async () => {
      // Connect only if Clerk is loaded, user is signed in (checked by userInfo having an id), and clerk session is available
      if (isClerkLoaded && userInfo?.id && clerk && clerk.session) {
        try {
          const token = await clerk.session.getToken();
          if (token) {
            // Ensure VITE_SOCKET_URL is defined in your .env file
            const socketIoUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_SERVER_URL;
            if (!socketIoUrl) {
              console.error("Socket URL is not defined. Set VITE_SOCKET_URL or VITE_SERVER_URL in .env");
              return;
            }

            // Disconnect previous socket if any
            if (currentSocketRef.current) {
                currentSocketRef.current.disconnect();
            }

            const newSocket = io(socketIoUrl, {
              auth: { token }, // Send Clerk JWT for authentication
              // `withCredentials: true` is not typically needed when using token-based auth for sockets
            });

            newSocket.on("connect", () => {
              console.log("Socket connected successfully with token auth. Socket ID:", newSocket.id);
            });

            // Register event handlers on the newSocket instance
            newSocket.on("receiveMessage", handleReceiveMessage);
            newSocket.on("recieve-channel-message", handleReceiveChannelMessage);
            newSocket.on("new-channel-added", addNewChannel);

            setSocket(newSocket);
            currentSocketRef.current = newSocket;

          } else {
            console.log("Clerk session exists but no token found. Socket not connected.");
            if (currentSocketRef.current) {
                currentSocketRef.current.disconnect();
                setSocket(null);
            }
          }
        } catch (error) {
          console.error("Error getting Clerk token for socket or connecting socket:", error);
          if (currentSocketRef.current) {
            currentSocketRef.current.disconnect();
            setSocket(null);
          }
        }
      } else if (isClerkLoaded && !userInfo?.id) {
        // User is not signed in, or Clerk session is not active / local user data not loaded
        console.log("SocketProvider: Clerk loaded but no active session or user not fully loaded. Disconnecting any existing socket.");
        if (currentSocketRef.current) {
          currentSocketRef.current.disconnect();
          setSocket(null);
        }
      }
    };

    // Define these handlers outside the effect or ensure they are stable (e.g. useCallback if they use state/props)
    // For simplicity here, they are defined as they were, but rely on useAppStore.getState() for latest store values.
    const handleReceiveMessage = (message) => {
        const {
        selectedChatData: currentChatData,
        selectedChatType: currentChatType,
        addMessage,
        addContactInDMContacts,
      } = useAppStore.getState();

      if (
        currentChatType !== undefined &&
        currentChatData && // Ensure currentChatData exists
        (currentChatData._id === message.sender?._id || // Add optional chaining
          currentChatData._id === message.recipient?._id)
      ) {
        addMessage(message);
      }
      addContactInDMContacts(message);
    };

    const handleReceiveChannelMessage = (message) => {
      const {
        selectedChatData,
        selectedChatType,
        addMessage,
        addChannelInChannelLists,
      } = useAppStore.getState();

      if (
        selectedChatType !== undefined &&
        selectedChatData && // Ensure currentChatData exists
        selectedChatData._id === message.channelId
      ) {
        addMessage(message);
      }
      addChannelInChannelLists(message);
    };

    const addNewChannel = (channel) => {
      const { addChannel } = useAppStore.getState();
      addChannel(channel);
    };

    connectSocket();

    return () => {
      if (currentSocketRef.current) {
        console.log("Disconnecting socket in SocketProvider cleanup for user:", userInfo?.id);
        currentSocketRef.current.disconnect();
        setSocket(null); // Clear socket state
        currentSocketRef.current = null;
      }
    };
    // Re-run effect if Clerk's loaded status, userInfo (specifically userInfo.id indicating login state), or clerk instance changes.
  }, [isClerkLoaded, userInfo?.id, clerk]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketProvider;
