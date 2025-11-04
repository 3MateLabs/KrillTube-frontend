/**
 * API Route: /v1/session
 * Create and manage encrypted video playback sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureDbConnected } from '@/lib/db';
import { generateX25519Keypair, generateNonce } from '@/lib/crypto/primitives';
import { toBase64, fromBase64 } from '@/lib/crypto/utils';
import { cookies } from 'next/headers';
import { storeSessionPrivateKey, deleteSessionPrivateKey } from '@/lib/kms/envelope';

/**
 * POST /api/v1/session
 * Create a new playback session for encrypted video
 *
 * Flow:
 * 1. Client generates X25519 keypair, sends public key
 * 2. Server generates X25519 keypair + nonce
 * 3. Server stores session with private key (for later key wrapping)
 * 4. Server returns public key + nonce + sets HttpOnly cookie
 * 5. Client derives shared KEK = ECDH(clientPriv, serverPub) + HKDF(nonce)
 * 6. Server can later derive same KEK to wrap segment DEKs
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      videoId,
      clientPubKey, // base64-encoded 32-byte X25519 public key
      deviceFingerprint,
    }: {
      videoId: string;
      clientPubKey: string;
      deviceFingerprint?: string;
    } = body;

    if (!videoId || !clientPubKey) {
      return NextResponse.json(
        { error: 'Missing required fields: videoId, clientPubKey' },
        { status: 400 }
      );
    }

    console.log(`[Session API] Creating session for video: ${videoId}`);

    // Ensure database is connected (handles Neon cold starts)
    await ensureDbConnected();

    // Validate video exists
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true, title: true },
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Decode client public key
    let clientPubKeyBytes: Uint8Array;
    try {
      clientPubKeyBytes = fromBase64(clientPubKey);
      if (clientPubKeyBytes.length !== 32) {
        throw new Error('Client public key must be 32 bytes');
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid clientPubKey: must be base64-encoded 32 bytes' },
        { status: 400 }
      );
    }

    // Generate server-side ephemeral X25519 keypair
    const serverKeypair = await generateX25519Keypair();
    console.log(`[Session API] Generated server keypair`);

    // Generate server nonce (12 bytes for HKDF salt)
    const serverNonce = generateNonce();
    console.log(`[Session API] Generated server nonce`);

    // Generate opaque session token for cookie
    const sessionToken = crypto.randomUUID();

    // Calculate session expiration (24 hours for better UX)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create session in database (without private key)
    const session = await prisma.playbackSession.create({
      data: {
        cookieValue: sessionToken,
        videoId,
        clientPubKey: Buffer.from(clientPubKeyBytes),
        serverPubKey: Buffer.from(serverKeypair.publicKey),
        serverNonce: Buffer.from(serverNonce),
        deviceHash: deviceFingerprint || null,
        expiresAt,
      },
    });

    // Store ephemeral private key in memory (24 hours TTL)
    storeSessionPrivateKey(session.id, serverKeypair.privateKeyJwk, 24 * 60 * 60);

    console.log(`[Session API] ✓ Created session: ${session.id}`);
    console.log(`[Session API]   Video: ${video.title}`);
    console.log(`[Session API]   Private key stored in memory (24 hour TTL)`);
    console.log(`[Session API]   Expires: ${expiresAt.toISOString()}`);

    // Set HttpOnly cookie with session token
    const cookieStore = await cookies();
    cookieStore.set('sessionToken', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });

    // Return session details (without private key!)
    return NextResponse.json({
      sessionId: session.id,
      videoId,
      videoTitle: video.title,
      serverPubKey: toBase64(serverKeypair.publicKey),
      serverNonce: toBase64(serverNonce),
      expiresAt: expiresAt.toISOString(),
      message: 'Session created successfully. Cookie set.',
    });
  } catch (error) {
    console.error('[Session API] Error creating session:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create session',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/session
 * Terminate current playback session
 */
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('sessionToken')?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'No active session' }, { status: 401 });
    }

    // Get session ID before deleting
    const session = await prisma.playbackSession.findUnique({
      where: { cookieValue: sessionToken },
      select: { id: true },
    });

    // Delete session from database
    await prisma.playbackSession.delete({
      where: { cookieValue: sessionToken },
    });

    // Delete ephemeral private key from memory
    if (session) {
      deleteSessionPrivateKey(session.id);
    }

    // Clear cookie
    cookieStore.delete('sessionToken');

    console.log(`[Session API] ✓ Session terminated`);

    return NextResponse.json({
      message: 'Session terminated successfully',
    });
  } catch (error) {
    console.error('[Session API] Error terminating session:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to terminate session',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/session
 * Get current session information
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('sessionToken')?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'No active session' }, { status: 401 });
    }

    // Find session
    const session = await prisma.playbackSession.findUnique({
      where: { cookieValue: sessionToken },
      include: {
        video: {
          select: {
            id: true,
            title: true,
            duration: true,
            posterWalrusUri: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check if expired
    if (session.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    return NextResponse.json({
      sessionId: session.id,
      videoId: session.videoId,
      video: session.video,
      expiresAt: session.expiresAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
      lastActivity: session.lastActivity.toISOString(),
    });
  } catch (error) {
    console.error('[Session API] Error getting session:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get session',
      },
      { status: 500 }
    );
  }
}
