import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { dbConnection } from '~/db/db.server';
import { getSession, commitSession, destroySession } from './session.server.ts';
import { redirect, json } from '@remix-run/node';
import type { User } from '~/types'; // Assuming types definition

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createUserSession(userId: number, username: string, redirectTo: string) {
  const session = await getSession();
  session.set("userId", userId);
  session.set("username", username);
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  });
}

export async function getUserFromSession(request: Request): Promise<User | null> {
    const session = await getSession(request.headers.get("Cookie"));
    const userId = session.get("userId");
    const username = session.get("username");

    if (!userId || typeof userId !== 'number' || !username || typeof username !== 'string') {
        return null;
    }

    // Optionally re-verify user exists in DB here for extra security
    // const user = findUserById(userId); if (!user) return null;

    return { id: userId, username, email: '' }; // Adjust based on your User type
}


export async function requireUser(request: Request, redirectTo: string = new URL(request.url).pathname) {
  const user = await getUserFromSession(request);

  if (!user) {
    const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
    throw redirect(`/login?${searchParams}`);
  }

  return user;
}


export async function logout(request: Request) {
  const session = await getSession(request.headers.get("Cookie"));
  return redirect("/login", {
    headers: {
      "Set-Cookie": await destroySession(session),
    },
  });
}

export function generateResetToken(): { token: string; hashedToken: string } {
    const token = crypto.randomBytes(32).toString('hex');
    // Store the hash, send the plain token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    return { token, hashedToken };
}

export function hashResetToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}
