import React, { useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const VideoCallModal = ({
  isOpen,
  onClose,
  localStream,
  remoteStream,
  onEndCall,
  // TODO: Add props for mute/hide video handlers
}) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Video Call</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted // Local video is often muted to prevent echo
              className="w-full h-auto bg-black rounded"
            />
            <p className="text-center text-sm">You</p>
          </div>
          <div>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-auto bg-black rounded"
            />
            <p className="text-center text-sm">Remote User</p>
          </div>
        </div>
        <DialogFooter className="mt-4">
          {/* TODO: Implement Mute/Unmute Mic Button */}
          <Button variant="outline">Mute Mic</Button>
          {/* TODO: Implement Show/Hide Video Button */}
          <Button variant="outline">Hide Video</Button>
          <Button variant="destructive" onClick={onEndCall}>
            End Call
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VideoCallModal;
