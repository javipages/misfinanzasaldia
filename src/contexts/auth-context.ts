import { createContext } from "react";
import type { Session, AuthError } from "@supabase/supabase-js";

export type AuthContextType = {
  session: Session | null;
  loading: boolean;
  // Magic link flow - commented out
  // sendMagicLink: (email: string) => Promise<{ error: AuthError | null }>;
  // Google OAuth flow
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signInWithApple: () => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
};

export const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  // sendMagicLink: async () => ({ error: null }),
  signInWithGoogle: async () => ({ error: null }),
  signInWithApple: async () => ({ error: null }),
  signOut: async () => ({ error: null }),
});
