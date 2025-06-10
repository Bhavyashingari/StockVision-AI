import { SignUp } from '@clerk/clerk-react';
import React from 'react';

const SignUpPage = () => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      // Optional background color
      // backgroundColor: '#f0f2f5'
    }}>
      {/*
        This will render Clerk's Sign Up UI.
        - `routing="path"` tells Clerk to use path-based routing.
        - `path="/sign-up"` specifies the current path for the sign-up component.
        - `signInUrl="/auth"` tells Clerk where to navigate for the sign-in flow if the user wants to switch.
      */}
      <SignUp routing="path" path="/sign-up" signInUrl="/auth" />
    </div>
  );
};

export default SignUpPage;
