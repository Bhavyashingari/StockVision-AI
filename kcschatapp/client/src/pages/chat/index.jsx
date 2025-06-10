import { useEffect } from "react";
import ChatContainer from "./components/chat-container";
import ContactsContainer from "./components/contacts-container";
import { useAppStore } from "@/store";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import EmptyChatContainer from "./components/empty-chat-container";
import { UserButton } from "@clerk/clerk-react"; // Import UserButton

const Chat = () => {
  const {
    userInfo, // This userInfo now comes from Clerk via App.jsx's useEffect
    selectedChatType,
    isUploading,
    fileUploadProgress,
    isDownloading,
    downloadProgress,
  } = useAppStore();
  const navigate = useNavigate();
  useEffect(() => {
    // The profileSetup check might need re-evaluation.
    // If Clerk's user profile doesn't have `profileSetup`, this will always redirect.
    // This logic might need to be moved to a point after local user data (with profileSetup) is fetched
    // or handled differently based on Clerk's user properties (e.g. publicMetadata or unsafeMetadata).
    // For now, if userInfo.profileSetup is not set by Clerk data, this will cause issues.
    // Temporarily, let's assume Clerk user data might not have profileSetup.
    // This check should ideally be against your backend's user profile data.
    if (userInfo && userInfo.id && !userInfo.profileSetup) { // Check userInfo and userInfo.id
      // toast("Please setup profile to continue."); // This toast might be annoying if profileSetup isn't from a reliable source yet.
      // navigate("/profile");
      console.log("Profile setup check: UserInfo.profileSetup is false or undefined. Navigation to /profile would occur.", userInfo);
    }
  }, [userInfo, navigate]);

  return (
    <div className="flex h-[100vh] w-full text-white overflow-hidden"> {/* Added w-full for clarity */}
      {/* Example: Add UserButton to the top right. A proper header component is better. */}
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 1000 }}>
        <UserButton afterSignOutUrl="/auth" />
      </div>

      {isUploading && (
        <div className="h-[100vh] w-[100vw] fixed top-0 z-10 left-0 bg-black/80 flex items-center justify-center flex-col gap-5">
          <h5 className="text-5xl animate-pulse">Uploading File</h5>
          {fileUploadProgress}%
        </div>
      )}
      {isDownloading && (
        <div className="h-[100vh] w-[100vw] fixed top-0 z-10 left-0 bg-black/80 flex items-center justify-center flex-col gap-5">
          <h5 className="text-5xl animate-pulse">Downloading File</h5>
          {downloadProgress}%
        </div>
      )}
      <ContactsContainer />
      {selectedChatType === undefined ? (
        <EmptyChatContainer />
      ) : (
        <ChatContainer />
      )}
    </div>
  );
};

export default Chat;
