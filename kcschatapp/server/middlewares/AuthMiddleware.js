import { clerkMiddleware, requireAuth as clerkRequireAuth } from '@clerk/express';

// This middleware attaches req.auth if the user is authenticated.
// It reads CLERK_SECRET_KEY and CLERK_PUBLISHABLE_KEY from environment variables.
// It should be configured to run globally in your app (e.g., in index.js)
// or on specific routes if you don't want it to run everywhere.
// For optional authentication on some routes, you can use this followed by checking req.auth.
export const attachAuthInfo = clerkMiddleware({
  // Ensure CLERK_SECRET_KEY and CLERK_PUBLISHABLE_KEY are in your .env file
});

// This middleware ensures the user is authenticated or throws an error (typically 401 or 403).
// It also runs the logic of clerkMiddleware to populate req.auth.
// Use this for routes that strictly require an authenticated user.
export const ensureAuthenticated = clerkRequireAuth({
  // Ensure CLERK_SECRET_KEY and CLERK_PUBLISHABLE_KEY are in your .env file
});


// The old verifyToken function is replaced by Clerk's middleware.
// Clerk's middleware will populate req.auth, and req.auth.userId will contain the Clerk User ID.
// No need to manually verify JWTs here.

/*
import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  const token = req.cookies.jwt;
  if (!token) return res.status(401).send("You are not authenticated!");
  jwt.verify(token, process.env.JWT_KEY, async (err, payload) => {
    if (err) return res.status(403).send("Token is not valid!");
    req.userId = payload?.userId; // This will now be req.auth.userId from Clerk
    next();
  });
};
*/
