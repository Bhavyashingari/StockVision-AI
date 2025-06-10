import { BrowserRouter as Router, Routes, Route, Navigate }
  from 'react-router-dom';
import Profile from '@/pages/profile';
import Chat from '@/pages/chat';
import AuthPage from '@/pages/auth';
import SignUpPage from '@/pages/auth/SignUpPage'; // Import the new SignUpPage
// import apiClient from '@/lib/api-client'; // No longer needed for user fetching here
// import { GET_USERINFO_ROUTE } from '@/lib/constants'; // Will be needed now
import { useAppStore } from '@/store';
import { useAuth, useUser } from '@clerk/clerk-react'; // Clerk hooks
import { useEffect } from 'react';
import apiClient from '@/lib/api-client'; // Import apiClient
import { GET_USERINFO_ROUTE } from '@/lib/constants'; // Import route constant

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
  const { setUserInfo } = useAppStore(); // Removed setSocket, will be handled in SocketContext
  // getToken is not directly used here, but it's good to know it's available from useAuth if needed elsewhere.
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();

  // Effect to update userInfo in Zustand store when Clerk user data changes
  useEffect(() => {
    const updateUserSession = async () => {
      if (isSignedIn && clerkUser) {
        try {
          // apiClient should be configured to send the Clerk token automatically.
          // This typically happens if Clerk's <ClerkProvider> wraps your app and
          // it patches `fetch`, or if your apiClient instance has an interceptor
          // to get the token using `clerk.session.getToken()`.
          const response = await apiClient.get(GET_USERINFO_ROUTE);

          const localUserData = response.data; // User object from your DB

          setUserInfo({
            // Prioritize local DB _id as the main 'id' for app consistency
            id: localUserData.id, // This is MongoDB _id
            clerkId: clerkUser.id, // Clerk's user ID
            // Use Clerk's data as primary for names/image, fallback to local if clerk's is null/undefined
            firstName: clerkUser.firstName ?? localUserData.firstName,
            lastName: clerkUser.lastName ?? localUserData.lastName,
            email: clerkUser.primaryEmailAddress?.emailAddress ?? localUserData.email,
            image: clerkUser.imageUrl ?? localUserData.image,
            profileSetup: localUserData.profileSetup, // From your backend
            color: localUserData.color, // From your backend
          });

        } catch (error) {
          console.error("Failed to fetch local user data:", error);
          // Fallback to Clerk data only if local fetch fails critically
          // This ensures basic user info is still available for UI.
          setUserInfo({
            id: clerkUser.id, // Fallback to Clerk ID as primary ID
            clerkId: clerkUser.id,
            firstName: clerkUser.firstName,
            lastName: clerkUser.lastName,
            email: clerkUser.primaryEmailAddress?.emailAddress,
            image: clerkUser.imageUrl,
            profileSetup: false, // Sensible default, or undefined
            color: undefined,    // Sensible default, or undefined
          });
        }
      } else if (!isSignedIn) {
        setUserInfo(undefined);
      }
    };

    // Only run updateUserSession when Clerk has loaded both auth and user states.
    if (isAuthLoaded && isUserLoaded) {
      updateUserSession();
    }
    // Dependencies: clerkUser can be an object, so stringify or use specific fields if causing re-runs.
    // clerkUser.id is a good stable dependency.
  }, [isSignedIn, clerkUser?.id, isAuthLoaded, isUserLoaded, setUserInfo]);

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
          path="/sign-up" // New route for sign-up
          element={
            <AuthRoute>
              <SignUpPage />
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
