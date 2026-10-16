/**
 * API Request guard - Authentication & Authorization
 * Tum API routes'ta kullan
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual as cryptoTimingSafeEqual } from 'node:crypto';
import { jwtVerify } from 'jose';
import { getJwtSecret } from '@/lib/auth-config';

// getJwtSecret → @/lib/auth-config'den geliyor (tek kaynak)

/**
 * Timing-safe string karsılastırması — timing attack'a karsı koruma
 * crypto.timingSafeEqual kullanır, her iki string'i aynı uzunluga pad'ler
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const digestA = createHash('sha256').update(a, 'utf8').digest();
  const digestB = createHash('sha256').update(b, 'utf8').digest();
  const matches = cryptoTimingSafeEqual(digestA, digestB);
  return matches && Buffer.byteLength(a, 'utf8') === Buffer.byteLength(b, 'utf8');
}


// JWT_SECRET → @/lib/auth-config'den geliyor (tek kaynak)

export interface AuthContext {
  userId: string | null;
  userRole: 'admin' | 'moderator' | 'user' | 'guest';
  userEmail: string | null;
  isAuthenticated: boolean;
}

function contextFromPayload(user: Record<string, unknown>): AuthContext {
  const role = (user.role as AuthContext['userRole']) || 'user';
  if (role === 'admin' && user.two_factor_verified !== true) {
    return { userId: null, userRole: 'guest', userEmail: null, isAuthenticated: false };
  }
  return {
    userId: String(user.id ?? user.userId ?? user.sub ?? ''),
    userRole: role,
    userEmail: String(user.email ?? ''),
    isAuthenticated: true,
  };
}

/**
 * Request'ten auth context'i çıkar
 */
export async function extractAuthContext(request: NextRequest): Promise<AuthContext> {
  const sessionCookie = request.cookies.get('xipsoft_session')?.value;

  if (!sessionCookie) {
    return {
      userId: null,
      userRole: 'guest',
      userEmail: null,
      isAuthenticated: false,
    };
  }

  try {
    const { payload: user } = await jwtVerify(sessionCookie, getJwtSecret());
    return contextFromPayload(user);
  } catch (error) {
    return {
      userId: null,
      userRole: 'guest',
      userEmail: null,
      isAuthenticated: false,
    };
  }
}

/**
 * Server Action'lar için auth context'i çıkar
 */
export async function getServerActionContext(): Promise<AuthContext> {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  
  const sessionToken = cookieStore.get('xipsoft_session')?.value;

  if (!sessionToken) {
    return {
      userId: null,
      userRole: 'guest',
      userEmail: null,
      isAuthenticated: false,
    };
  }

  try {
    const { payload: user } = await jwtVerify(sessionToken, getJwtSecret());
    return contextFromPayload(user);
  } catch (error) {
    return {
      userId: null,
      userRole: 'guest',
      userEmail: null,
      isAuthenticated: false,
    };
  }
}

/**
 * Authentication zorunlu yap (login gerekli)
 */
export function requireAuth(context: AuthContext): { ok: true } | NextResponse {
  if (!context.isAuthenticated) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message: 'Kimlik dogrulama gerekli',
        code: 'UNAUTHENTICATED',
      },
      { status: 401 }
    );
  }
  return { ok: true };
}

/**
 * Admin role zorunlu yap
 */
export function requireAdmin(context: AuthContext): { ok: true } | NextResponse {
  if (!context.isAuthenticated || context.userRole !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Admin erisimi gerekli', code: 'INSUFFICIENT_PERMISSIONS' },
      { status: 403 }
    );
  }

  return { ok: true };
}

/**
 * Server Action'lar için admin yetkisi zorunlu kıl — tek merkezi kontrol noktası.
 * Tüm admin server action'ları bu fonksiyonu kullanır.
 */
export async function requireAdminAction(): Promise<AuthContext> {
  const ctx = await getServerActionContext();
  if (!ctx.isAuthenticated || ctx.userRole !== 'admin') {
    throw new Error('Admin yetkisi gerekiyor');
  }
  return ctx;
}

/**
 * Safe error response (info leak'i önle)
 */
export function safeErrorResponse(error: unknown, context: AuthContext) {
  console.error('[API Error]', error);

  // Admin'lere detaylı hata göster
  if (context.userRole === 'admin') {
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Bilinmeyen hata',
        ...(process.env.NODE_ENV === 'development' && {
          stack: error instanceof Error ? error.stack : undefined,
        }),
      },
      { status: 500 }
    );
  }

  // Diger kullanıcılara generic hata
  return NextResponse.json(
    {
      error: 'Internal Server Error',
      message: 'Bir hata meydana geldi. Lutfen daha sonra tekrar deneyin.',
    },
    { status: 500 }
  );
}
