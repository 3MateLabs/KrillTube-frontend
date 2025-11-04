/**
 * API Route: /v1/session/refresh
 * Refresh playback session expiration
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureDbConnected } from '@/lib/db';
import { cookies } from 'next/headers';

/**
 * POST /api/v1/session/refresh
 * Extend the current session expiration time
 *
 * Call this periodically during video playback to keep session alive.
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('sessionToken')?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'No active session' }, { status: 401 });
    }

    // Find session
    const session = await prisma.playbackSession.findUnique({
      where: { cookieValue: sessionToken },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check if already expired
    if (session.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    // Extend expiration by 30 minutes from now
    const newExpiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // Update session
    const updatedSession = await prisma.playbackSession.update({
      where: { id: session.id },
      data: {
        expiresAt: newExpiresAt,
        lastActivity: new Date(),
      },
    });

    console.log(`[Session Refresh] ✓ Extended session ${session.id} until ${newExpiresAt.toISOString()}`);

    // Update cookie expiration
    cookieStore.set('sessionToken', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 60, // 30 minutes
      path: '/',
    });

    return NextResponse.json({
      sessionId: updatedSession.id,
      expiresAt: newExpiresAt.toISOString(),
      message: 'Session refreshed successfully',
    });
  } catch (error) {
    console.error('[Session Refresh] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to refresh session',
      },
      { status: 500 }
    );
  }
}
