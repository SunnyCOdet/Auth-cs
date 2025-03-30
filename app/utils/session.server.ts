import { createCookieSessionStorage } from "@remix-run/node"; // or cloudflare/deno

type SessionData = {
  userId: number;
  username: string;
};

type SessionFlashData = {
  error: string;
  message: string;
};

// Ensure SESSION_SECRET is set in your environment variables
const sessionSecret = process.env.SESSION_SECRET || "default-secret-key-for-dev";
if (process.env.NODE_ENV === "production" && sessionSecret === "default-secret-key-for-dev") {
  console.warn(
    "SESSION_SECRET is not set or using default in production. Please set a strong secret."
  );
}

export const { getSession, commitSession, destroySession } =
  createCookieSessionStorage<SessionData, SessionFlashData>(
    {
      cookie: {
        name: "__session",
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: "/",
        sameSite: "lax",
        secrets: [sessionSecret],
        secure: process.env.NODE_ENV === "production",
      },
    }
  );
