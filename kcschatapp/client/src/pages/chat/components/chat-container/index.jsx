import React, { useState, useEffect, useRef } from "react";
import { useAppStore } from "@/store"; // Assuming Zustand store is used for socket and user info
import ChatHeader from "./components/chat-header";
import MessageBar from "./components/message-bar";
import MessageContainer from "./components/message-container";
import VideoCallModal from "@/components/Chat/VideoCall/VideoCallModal";
import IncomingCallToast from "@/components/Chat/VideoCall/IncomingCallToast";
import { Button } from "@/components/ui/button"; // For the call button
import { Phone } from "lucide-react"; // Icon for call button

const ICE_SERVERS = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const ChatContainer = () => {
  const { socket, userInfo, selectedChatUser } = useAppStore((state) => ({
    socket: state.socket,
    userInfo: state.userInfo,
    selectedChatUser: state.selectedChatUser,
  }));

  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const peerConnectionRef = useRef(null); // Using ref for peerConnection
  const [incomingCall, setIncomingCall] = useState(null);
  const [isCallInProgress, setIsCallInProgress] = useState(false);
  const [targetUserId, setTargetUserId] = useState(null); // ID of the user being called or calling

  // Helper function to get caller info
  const getCallerInfo = () => ({
    name: userInfo?.firstName ? `${userInfo.firstName} ${userInfo.lastName || ""}`.trim() : "Unknown User",
    id: userInfo?.id,
    // image: userInfo?.image // Add if user image is available in store
  });

  // Initialize Peer Connection
  const initializePeerConnection = () => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate && targetUserId) {
        socket.emit("ice-candidate", {
          targetUserId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      } else {
        // Fallback for older browsers
        const newStream = new MediaStream();
        newStream.addTrack(event.track);
        setRemoteStream(newStream);
      }
    };

    // Add local tracks if stream already exists (e.g. when accepting a call)
    if (localStream) {
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    }

    peerConnectionRef.current = pc;
    return pc;
  };

  // Start Local Stream
  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      // Add tracks to peer connection if it exists
      if (peerConnectionRef.current) {
        stream.getTracks().forEach(track => peerConnectionRef.current.addTrack(track, stream));
      }
      return stream; // Return stream so it can be used immediately
    } catch (error) {
      console.error("Error accessing media devices.", error);
      // TODO: Show error to user
      return null;
    }
  };

  // Initiate Call
  const initiateCall = async (userIdToCall) => {
    if (!socket) {
      console.error("Socket not available");
      // TODO: Show error to user
      return;
    }
    if (!userIdToCall) {
      console.error("Target user ID not provided for initiating call.");
      return;
    }

    setTargetUserId(userIdToCall);
    const currentLocalStream = await startLocalStream();
    if (!currentLocalStream) return;


    const pc = initializePeerConnection();
    // Add tracks from the newly started local stream
    currentLocalStream.getTracks().forEach(track => pc.addTrack(track, currentLocalStream));

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("initiate-call", {
        targetUserId: userIdToCall,
        offer,
        callerInfo: getCallerInfo(),
      });
      setIsCallModalOpen(true);
    } catch (error) {
      console.error("Error creating offer:", error);
    }
  };

  // Accept Call
  const acceptCall = async () => {
    if (!socket || !incomingCall) return;

    setTargetUserId(incomingCall.from); // The user who sent the offer
    const currentLocalStream = await startLocalStream();
    if (!currentLocalStream) return;

    const pc = initializePeerConnection();
    // Add tracks from the newly started local stream
    currentLocalStream.getTracks().forEach(track => pc.addTrack(track, currentLocalStream));

    try {
      await pc.setRemoteDescription(
        new RTCSessionDescription(incomingCall.offer)
      );
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("call-answer", {
        targetUserId: incomingCall.from,
        answer,
      });

      setIsCallModalOpen(true);
      setIsCallInProgress(true);
      setIncomingCall(null);
    } catch (error) {
      console.error("Error accepting call:", error);
    }
  };

  // Reject Call
  const rejectCall = () => {
    if (!socket || !incomingCall) return;
    socket.emit("call-rejected", { targetUserId: incomingCall.from });
    setIncomingCall(null);
    // TODO: Show notification that call was rejected
  };

  // End Call Handler
  const endCallHandler = () => {
    if (socket && targetUserId) {
      socket.emit("end-call", { targetUserId });
    }
    cleanUpCall();
  };

  const cleanUpCall = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
      setRemoteStream(null);
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setIsCallModalOpen(false);
    setIsCallInProgress(false);
    setIncomingCall(null);
    setTargetUserId(null);
     // TODO: Show notification that call has ended
  };


  // Socket Event Handlers
  useEffect(() => {
    if (!socket) return;

    const handleCallOffer = ({ from, offer, callerInfo }) => {
      setIncomingCall({ from, offer, callerInfo });
      setTargetUserId(from); // Set target for potential ICE candidates before accept
    };

    const handleCallAnswered = async ({ from, answer }) => {
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(answer)
          );
          setIsCallInProgress(true);
          // Remote stream should be set by 'ontrack'
        } catch (error) {
          console.error("Error setting remote description:", error);
        }
      }
    };

    const handleCallDeclined = ({ from }) => {
      // TODO: Show notification: `${from} declined the call.`
      console.log(`Call declined by ${from}`);
      cleanUpCall();
    };

    const handleIceCandidate = async ({ from, candidate }) => {
      if (peerConnectionRef.current && candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        } catch (error) {
          console.error("Error adding ICE candidate:", error);
        }
      }
    };

    const handleCallEnded = ({ from }) => {
      // TODO: Show notification: `Call with ${from} ended.`
      console.log(`Call ended by ${from}`);
      cleanUpCall();
    };

    socket.on("call-offer", handleCallOffer);
    socket.on("call-answered", handleCallAnswered);
    socket.on("call-declined", handleCallDeclined);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("call-ended", handleCallEnded);

    return () => {
      socket.off("call-offer", handleCallOffer);
      socket.off("call-answered", handleCallAnswered);
      socket.off("call-declined", handleCallDeclined);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("call-ended", handleCallEnded);
    };
  }, [socket, localStream]); // Added localStream dependency for initializePeerConnection

  return (
    <div className="fixed top-0 h-[100vh] w-[100vw] bg-[#1c1d25] flex flex-col md:static md:flex-1">
      {/* Pass initiateCall and selectedChatUser to ChatHeader for the call button */}
      <ChatHeader
        initiateCall={() => selectedChatUser && initiateCall(selectedChatUser._id)}
        canCall={!!selectedChatUser} // Example: only enable call if a user is selected
      />
      <MessageContainer />
      <MessageBar />

      {incomingCall && !isCallInProgress && (
        <IncomingCallToast
          callerInfo={incomingCall.callerInfo}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}

      {isCallModalOpen && (
        <VideoCallModal
          isOpen={isCallModalOpen}
          onClose={endCallHandler} // Or a different handler if just closing modal without ending call
          localStream={localStream}
          remoteStream={remoteStream}
          onEndCall={endCallHandler}
        />
      )}
    </div>
  );
};

export default ChatContainer;
