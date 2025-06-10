import { BrowserRouter as Router, Routes, Route, Navigate }
  from 'react-router-dom';
import Profile from '@/pages/profile';
import Chat from '@/pages/chat';
import AuthPage from '@/pages/auth'; // Renamed Auth to AuthPage
// import apiClient from '@/lib/api-client'; // No longer needed for user fetching here
// import { GET_USERINFO_ROUTE } from '@/lib/constants'; // No longer needed here
import { useAppStore } from '@/store';
import { useAuth, useUser } from '@clerk/clerk-react'; // Import Clerk hooks
import { useEffect } from 'react';

// PrivateRoute using Clerk:
// Children are rendered if user is loaded and authenticated (userId exists).
// Otherwise, redirect to /auth.
const PrivateRoute = ({ children }) => {
  const { isLoaded, userId } = useAuth();
  if (!isLoaded) return <div className="h-screen w-full flex justify-center items-center">Loading authentication state...</div>; // Or a spinner component
  return userId ? children : <Navigate to="/auth" />;
};

// AuthRoute using Clerk:
// Children (AuthPage) are rendered if user is loaded and NOT authenticated.
// Otherwise, redirect to /chat.
const AuthRoute = ({ children }) => {
  const { isLoaded, userId } = useAuth();
  if (!isLoaded) return <div className="h-screen w-full flex justify-center items-center">Loading authentication state...</div>; // Or a spinner component
  return userId ? <Navigate to="/chat" /> : children;
};

function App() {
  const { setUserInfo } = useAppStore();
  const { isLoaded: isAuthLoaded, isSignedIn, userId: clerkAuthUserId } = useAuth(); // clerkAuthUserId is Clerk's own user ID from useAuth
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser(); // clerkUser contains detailed profile

  // Effect to update userInfo in Zustand store when Clerk user data changes
  useEffect(() => {
    if (isSignedIn && clerkUser) {
      // Store essential Clerk user details.
      // The local MongoDB _id will be handled by API calls transparently using the Clerk JWT.
      // Client-side userInfo.id will now be the Clerk User ID.
      setUserInfo({
        id: clerkUser.id, // This is Clerk's user ID (e.g., "user_2c...")
        clerkId: clerkUser.id, // Explicitly store Clerk ID
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        email: clerkUser.primaryEmailAddress?.emailAddress,
        image: clerkUser.imageUrl,
        // profileSetup might need to be fetched from our backend or assumed true after Clerk signup
        // color might also be from our backend
        // For now, keep it simple with Clerk data.
      });
    } else if (!isSignedIn) {
      setUserInfo(undefined);
    }
  }, [isSignedIn, clerkUser, setUserInfo]);

  if (!isAuthLoaded || !isUserLoaded) {
    // Show a global loading spinner or a minimal loading message
    // until both auth state and user profile are loaded.
    return <div className="h-screen w-full flex justify-center items-center">Loading application...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/auth"
          element={
            <AuthRoute>
              <AuthPage />
            </AuthRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <PrivateRoute>
              <Chat />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />
        {/* Default redirect: if signed in, to /chat, else to /auth */}
        <Route path="*" element={<Navigate to={isSignedIn ? "/chat" : "/auth"} />} />
      </Routes>
    </Router>
  );
}

export default App;
