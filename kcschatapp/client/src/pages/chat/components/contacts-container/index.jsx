import ContactList from "@/components/common/contact-list";
import Logo from "@/components/common/logo";
import ProfileInfo from "./components/profile-info";
import apiClient from "@/lib/api-client";
import {
  GET_CONTACTS_WITH_MESSAGES_ROUTE,
  GET_USER_CHANNELS,
  JOIN_CHANNEL_BY_LINK, // Import the new constant
} from "@/lib/constants";
import { useEffect, useState } from "react";
import { useAppStore } from "@/store";
import NewDM from "./components/new-dm/new-dm";
import CreateChannel from "./components/create-channel/create-channel";
import JoinChannelWithLinkModal from "@/components/Chat/JoinChannel/JoinChannelWithLinkModal"; // Import the new modal
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // For new button
import { LogIn } from "lucide-react"; // Icon for join channel button
import { toast } from "sonner"; // For notifications

const ContactsContainer = () => {
  const {
    setDirectMessagesContacts,
    directMessagesContacts,
    channels,
    setChannels,
    addChannel, // To add the joined channel to the store
    setSelectedChatData, // To switch to the new channel
    setSelectedChatType,
  } = useAppStore();

  const [isJoinChannelModalOpen, setIsJoinChannelModalOpen] = useState(false);

  useEffect(() => {
    const getContactsWithMessages = async () => {
      const response = await apiClient.get(GET_CONTACTS_WITH_MESSAGES_ROUTE, {
        withCredentials: true,
      });
      if (response.data.contacts) {
        setDirectMessagesContacts(response.data.contacts);
      }
    };
    getContactsWithMessages();
  }, [setDirectMessagesContacts]);

  useEffect(() => {
    const getChannels = async () => {
      const response = await apiClient.get(GET_USER_CHANNELS, {
        withCredentials: true,
      });
      if (response.data.channels) {
        setChannels(response.data.channels);
      }
    };
    getChannels();
  }, [setChannels]);

  const handleJoinChannelWithLink = async (linkToken) => {
    if (!linkToken) {
      toast.error("Invalid link provided.");
      return;
    }
    try {
      const response = await apiClient.get(JOIN_CHANNEL_BY_LINK(linkToken), {
        withCredentials: true,
      });

      if (response.status === 200 && response.data.channel) {
        const newChannel = response.data.channel;
        // Check if channel already exists to avoid duplicates (optional, server might handle this)
        if (!channels.find(ch => ch._id === newChannel._id)) {
          addChannel(newChannel); // Add to global and user-specific channel list in store
        }
        setSelectedChatData(newChannel);
        setSelectedChatType("channel");
        setIsJoinChannelModalOpen(false);
        toast.success(`Successfully joined channel: ${newChannel.name}`);
      } else {
        // Handle other success statuses if necessary, or rely on catch block for errors
        toast.error(response.data.message || "Failed to join channel.");
      }
    } catch (error) {
      console.error("Error joining channel by link:", error);
      if (error.response && error.response.data && error.response.data.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("An unexpected error occurred while trying to join the channel.");
      }
    }
  };

  return (
    <div className="relative md:w-[35vw] lg:w-[30vw] xl:w-[20vw] bg-[#1b1c24] border-r-2 border-[#2f303b] w-full">
      <div className=" pt-3">
        <Logo />
      </div>
      <div className="my-5">
        <div className="flex items-center justify-between pr-10">
          <Title text="Direct Messages" />
          <NewDM />
        </div>
        <div className="max-h-[38vh] overflow-y-auto scrollbar-hidden">
          <ContactList contacts={directMessagesContacts} />
        </div>
      </div>
      <div className="my-5">
        <div className="flex items-center justify-between pr-10">
          <Title text="Channels" />
          <div className="flex gap-2 items-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <LogIn
                    className="text-neutral-400 font-light text-opacity-90 text-sm hover:text-neutral-100 cursor-pointer transition-all duration-300"
                    onClick={() => setIsJoinChannelModalOpen(true)}
                  />
                </TooltipTrigger>
                <TooltipContent className="bg-[#1c1b1e] border-none mb-2 p-3">
                  Join Channel with Link
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <CreateChannel />
          </div>
        </div>
        <div className="max-h-[37vh] overflow-y-auto scrollbar-hidden pb-5">
          <ContactList contacts={channels} isChannel />
        </div>
      </div>
      <ProfileInfo />
      {isJoinChannelModalOpen && (
        <JoinChannelWithLinkModal
          isOpen={isJoinChannelModalOpen}
          onClose={() => setIsJoinChannelModalOpen(false)}
          onJoinChannel={handleJoinChannelWithLink}
        />
      )}
    </div>
  );
};

export default ContactsContainer;

const Title = ({ text }) => {
  return (
    <h6 className="uppercase tracking-widest text-neutral-400 pl-10 font-light text-opacity-90 text-sm">
      {text}
    </h6>
  );
};
