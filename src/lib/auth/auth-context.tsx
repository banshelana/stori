"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AUTH_STORAGE_KEY } from "@/lib/api/client";
import { hasPermission as checkPermission } from "@/lib/auth/permissions";
import type {
  LoginInput,
  Permission,
  RegisterInput,
  Session,
  User,
} from "@/lib/auth/types";
import { mockLogin, mockRegister, mockUpdateProfile } from "@/lib/data/users";

interface AuthContextValue {
  user: User | null;
  /** False until localStorage has been read, so guards don't redirect early. */
  ready: boolean;
  pending: boolean;
  signIn: (input: LoginInput) => Promise<User>;
  signUp: (input: RegisterInput) => Promise<User>;
  signOut: () => void;
  updateProfile: (patch: Partial<User>) => Promise<User>;
  can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    return parsed?.user?.id ? parsed : null;
  } catch {
    return null;
  }
}

function writeSession(session: Session | null) {
  try {
    if (session) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch {
    /* ignore — private mode or storage disabled */
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);

  // Restore the persisted session before anything renders a guard.
  useEffect(() => {
    setUser(readSession()?.user ?? null);
    setReady(true);
  }, []);

  // Keep tabs in sync, and react to the 401 handler clearing the session.
  useEffect(() => {
    function resync() {
      setUser(readSession()?.user ?? null);
    }
    function onStorage(e: StorageEvent) {
      if (e.key === AUTH_STORAGE_KEY) resync();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("auth:unauthorized", resync);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("auth:unauthorized", resync);
    };
  }, []);

  const persist = useCallback((next: User) => {
    const session: Session = {
      user: next,
      // Stand-in for the JWT the real backend will issue.
      token: `mock.${next.id}.${Date.now().toString(36)}`,
      issuedAt: new Date().toISOString(),
    };
    writeSession(session);
    setUser(next);
    return next;
  }, []);

  const signIn = useCallback(
    async (input: LoginInput) => {
      setPending(true);
      try {
        return persist(await mockLogin(input));
      } finally {
        setPending(false);
      }
    },
    [persist]
  );

  const signUp = useCallback(
    async (input: RegisterInput) => {
      setPending(true);
      try {
        return persist(await mockRegister(input));
      } finally {
        setPending(false);
      }
    },
    [persist]
  );

  const signOut = useCallback(() => {
    writeSession(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(
    async (patch: Partial<User>) => {
      if (!user) throw new Error("NOT_AUTHENTICATED");
      setPending(true);
      try {
        return persist(await mockUpdateProfile(user.id, patch));
      } finally {
        setPending(false);
      }
    },
    [user, persist]
  );

  const can = useCallback(
    (permission: Permission) => checkPermission(user?.subRole, permission),
    [user]
  );

  const value = useMemo(
    () => ({ user, ready, pending, signIn, signUp, signOut, updateProfile, can }),
    [user, ready, pending, signIn, signUp, signOut, updateProfile, can]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
