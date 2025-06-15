import { RiCloseFill, RiPushpinFill, RiUserAddLine, RiGroupLine } from "react-icons/ri"; // Removed unused RiPushpinLine, Added RiUserAddLine, RiGroupLine
import { useState } from "react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { useAppStore } from "@/store";
import { HOST } from "@/lib/constants";
import { getColor } from "@/lib/utils";
import AddMembersModal from "@/components/modals/AddMembersModal.jsx"; // Corrected import path
import { Button } from "@/components/ui/button";

const ChatHeader = ({ handlePinMessage }) => {
  const { selectedChatData, closeChat, selectedChatType, userInfo } =
    useAppStore();
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);

  const handleAddMembers = () => {
    setShowAddMembersModal(true);
  };

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
                      className={`uppercase w-12 h-12 text-lg border-[1px] ${getColor(
                        selectedChatData.color
                      )} flex items-center justify-center rounded-full`}
                    >
                      {selectedChatData.firstName
                        ? selectedChatData.firstName.charAt(0)
                        : selectedChatData.email.charAt(0)}
                    </div>
                  )}
                </Avatar>
              ) : (
                <div className="bg-[#ffffff22] py-3 px-5 flex items-center justify-center rounded-full">
                  #
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                {selectedChatType === "channel" && selectedChatData.name}
                {selectedChatType === "channel" && selectedChatData.admin && (
                  <span className="text-xs text-neutral-400 cursor-default" title={`Admin: ${selectedChatData.admin.firstName} ${selectedChatData.admin.lastName}`}>
                    (Admin: {selectedChatData.admin.firstName})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                 {selectedChatType === "channel" && selectedChatData.members && (
                  <span className="text-sm text-neutral-400 flex items-center gap-1 cursor-pointer hover:underline" onClick={() => document.getElementById('member-list-details')?.classList.toggle('hidden')}>
                    <RiGroupLine />
                    {selectedChatData.members.length} member(s)
                  </span>
                )}
              </div>
              <span className="text-sm">
                {selectedChatType === "contact" &&
                selectedChatData.firstName &&
                selectedChatData.lastName
                  ? `${selectedChatData.firstName} ${selectedChatData.lastName}`
                  : selectedChatData.email}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-5">
          {selectedChatType === "channel" &&
            userInfo &&
            selectedChatData?.admin &&
            (userInfo._id || userInfo.id) === selectedChatData.admin._id && ( // Check both _id and id for userInfo
              <Button
                variant="outline"
                size="sm"
                className="text-neutral-300 hover:text-white hover:bg-gray-700"
                onClick={handleAddMembers}
                title="Add New Members"
              >
                <RiUserAddLine className="mr-2" /> Add Members
              </Button>
            )}
          <button
            className="text-neutral-300 focus:border-none focus:outline-none hover:text-red-500 transition-all duration-300"
            onClick={closeChat}
          >
            <RiCloseFill className="text-3xl" />
          </button>
        </div>
      </div>

      {/* Channel Member List - Collapsible */}
      {selectedChatType === "channel" && (
        <div id="member-list-details" className="mt-3 p-3 bg-[#ffffff0a] rounded-md hidden">
          <h4 className="text-sm font-semibold text-neutral-300 mb-2">Members:</h4>
          <ul className="text-xs text-neutral-400 max-h-24 overflow-y-auto">
            {selectedChatData.admin && (
              <li key={selectedChatData.admin._id} className="flex items-center gap-2 p-1 hover:bg-[#ffffff1a] rounded">
                <Avatar className="w-5 h-5">
                  {selectedChatData.admin.image ? (
                    <AvatarImage src={`${HOST}/${selectedChatData.admin.image}`} alt="admin" className="rounded-full"/>
                  ) : (
                    <div className={`w-5 h-5 text-xs ${getColor(selectedChatData.admin.color)} flex items-center justify-center rounded-full uppercase`}>
                      {selectedChatData.admin.firstName ? selectedChatData.admin.firstName.charAt(0) : selectedChatData.admin.email.charAt(0)}
                    </div>
                  )}
                </Avatar>
                {selectedChatData.admin.firstName} {selectedChatData.admin.lastName} (Admin)
              </li>
            )}
            {selectedChatData.members?.filter(member => member._id !== selectedChatData.admin._id).map(member => (
              <li key={member._id} className="flex items-center gap-2 p-1 hover:bg-[#ffffff1a] rounded">
                 <Avatar className="w-5 h-5">
                  {member.image ? (
                    <AvatarImage src={`${HOST}/${member.image}`} alt={member.firstName} className="rounded-full"/>
                  ) : (
                    <div className={`w-5 h-5 text-xs ${getColor(member.color)} flex items-center justify-center rounded-full uppercase`}>
                      {member.firstName ? member.firstName.charAt(0) : member.email.charAt(0)}
                    </div>
                  )}
                </Avatar>
                {member.firstName} {member.lastName}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Display Pinned Message */}
      {selectedChatType === "channel" && selectedChatData?.pinnedMessage && (
        <div 
          className="mt-2 p-2 bg-[#ffffff11] rounded-md flex items-center justify-between text-sm text-neutral-300 w-full cursor-pointer hover:bg-[#ffffff22]"
          onClick={() => {
            const messageElement = document.getElementById(`message-${selectedChatData.pinnedMessage._id}`);
            if (messageElement) {
              messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
              // Optionally highlight the message briefly
              messageElement.classList.add('highlight-pinned');
              setTimeout(() => messageElement.classList.remove('highlight-pinned'), 2000);
            }
          }}
          title="Scroll to pinned message"
        >
          <div className="flex items-center gap-2 overflow-hidden"> {/* Added overflow-hidden for long messages */}
            <RiPushpinFill className="text-yellow-400 flex-shrink-0" /> {/* Added flex-shrink-0 */}
            <span className="truncate"> {/* Added truncate for long messages */}
              Pinned:{" "}
              {selectedChatData.pinnedMessage.sender?.firstName || "User"}:{" "}
              {truncateContent(
                selectedChatData.pinnedMessage.content ||
                  selectedChatData.pinnedMessage.messageType
              )}
            </span>
          </div>
          {(userInfo._id || userInfo.id) === selectedChatData.admin._id && ( // Check both _id and id
            <Button
              variant="ghost"
              size="sm"
              className="p-1 h-auto text-neutral-400 hover:text-red-400"
              onClick={() => handlePinMessage(selectedChatData._id, null)}
              title="Unpin Message"
            >
              <RiCloseFill className="text-lg" />
            </Button>
          )}
        </div>
      )}

      {showAddMembersModal && selectedChatData?._id && (
        <AddMembersModal
          isOpen={showAddMembersModal}
          onClose={() => setShowAddMembersModal(false)}
          // channelId, currentMembers, etc. are accessed via Redux store in AddMembersModal directly
        />
      )}
    </div>
  );
};

export default ChatHeader;
