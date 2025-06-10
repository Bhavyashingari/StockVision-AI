import React from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"; // Assuming Avatar component exists

const IncomingCallToast = ({ callerInfo, onAccept, onReject }) => {
  // callerInfo might have { name, image }
  const callerName = callerInfo?.name || "Unknown Caller";
  const callerImage = callerInfo?.image;

  return (
    <div className="fixed top-5 right-5 bg-gray-800 text-white p-4 rounded-lg shadow-lg z-50">
      <div className="flex items-center space-x-3">
        <Avatar>
          <AvatarImage src={callerImage} alt={callerName} />
          <AvatarFallback>{callerName.substring(0, 2)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold">{callerName} is calling...</p>
          <p className="text-sm">Incoming video call</p>
        </div>
      </div>
      <div className="mt-3 flex justify-end space-x-2">
        <Button variant="destructive" size="sm" onClick={onReject}>
          Reject
        </Button>
        <Button variant="success" size="sm" onClick={onAccept}> {/* Assuming 'success' variant exists or use default */}
          Accept
        </Button>
      </div>
    </div>
  );
};

export default IncomingCallToast;
