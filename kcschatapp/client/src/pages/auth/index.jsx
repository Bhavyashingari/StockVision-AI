import { SignIn } from '@clerk/clerk-react';
import React from 'react';
// The Link component from react-router-dom is not strictly needed here
// because Clerk's <SignIn> component handles the link to the sign-up page
// via the signUpUrl prop when routing="path".

const AuthPage = () => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      flexDirection: 'column',
      // Adding a background color to better see the component against a plain page
      // This is optional and can be removed or adjusted.
      // backgroundColor: '#f0f2f5'
    }}>
      {/*
        This will render Clerk's Sign In UI.
        - `routing="path"` tells Clerk to use path-based routing.
        - `path="/auth"` specifies the current path for the sign-in component.
        - `signUpUrl="/sign-up"` tells Clerk where to navigate for the sign-up flow.
        Social providers (Google, GitHub, etc.) will appear if enabled in your Clerk Dashboard.
      */}
      <SignIn routing="path" path="/auth" signUpUrl="/sign-up" />
    </div>
  );
};

export default AuthPage;
