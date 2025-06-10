import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { Toaster } from "@/components/ui/sonner";
import { ClerkProvider } from '@clerk/clerk-react';

import "./index.css";
import { SocketProvider } from "./contexts/SocketContext";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  // Attempt to remind the user if the key is missing, though direct .env modification failed.
  console.error("Missing Publishable Key. Make sure VITE_CLERK_PUBLISHABLE_KEY is set in your .env file.");
  // Optionally, render an error message to the screen
  // For now, throwing an error might be too disruptive if .env modification is tricky for the tool.
  // Instead, the app might not work correctly, which will be noticeable.
  // Consider if an alert or a visible message in the UI is better than a console error.
  // throw new Error("Missing Publishable Key. Make sure VITE_CLERK_PUBLISHABLE_KEY is set in your .env file.");
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <SocketProvider>
        <App />
        <Toaster closeButton richColors />
      </SocketProvider>
    </ClerkProvider>
  </React.StrictMode>
);
