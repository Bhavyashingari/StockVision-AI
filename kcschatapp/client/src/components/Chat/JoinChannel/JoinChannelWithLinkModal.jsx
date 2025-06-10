import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const JoinChannelWithLinkModal = ({ isOpen, onClose, onJoinChannel }) => {
  const [link, setLink] = useState("");

  const handleSubmit = () => {
    if (link.trim()) {
      // Extract the actual link token from a potential full URL
      const linkParts = link.trim().split("/");
      const linkToken = linkParts[linkParts.length - 1];
      onJoinChannel(linkToken);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#181920] border-none text-white">
        <DialogHeader>
          <DialogTitle>Join Channel with Link</DialogTitle>
          <DialogDescription>
            Paste the join link below to join a channel.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <Input
            placeholder="Enter channel join link"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className="rounded-lg py-6 px-4 bg-[#2c2e3b] border-none"
          />
        </div>
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-green-600 hover:bg-green-700"
            disabled={!link.trim()}
          >
            Join Channel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default JoinChannelWithLinkModal;
