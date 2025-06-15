import { RiCloseFill, RiPushpinFill, RiPushpinLine } from "react-icons/ri"; // Added RiPushpinFill for unpin icon
import { useState } from "react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { useAppStore } from "@/store";
import { HOST, apiClient } from "@/lib/api-client"; // apiClient for API calls
import { getColor } from "@/lib/utils";
import AddMembersModal from "../add-members-modal";
import { toast } from "sonner";
import { Button } from "@/components/ui/button"; // For unpin button

const ChatHeader = ({ handlePinMessage }) => { // Expect handlePinMessage from parent
  const { selectedChatData, closeChat, selectedChatType, userInfo } =
    useAppStore();
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);

  const handleAddMembers = () => {
    setShowAddMembersModal(true);
  };

  // Function to truncate message content for display
  const truncateContent = (content, maxLength = 50) => {
    if (!content) return "";
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
  };

  return (
    <div className="h-auto min-h-[10vh] border-b-2 border-[#2f303b] px-20 py-3 flex flex-col">
      <div className="flex items-center justify-between w-full">
        <div className="flex gap-5 items-center">
          <div className="flex gap-3 items-center justify-center">
            <div className="w-12 h-12 relative flex items-center justify-center">
            {selectedChatType === "contact" ? (
              <Avatar className="w-12 h-12 rounded-full overflow-hidden">
                {selectedChatData.image ? (
                  <AvatarImage
                    src={`${HOST}/${selectedChatData.image}`}
                    alt="profile"
                    className="object-cover w-full h-full bg-black rounded-full"
                  />
                ) : (
                  <div
                    className={`uppercase w-12 h-12 text-lg   border-[1px] ${getColor(
                      selectedChatData.color
                    )} flex items-center justify-center rounded-full`}
                  >
                    {selectedChatData.firstName
                      ? selectedChatData.firstName.split("").shift()
                      : selectedChatData.email.split("").shift()}
                  </div>
                )}
              </Avatar>
            ) : (
              <div
                className={` bg-[#ffffff22] py-3 px-5 flex items-center justify-center rounded-full`}
              >
                #
              </div>
            )}
          </div>
          <div>
            <div>
              <div className="flex items-center">
                {selectedChatType === "channel" && selectedChatData.name}
                {selectedChatType === "channel" && selectedChatData.members && (
                  <span className="text-sm text-neutral-400 ml-2">
                    ({selectedChatData.members.length} members)
                  </span>
                )}
              </div>
              {selectedChatType === "contact" &&
              selectedChatData.firstName &&
              selectedChatData.lastName
                ? `${selectedChatData.firstName} ${selectedChatData.lastName}`
                : selectedChatData.email}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-5">
        {selectedChatType === "channel" &&
          userInfo && selectedChatData && selectedChatData.admin &&
          userInfo.id === selectedChatData.admin._id && (
            <button
              className="text-neutral-300 bg-gray-700 hover:bg-gray-600 p-2 rounded-md focus:border-none focus:outline-none focus:text-white transition-all duration-300"
              onClick={handleAddMembers}
            >
              Add Members
            </button>
          )}
          <button
            className="text-neutral-300 focus:border-none focus:outline-none focus:text-white transition-all duration-300"
            onClick={closeChat}
          >
            <RiCloseFill className="text-3xl" />
          </button>
        </div>
      </div>

      {/* Display Pinned Message */}
      {selectedChatType === "channel" && selectedChatData?.pinnedMessage && (
        <div className="mt-2 p-2 bg-[#ffffff11] rounded-md flex items-center justify-between text-sm text-neutral-300 w-full">
          <div className="flex items-center gap-2">
            <RiPushpinFill className="text-yellow-400" />
            <span>
              Pinned: {selectedChatData.pinnedMessage.sender?.firstName || "User"}:{" "}
              {truncateContent(selectedChatData.pinnedMessage.content || selectedChatData.pinnedMessage.messageType)}
            </span>
            {/* TODO: Add onClick to scroll to message if possible */}
          </div>
          {userInfo.id === selectedChatData.admin._id && (
            <Button
              variant="ghost"
              size="sm"
              className="p-1 h-auto text-neutral-400 hover:text-red-400"
              onClick={() => handlePinMessage(selectedChatData._id, null)} // Unpin
              title="Unpin Message"
            >
              <RiCloseFill className="text-lg" />
            </Button>
          )}
        </div>
      )}

      {showAddMembersModal && selectedChatData && selectedChatData._id && (
        <AddMembersModal
          isOpen={showAddMembersModal}
          onClose={() => setShowAddMembersModal(false)}
          channelId={selectedChatData._id}
          currentMembers={selectedChatData.members || []}
        />
      )}
    </div>
  );
};

export default ChatHeader;
