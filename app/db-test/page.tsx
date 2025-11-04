'use client';

/**
 * Database Test Page
 * Just test database write - no Walrus upload
 */

import { useState } from 'react';

export default function DbTestPage() {
  const [title, setTitle] = useState('Test Video');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      console.log('[DB Test] Submitting to database...');

      // Call register API with mock data
      const response = await fetch('/api/v1/register-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: `test-${Date.now()}`,
          title: title,
          creatorId: '0x1234567890abcdef',
          walrusMasterUri: 'https://aggregator.walrus-testnet.walrus.space/v1/blobs/test123',
          posterWalrusUri: 'https://aggregator.walrus-testnet.walrus.space/v1/blobs/poster123',
          duration: 60.5,
          renditions: [
            {
              name: '720p',
              resolution: '1280x720',
              bitrate: 2800000,
              walrusPlaylistUri: 'https://aggregator.walrus-testnet.walrus.space/v1/blobs/playlist123',
              segments: [
                {
                  segIdx: -1,
                  walrusUri: 'https://aggregator.walrus-testnet.walrus.space/v1/blobs/init123',
                  dek: 'AAAAAAAAAAAAAAAAAAAAAA==', // 16 bytes base64
                  iv: 'AAAAAAAAAAAAAAAA', // 12 bytes base64
                  duration: 0,
                  size: 1024,
                },
                {
                  segIdx: 0,
                  walrusUri: 'https://aggregator.walrus-testnet.walrus.space/v1/blobs/seg0',
                  dek: 'BBBBBBBBBBBBBBBBBBBBBB==', // 16 bytes base64
                  iv: 'BBBBBBBBBBBBBBBB', // 12 bytes base64
                  duration: 4.0,
                  size: 2048,
                },
              ],
            },
          ],
          paymentInfo: {
            paidWal: '0.001',
            paidMist: '1000000',
            walletAddress: '0xtest',
            transactionIds: {
              segments: 'tx1',
              playlists: 'tx2',
              master: 'tx3',
            },
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }

      const { video } = await response.json();
      console.log('[DB Test] Success:', video);

      setSuccess(true);
      setVideoId(video.id);
    } catch (err) {
      console.error('[DB Test] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to register video');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-2">Database Test</h1>
        <p className="text-text-muted mb-8">
          Test if video can be saved to database (no Walrus upload)
        </p>

        <div className="space-y-6">
          {/* Title Input */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-foreground mb-2">
              Video Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-4 py-3 bg-background-elevated border border-border rounded-lg
                text-foreground placeholder-text-muted/50
                focus:outline-none focus:ring-2 focus:ring-walrus-mint
                disabled:opacity-50"
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!title || isSubmitting}
            className="w-full bg-walrus-mint text-walrus-black py-4 px-6 rounded-lg font-semibold
              hover:bg-mint-800 disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors"
          >
            {isSubmitting ? 'Saving to Database...' : 'Test Database Write'}
          </button>

          {/* Error */}
          {error && (
            <div className="p-4 border-2 border-red-500/30 bg-red-500/10 rounded-lg">
              <p className="text-sm text-red-300 font-medium mb-2">Database Write Failed</p>
              <p className="text-sm text-red-300/80 font-mono">{error}</p>
            </div>
          )}

          {/* Success */}
          {success && videoId && (
            <div className="p-6 bg-walrus-mint/10 border-2 border-walrus-mint/30 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <svg className="w-6 h-6 text-walrus-mint" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-lg font-semibold text-foreground">Database Write Successful!</span>
              </div>
              <p className="text-sm text-text-muted">
                Video ID: <span className="text-walrus-mint font-mono">{videoId}</span>
              </p>
              <p className="text-xs text-text-muted mt-2">
                ✅ No root_secret_enc error!
              </p>
            </div>
          )}

          {/* Info */}
          <div className="p-4 bg-background-elevated border border-border rounded-lg">
            <h3 className="text-sm font-semibold text-foreground mb-2">Test Details</h3>
            <div className="text-xs text-text-muted space-y-1">
              <p>• Creates a video record with mock Walrus URIs</p>
              <p>• Tests database schema (should NOT require root_secret_enc)</p>
              <p>• 1 rendition (720p) with 2 segments (init + segment 0)</p>
              <p>• All DEKs are encrypted with KMS before storage</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
