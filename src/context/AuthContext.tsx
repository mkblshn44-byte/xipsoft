"use client";

import {
  createContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { getMeAction, logoutAction } from "@/app/_actions/auth/session";

// writeCache'i login action'dan da çağırabilmek için export et
export { writeCache };

// ── Cache sabitleri ─────────────────────────────────────────────────────────
const CACHE_KEY    = "xipsoft_user_cache";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 dakika

// ── Tip tanımları ───────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  email: string;
  display_name: string;
  photo_url: string | null;
  role: string;
  rank_id?: number | null;
  reputation?: number;
  message_count?: number;
  bio?: string | null;
  website?: string | null;
  location?: string | null;
  job?: string | null;
  branch?: string | null;
  signature?: string | null;
  is_banned?: boolean;
  last_active?: string | null;
  created_at?: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  isAdmin: boolean;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

// ── localStorage cache yardımcıları ─────────────────────────────────────────
interface CacheEntry { user: AuthUser; ts: number }

function readCache(): AuthUser | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.ts > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return entry.user;
  } catch {
    return null;
  }
}

function writeCache(user: AuthUser): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ user, ts: Date.now() } satisfies CacheEntry));
  } catch { /* localStorage kota aşımı — sessizce geç */ }
}

function clearCache(): void {
  try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
}
// ────────────────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user,          setUser]          = useState<AuthUser | null>(null);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    const hasSessionHint = document.cookie.includes("xipsoft_logged_in=1");

    if (!hasSessionHint) {
      clearCache();
      setUser(null);
      setLoading(false);
      return;
    }

    const cached = readCache();
    if (cached) {
      setUser(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    getMeAction()
      .then((nextUser) => {
        if (cancelled) return;
        if (nextUser) {
          const normalizedUser = nextUser as AuthUser;
          writeCache(normalizedUser);
          setUser(normalizedUser);
        } else {
          clearCache();
          setUser(null);
        }
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  const handleRefresh = useCallback(async () => {
    // Cache hâlâ geçerliyse onu kullan
    const cached = readCache();
    if (cached) {
      setUser(cached);
      return;
    }
    // Cookie ipucu yoksa temizle
    const hasSessionHint = document.cookie.includes("xipsoft_logged_in=1");
    if (!hasSessionHint) {
      clearCache();
      setUser(null);
      return;
    }
    // Server'dan taze veri çek
    try {
      const fresh = await getMeAction();
      if (fresh) {
        writeCache(fresh as AuthUser);
        setUser(fresh as AuthUser);
      } else {
        clearCache();
        setUser(null);
      }
    } catch {
      // sessiz hata — mevcut state'i koru
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await logoutAction();
    } catch (err) {
      console.error("Logout error:", err);
    }
    clearCache();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signOut:          handleSignOut,
        refresh:          handleRefresh,
        isAdmin:          user?.role === "admin",
        isAuthenticated:  !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
