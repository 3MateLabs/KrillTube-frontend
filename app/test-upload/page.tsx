'use client';

/**
 * Test Upload Page
 * Minimal upload page for testing video upload functionality
 */

import { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { useNetwork } from '@/contexts/NetworkContext';

export default function TestUploadPage() {
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const { walrusNetwork } = useNetwork();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState({ stage: '', percent: 0, message: '' });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
      setError(null);
      setSuccess(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !account || !title) return;

    setIsUploading(true);
    setError(null);
    setSuccess(false);
    setProgress({ stage: 'starting', percent: 0, message: 'Starting upload...' });

    try {
      console.log('[Test Upload] Starting upload...');

      // Import upload orchestrator
      const { uploadVideoClientSide } = await import('@/lib/upload/clientUploadOrchestrator');

      setProgress({ stage: 'transcoding', percent: 10, message: 'Processing video...' });

      // Upload video (simplified - using user wallet for both testnet and mainnet)
      const result = await uploadVideoClientSide(
        selectedFile,
        ['720p'], // Single quality for testing
        signAndExecuteTransaction,
        account.address,
        {
          network: walrusNetwork,
          epochs: walrusNetwork === 'testnet' ? 1 : 1, // 1 day for testing
          onProgress: (p) => {
            setProgress({
              stage: p.stage,
              percent: p.percent,
              message: p.message,
            });
          },
        }
      );

      console.log('[Test Upload] Upload complete, registering...');
      setProgress({ stage: 'registering', percent: 95, message: 'Registering video...' });

      // Register video with server
      const registerResponse = await fetch('/api/v1/register-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: result.videoId,
          title,
          creatorId: account.address,
          walrusMasterUri: result.walrusMasterUri,
          posterWalrusUri: result.posterWalrusUri,
          duration: result.duration,
          renditions: result.renditions.map((r) => ({
            name: r.quality,
            resolution: r.resolution,
            bitrate: r.bitrate,
            walrusPlaylistUri: r.walrusPlaylistUri,
            segments: r.segments,
          })),
          paymentInfo: result.paymentInfo,
        }),
      });

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json();
        throw new Error(errorData.error || 'Registration failed');
      }

      const { video } = await registerResponse.json();

      setProgress({ stage: 'complete', percent: 100, message: 'Upload complete!' });
      setSuccess(true);
      setVideoId(video.id);
      console.log('[Test Upload] Success! Video ID:', video.id);
    } catch (err) {
      console.error('[Test Upload] Error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-2">Test Upload</h1>
        <p className="text-text-muted mb-8">
          Simple upload test - Network: <span className="text-walrus-mint font-semibold">{walrusNetwork}</span>
        </p>

        {/* Wallet Status */}
        {!account ? (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mb-6">
            <p className="text-yellow-300">Please connect your wallet to upload</p>
          </div>
        ) : (
          <div className="p-4 bg-walrus-mint/10 border border-walrus-mint/30 rounded-lg mb-6">
            <p className="text-sm text-text-muted">Connected: {account.address.slice(0, 8)}...{account.address.slice(-6)}</p>
          </div>
        )}

        {/* File Upload */}
        <div className="space-y-6">
          <div>
            <label htmlFor="video-file" className="block text-sm font-medium text-foreground mb-2">
              Video File
            </label>
            <input
              id="video-file"
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              disabled={isUploading || !account}
              className="block w-full text-sm text-text-muted/80
                file:mr-4 file:py-3 file:px-6
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-walrus-mint file:text-walrus-black
                hover:file:bg-mint-800
                file:transition-colors file:cursor-pointer
                disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {selectedFile && (
              <div className="mt-3 p-4 bg-background-elevated border border-border rounded-lg">
                <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                <p className="text-xs text-text-muted mt-1">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-foreground mb-2">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isUploading || !account}
              placeholder="Video title"
              className="w-full px-4 py-3 bg-background-elevated border border-border rounded-lg
                text-foreground placeholder-text-muted/50
                focus:outline-none focus:ring-2 focus:ring-walrus-mint
                disabled:opacity-50"
            />
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!selectedFile || !account || !title || isUploading}
            className="w-full bg-walrus-mint text-walrus-black py-4 px-6 rounded-lg font-semibold
              hover:bg-mint-800 disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors"
          >
            {isUploading ? 'Uploading...' : 'Upload Video'}
          </button>

          {/* Progress */}
          {isUploading && (
            <div className="p-5 bg-background-elevated border-2 border-walrus-mint/20 rounded-lg">
              <div className="flex justify-between mb-3">
                <span className="text-foreground font-medium">{progress.message}</span>
                <span className="text-walrus-mint font-bold">{Math.round(progress.percent)}%</span>
              </div>
              <div className="w-full bg-background-hover rounded-full h-2.5">
                <div
                  className="bg-walrus-mint h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <div className="mt-3 text-xs text-text-muted">
                Stage: {progress.stage}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 border-2 border-red-500/30 bg-red-500/10 rounded-lg">
              <p className="text-sm text-red-300 font-medium mb-2">Upload Failed</p>
              <p className="text-sm text-red-300/80">{error}</p>
            </div>
          )}

          {/* Success */}
          {success && videoId && (
            <div className="p-6 bg-walrus-mint/10 border-2 border-walrus-mint/30 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <svg className="w-6 h-6 text-walrus-mint" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-lg font-semibold text-foreground">Upload Successful!</span>
              </div>
              <p className="text-sm text-text-muted mb-4">
                Video ID: <span className="text-walrus-mint font-mono">{videoId}</span>
              </p>
              <a
                href={`/watch/${videoId}`}
                className="inline-block bg-walrus-mint text-walrus-black py-2 px-6 rounded-lg font-semibold
                  hover:bg-mint-800 transition-colors"
              >
                Watch Video
              </a>
            </div>
          )}

          {/* Debug Info */}
          <div className="p-4 bg-background-elevated border border-border rounded-lg">
            <h3 className="text-sm font-semibold text-foreground mb-2">Test Configuration</h3>
            <div className="text-xs text-text-muted space-y-1">
              <p>Network: {walrusNetwork}</p>
              <p>Quality: 720p only</p>
              <p>Storage: 1 day</p>
              <p>Upload mode: {walrusNetwork === 'testnet' ? 'Free HTTP' : 'Wallet signatures'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
