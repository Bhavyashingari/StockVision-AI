import ChatHeader from "./components/chat-header";
import MessageBar from "./components/message-bar";
import MessageContainer from "./components/message-container";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { useAppStore } from "@/store"; // To access selectedChatData for optimistic updates or context

const ChatContainer = () => {
  const { selectedChatData } = useAppStore(); // Get selectedChatData for context

  const handlePinMessage = async (channelId, messageId) => {
    if (!channelId) {
      toast.error("Channel ID is missing.");
      return;
    }

    try {
      await apiClient.put(
        `/channel/${channelId}/pin`, // Corrected path based on backend route
        { messageId }, // messageId can be null for unpinning
        { withCredentials: true }
      );
      toast.success(
        messageId ? "Message pinned successfully." : "Message unpinned successfully."
      );
      // Actual state update will come via 'channelUpdated' WebSocket event
      // which then calls updateChannelDetails in chat-slice.
    } catch (error) {
      console.error("Error pinning/unpinning message:", error);
      toast.error(
        error.response?.data?.message || "Failed to update pinned message."
      );
    }
  };

  return (
    <div className="fixed top-0 h-[100vh] w-[100vw] bg-[#1c1d25] flex flex-col md:static md:flex-1">
      <ChatHeader handlePinMessage={handlePinMessage} />
      <MessageContainer handlePinMessage={handlePinMessage} />
      <MessageBar />
    </div>
  );
};

export default ChatContainer;
