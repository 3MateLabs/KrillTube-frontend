
'use client';

/**
 * Upload Page V2: Client-Side Encryption
 * Transcode → Encrypt → Upload all in browser
 * Server only stores metadata + encrypted root secret
 */

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { useNetwork } from '@/contexts/NetworkContext';
import { UploadNetworkSwitcher } from '@/components/UploadNetworkSwitcher';
import type { UploadProgress } from '@/lib/upload/clientUploadOrchestrator';

type RenditionQuality = '1080p' | '720p' | '480p' | '360p';

function UploadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const { walrusNetwork } = useNetwork();

  // Debug: Log current network
  useEffect(() => {
    console.log('[Upload Page] Current Walrus Network:', walrusNetwork);
  }, [walrusNetwork]);

  // Debug mode: bypass wallet connection
  const [debugMode, setDebugMode] = useState(false);
  useEffect(() => {
    const isDebug = searchParams.get('no-wallet-debug') === 'true';
    setDebugMode(isDebug);
    if (isDebug) {
      console.log('[Upload] Debug mode enabled - wallet connection bypassed');
    }
  }, [searchParams]);

  // Use real account or debug placeholder
  const effectiveAccount = debugMode
    ? { address: '0x0000000000000000000000000000000000000000000000000000000000000000' }
    : account;

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [selectedQualities, setSelectedQualities] = useState<RenditionQuality[]>([
    '1080p',
  ]);

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({
    stage: 'transcoding',
    percent: 0,
    message: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [costEstimate, setCostEstimate] = useState<{
    totalWal: string;
    totalUsd: string;
    storageMB: string;
    breakdown: {
      storage: { wal: string; usd: string };
      write: { wal: string; usd: string };
    };
  } | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
      setError(null);
    }
  };

  const handleQualityToggle = (quality: RenditionQuality) => {
    setSelectedQualities((prev) =>
      prev.includes(quality) ? prev.filter((q) => q !== quality) : [...prev, quality].sort()
    );
  };

  // Auto-calculate cost whenever file or qualities change
  useEffect(() => {
    if (selectedFile && selectedQualities.length > 0) {
      handleEstimateCost();
    }
  }, [selectedFile, selectedQualities]);

  const handleEstimateCost = async () => {
    if (!selectedFile || selectedQualities.length === 0) return;

    setIsEstimating(true);
    setError(null);

    try {
      const fileSizeMB = selectedFile.size / 1024 / 1024;

      const response = await fetch('/api/v1/estimate-cost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileSizeMB,
          qualities: selectedQualities,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to estimate cost');
      }

      const { estimate } = await response.json();
      setCostEstimate(estimate);
    } catch (err) {
      console.error('[Estimate Cost] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to estimate cost');
    } finally {
      setIsEstimating(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !effectiveAccount || !title) return;

    setIsUploading(true);
    setError(null);

    try {
      console.log('[Upload V2] Starting client-side upload...');
      if (debugMode) {
        console.log('[Upload V2] Running in DEBUG mode with placeholder wallet');
      }

      // Dynamically import the upload orchestrator to avoid loading WASM during build
      const { uploadVideoClientSide } = await import('@/lib/upload/clientUploadOrchestrator');

      // Mock signAndExecuteTransaction for debug mode
      const effectiveSignAndExecute = debugMode
        ? async () => ({ digest: 'debug-transaction-digest' })
        : signAndExecuteTransaction;

      // Complete client-side flow: transcode → encrypt → upload
      const result = await uploadVideoClientSide(
        selectedFile,
        selectedQualities,
        effectiveSignAndExecute,
        effectiveAccount.address,
        {
          network: walrusNetwork, // Dynamic Walrus network from context
          // Mainnet has strict epoch limits (typically 1-5), testnet can use more
          epochs: walrusNetwork === 'mainnet' ? 1 : parseInt(process.env.NEXT_PUBLIC_WALRUS_EPOCHS || '5'),
          onProgress: setProgress,
        }
      );

      console.log('[Upload V2] ✓ Client-side processing complete');
      console.log('[Upload V2] Registering with server...');

      // Register video with server (server stores encrypted root secret)
      const registerResponse = await fetch('/api/v1/register-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: result.videoId,
          title,
          creatorId: effectiveAccount.address,
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
      console.log(`[Upload V2] ✓ Video registered: ${video.id}`);

      setTimeout(() => {
        router.push(`/watch/${video.id}`);
      }, 1000);
    } catch (err) {
      console.error('[Upload V2] Error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Upload Video
          </h1>
          <p className="text-text-muted mb-6">
            Pay for decentralized storage with WAL tokens
          </p>

          {/* Network Switcher */}
          <div className="mb-8 p-5 bg-background-elevated border-2 border-border rounded-xl">
            <UploadNetworkSwitcher />
          </div>

          <div className="space-y-6">
            {/* File Upload */}
            <div>
              <label htmlFor="video-file" className="block text-sm font-medium text-foreground mb-2">
                Video File
              </label>
              <input
                id="video-file"
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                disabled={isUploading}
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
                disabled={isUploading}
                placeholder="My awesome video"
                className="w-full px-4 py-3 bg-background-elevated border border-border rounded-lg
                  text-foreground placeholder-text-muted/50
                  focus:outline-none focus:ring-2 focus:ring-walrus-mint"
              />
            </div>

            {/* Quality Selection */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Quality</label>
              <div className="grid grid-cols-4 gap-3">
                {(['1080p', '720p', '480p', '360p'] as RenditionQuality[]).map((quality) => (
                  <label
                    key={quality}
                    className={`
                      flex items-center justify-center py-3.5 px-4 rounded-lg border-2 cursor-pointer
                      transition-all
                      ${
                        selectedQualities.includes(quality)
                          ? 'bg-walrus-mint text-walrus-black border-walrus-mint'
                          : 'bg-background-elevated text-foreground border-border hover:border-walrus-mint/50'
                      }
                      ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={selectedQualities.includes(quality)}
                      onChange={() => handleQualityToggle(quality)}
                      disabled={isUploading}
                      className="sr-only"
                    />
                    {quality}
                  </label>
                ))}
              </div>
            </div>

            {/* Loading indicator while calculating */}
            {isEstimating && (
              <div className="p-5 bg-background-elevated border-2 border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-walrus-mint"></div>
                  <span className="text-text-muted">Calculating storage cost...</span>
                </div>
              </div>
            )}

            {/* Cost Estimate - Auto-calculated */}
            {costEstimate && !isUploading && (
              <div className="p-5 bg-background-elevated border-2 border-walrus-mint/30 rounded-lg">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Estimated Storage Cost
                </h3>

                <div className="space-y-3">
                  {/* Total Cost */}
                  <div className="flex items-baseline justify-between">
                    <span className="text-text-muted">Total Cost:</span>
                    <div className="flex items-baseline gap-3">
                      <span className="text-foreground font-mono font-bold text-lg">
                        {costEstimate.totalWal} WAL
                      </span>
                      <span className="text-walrus-mint font-medium">
                        (~${costEstimate.totalUsd} USD)
                      </span>
                    </div>
                  </div>

                  {/* Storage Size */}
                  <div className="flex items-baseline justify-between">
                    <span className="text-text-muted">Estimated Storage:</span>
                    <span className="text-foreground font-mono">
                      {costEstimate.storageMB} MB
                    </span>
                  </div>

                  {/* Breakdown */}
                  <div className="pt-3 border-t border-border space-y-2">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-text-muted">Storage Cost:</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-foreground font-mono">
                          {costEstimate.breakdown.storage.wal} WAL
                        </span>
                        <span className="text-text-muted">
                          (~${costEstimate.breakdown.storage.usd})
                        </span>
                      </div>
                    </div>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-text-muted">Write Cost:</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-foreground font-mono">
                          {costEstimate.breakdown.write.wal} WAL
                        </span>
                        <span className="text-text-muted">
                          (~${costEstimate.breakdown.write.usd})
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-text-muted mt-3">
                    This is an estimate. Actual cost may vary slightly based on final file size.
                  </p>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-4 border-2 border-red-500/30 bg-red-500/10 rounded-lg">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

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

            {/* Upload Button */}
            {costEstimate && !isUploading && (
              <button
                onClick={handleUpload}
                disabled={
                  !selectedFile || !effectiveAccount || !title || isUploading || selectedQualities.length === 0
                }
                className="w-full bg-walrus-mint text-walrus-black py-4 px-6 rounded-lg font-semibold
                  hover:bg-mint-800 disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors"
              >
                {!effectiveAccount
                  ? 'Connect Wallet to Upload'
                  : isUploading
                  ? 'Processing...'
                  : debugMode
                  ? '[DEBUG MODE] Start Upload'
                  : 'Approve & Start Upload'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UploadPageV2() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading...</div>
      </div>
    }>
      <UploadContent />
    </Suspense>
  );
}
