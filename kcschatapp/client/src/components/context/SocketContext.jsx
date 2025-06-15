import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAppStore } from "../../store"; // Using Zustand store
import { SOCKET_HOST } from "../../lib/constants"; // Use SOCKET_HOST

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { userInfo } = useAppStore((state) => state.auth); // Get userInfo from auth slice

  useEffect(() => {
    let newSocket = null;
    if (userInfo && userInfo.id) { // Ensure userInfo and userInfo.id is available
      newSocket = io(SOCKET_HOST, { // Use SOCKET_HOST
        query: { userId: userInfo.id },
        transports: ["websocket"], // Optional: explicitly use websockets
      });
      setSocket(newSocket);

      newSocket.on("connect", () => {
        console.log("Socket connected:", newSocket.id);
      });

      newSocket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason);
        // Handle potential reconnection logic here if needed
      });

      newSocket.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
      });

    } else {
      // If no userInfo, disconnect any existing socket
      if (socket) {
        socket.disconnect();
        setSocket(null);
        console.log("Socket disconnected due to user logout.");
      }
    }

    return () => {
      if (newSocket) {
        console.log("Cleaning up socket connection.");
        newSocket.disconnect();
      }
    };
  }, [userInfo]); // Re-run effect if userInfo changes

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};
