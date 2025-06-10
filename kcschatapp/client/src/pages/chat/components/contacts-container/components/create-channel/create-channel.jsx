import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@radix-ui/react-tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FaPlus } from "react-icons/fa";
import MultipleSelector from "@/components/ui/multipleselect";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import apiClient from "@/lib/api-client";
import { CREATE_CHANNEL, GET_ALL_CONTACTS } from "@/lib/constants";
import { useSocket } from "@/contexts/SocketContext";
import { useAppStore } from "@/store";
import { Input } from "@/components/ui/input";
import { Copy, Check } from "lucide-react"; // For copy button icon

const CreateChannel = () => {
  const [newChannelModal, setNewChannelModal] = useState(false);
  const [allContacts, setAllContacts] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [channelName, setChannelName] = useState("");
  const [createdChannelData, setCreatedChannelData] = useState(null); // To store created channel info
  const [linkCopied, setLinkCopied] = useState(false); // Feedback for copy button
  const socket = useSocket();
  const { addChannel } = useAppStore();

  const resetForm = () => {
    setChannelName("");
    setSelectedContacts([]);
    setCreatedChannelData(null);
    setLinkCopied(false);
  };

  const handleCloseModal = () => {
    resetForm();
    setNewChannelModal(false);
  }

  useEffect(() => {
    const getData = async () => {
      const response = await apiClient.get(GET_ALL_CONTACTS, {
        withCredentials: true,
      });
      setAllContacts(response.data.contacts);
    };
    getData();
  }, []);

  const createChannel = async () => {
    if (!channelName || selectedContacts.length === 0) {
      // TODO: Add user feedback for empty fields
      console.log("Channel name and members are required.");
      return;
    }
    try {
      const response = await apiClient.post(
        CREATE_CHANNEL,
        {
          name: channelName,
          members: selectedContacts.map((contact) => contact.value),
        },
        { withCredentials: true }
      );
      if (response.status === 201 && response.data.channel) {
        addChannel(response.data.channel);
        socket.emit("add-channel-notify", response.data.channel);
        setCreatedChannelData(response.data.channel); // Store created channel data
        // Keep modal open to show link
      }
    } catch (error) {
      console.error("Error creating channel:", error);
      // TODO: Show error to user
    }
  };

  const handleCopyLink = () => {
    if (createdChannelData?.joinLink) {
      navigator.clipboard.writeText(
        `${window.location.origin}/join/${createdChannelData.joinLink}` // Assuming join page is at /join/:link
      );
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000); // Reset copied status after 2s
    }
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <FaPlus
              className=" text-neutral-400 font-light text-opacity-90 text-sm hover:text-neutral-100 cursor-pointer transition-all duration-300"
              onClick={() => {
                resetForm(); // Reset form when opening modal
                setNewChannelModal(true);
              }}
            />
          </TooltipTrigger>
          <TooltipContent className="bg-[#1c1b1e] border-none mb-2 p-3">
            Create New Channel
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Dialog open={newChannelModal} onOpenChange={handleCloseModal}>
        <DialogDescription className="hidden">
          Please insert details
        </DialogDescription>
        <DialogContent className="bg-[#181920] border-none text-white w-[400px] h-max flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {createdChannelData ? "Channel Created!" : "Create a new Channel"}
            </DialogTitle>
          </DialogHeader>

          {!createdChannelData ? (
            <>
              <div>
                <Input
                  placeholder="Channel Name"
                  className="rounded-lg py-6 px-4 bg-[#2c2e3b] border-none"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                />
              </div>
              <div className="my-3">
                <MultipleSelector
                  className="rounded-lg bg-[#2c2e3b] border-none py-2 text-white"
                  defaultOptions={allContacts}
                  placeholder="Search Contacts"
                  value={selectedContacts}
                  onChange={setSelectedContacts}
                  emptyIndicator={
                    <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                      No results found.
                    </p>
                  }
                />
              </div>
              <div>
                <Button
                  onClick={createChannel}
                  className=" w-full bg-purple-700 hover:bg-purple-900 transition-all duration-300"
                  disabled={!channelName || selectedContacts.length === 0}
                >
                  Create Channel
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <p className="text-green-500">Channel '{createdChannelData.name}' created successfully!</p>
              <p className="text-sm text-neutral-400">Share this link to invite others:</p>
              <div className="flex items-center gap-2 w-full p-2 border border-neutral-600 rounded bg-neutral-800">
                <Input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/join/${createdChannelData.joinLink}`}
                  className="bg-transparent border-none text-neutral-300 flex-1"
                />
                <Button onClick={handleCopyLink} variant="ghost" size="icon" title="Copy link">
                  {linkCopied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                </Button>
              </div>
              <Button onClick={handleCloseModal} className="w-full">
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CreateChannel;
