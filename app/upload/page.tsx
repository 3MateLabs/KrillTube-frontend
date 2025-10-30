'use client';

/**
 * Upload page with Walrus SDK integration
 * Users pay for storage with WAL tokens via wallet signature
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import type { RenditionQuality } from '@/lib/types';

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

export default function UploadPageSDK() {
  const router = useRouter();
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  // SDK functions loaded dynamically to avoid SSR WASM issues
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [walrusSdk, setWalrusSdk] = useState<any>(null);

  useEffect(() => {
    // Load Walrus SDK only on client-side
    import('@/lib/client-walrus-sdk').then((mod) => {
      setWalrusSdk(mod);
      setSdkLoaded(true);
    });
  }, []);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [selectedQualities, setSelectedQualities] = useState<RenditionQuality[]>([
    '720p',
    '480p',
    '360p',
  ]);

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState({ stage: '', percent: 0, message: '' });
  const [error, setError] = useState<string | null>(null);
  const [costEstimate, setCostEstimate] = useState<{
    totalWal: string;
    sizeFormatted: string;
    epochs: number;
  } | null>(null);
  const [showCostApproval, setShowCostApproval] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
      setError(null);
      setCostEstimate(null);
    }
  };

  const handleQualityToggle = (quality: RenditionQuality) => {
    setSelectedQualities((prev) =>
      prev.includes(quality)
        ? prev.filter((q) => q !== quality)
        : [...prev, quality].sort()
    );
  };

  const handleUpload = async () => {
    if (!selectedFile || !account || !title || !sdkLoaded || !walrusSdk) return;

    setIsUploading(true);
    setError(null);

    try {
      // Step 1: Transcode and encrypt video
      setProgress({ stage: 'transcoding', percent: 10, message: 'Uploading to server...' });

      const formData = new FormData();
      formData.append('video', selectedFile);
      formData.append('qualities', JSON.stringify(selectedQualities));
      formData.append('segmentDuration', '4');

      const transcodeResponse = await fetch('/api/transcode', {
        method: 'POST',
        body: formData,
      });

      if (!transcodeResponse.ok) {
        const errorData = await transcodeResponse.json();
        throw new Error(errorData.error || 'Transcoding failed');
      }

      const transcodeData = await transcodeResponse.json();
      const { videoId: vid } = transcodeData;
      setVideoId(vid);

      setProgress({
        stage: 'transcoding',
        percent: 30,
        message: 'Video transcoded and encrypted',
      });

      // Step 2: Get cost estimate from blockchain (client-side SDK)
      setProgress({
        stage: 'estimating',
        percent: 40,
        message: 'Fetching exact cost from Walrus blockchain...',
      });

      // Fetch encrypted segments to calculate total size
      const segmentsResponse = await fetch(`/api/v1/encrypted-segments/${vid}`);
      if (!segmentsResponse.ok) {
        throw new Error('Failed to get encrypted segments for cost calculation');
      }

      const segmentsData = await segmentsResponse.json();

      // Calculate total size of all data to upload
      let totalSize = 0;
      for (const segment of segmentsData.segments) {
        totalSize += segment.data.length;
      }
      if (segmentsData.poster) {
        totalSize += segmentsData.poster.data.length;
      }

      console.log(`[Upload] Calculating cost for ${totalSize} bytes...`);

      // Use SDK to get EXACT cost from blockchain
      const network = (process.env.NEXT_PUBLIC_WALRUS_NETWORK as 'mainnet' | 'testnet') || 'mainnet';
      const epochs = parseInt(process.env.NEXT_PUBLIC_WALRUS_EPOCHS || '50');

      const costEstimateResult = await walrusSdk.calculateStorageCost(totalSize, {
        network,
        epochs,
      });

      console.log(`[Upload] Exact cost from blockchain: ${costEstimateResult.totalCostWal} WAL`);

      setCostEstimate({
        totalWal: costEstimateResult.totalCostWal,
        sizeFormatted: formatBytes(totalSize),
        epochs: costEstimateResult.epochs,
      });

      setProgress({
        stage: 'approval',
        percent: 50,
        message: `Upload will cost ${costEstimateResult.totalCostWal} WAL (${formatBytes(totalSize)})`,
      });

      // Show cost approval UI
      setShowCostApproval(true);
      setIsUploading(false);

    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      setIsUploading(false);
    }
  };

  const handleApproveAndPay = async () => {
    if (!account || !costEstimate || !videoId || !title || !sdkLoaded || !walrusSdk) return;

    setIsUploading(true);
    setShowCostApproval(false);
    setError(null);

    try {
      setProgress({ stage: 'uploading', percent: 60, message: 'Getting encrypted segments...' });

      // Step 1: Get encrypted segments from server
      const segmentsResponse = await fetch(`/api/v1/encrypted-segments/${videoId}`);
      if (!segmentsResponse.ok) {
        throw new Error('Failed to get encrypted segments');
      }

      const segmentsData = await segmentsResponse.json();

      setProgress({ stage: 'uploading', percent: 65, message: 'Preparing files for Walrus upload...' });

      // Step 2: Prepare files using writeFilesFlow API (CORRECT WALRUS SDK PATTERN)
      setProgress({ stage: 'uploading', percent: 70, message: 'Encoding files for storage...' });

      const aggregatorUrl = process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL || 'https://aggregator.walrus.space';

      const segmentBlobs = segmentsData.segments.map((seg: any) => ({
        contents: new Uint8Array(seg.data),
        identifier: seg.identifier,
      }));

      // Add poster if exists
      if (segmentsData.poster) {
        segmentBlobs.push({
          contents: new Uint8Array(segmentsData.poster.data),
          identifier: 'poster',
        });
      }

      // Retry segments upload if storage nodes are overloaded
      let segmentQuilt;
      let segmentRetries = 3;
      while (segmentRetries > 0) {
        try {
          // This will trigger wallet popups for signature (register + certify)
          console.log('[Upload] Calling uploadQuiltWithWallet for segments...');
          segmentQuilt = await walrusSdk.uploadQuiltWithWallet(
            segmentBlobs,
            signAndExecuteTransaction,
            account!.address,
            {
              network: (process.env.NEXT_PUBLIC_WALRUS_NETWORK as 'mainnet' | 'testnet') || 'mainnet',
              epochs: costEstimate.epochs,
            }
          );
          console.log('[Upload] ✓ Segments uploaded successfully');
          break; // Success, exit retry loop
        } catch (err) {
          segmentRetries--;
          if (segmentRetries === 0) throw err; // Out of retries, throw error

          console.log(`[Upload] Segment upload error, retrying... (${segmentRetries} attempts left)`);
          setProgress({
            stage: 'uploading',
            percent: 70,
            message: `Storage nodes busy, retrying segments... (${segmentRetries} attempts left)`
          });
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
        }
      }

      const segmentCostWal = (Number(segmentQuilt.cost.totalCost) / 1_000_000_000).toFixed(6);
      console.log(`[Upload] Paid ${segmentCostWal} WAL for segments`);

      setProgress({ stage: 'uploading', percent: 80, message: '2/3: Please sign transaction to upload playlists...' });

      // Step 3: Build and upload playlists - USER WILL SIGN AGAIN
      const segmentPatchIdMap = new Map();
      segmentQuilt.index.patches.forEach((patch: any) => {
        segmentPatchIdMap.set(patch.identifier, patch.patchId);
      });

      const playlistBlobs = segmentsData.renditions.map((rendition: any) => {
        let playlistContent = '#EXTM3U\\n#EXT-X-VERSION:7\\n#EXT-X-TARGETDURATION:4\\n#EXT-X-PLAYLIST-TYPE:VOD\\n';

        const initPatchId = segmentPatchIdMap.get(`${rendition.quality}_init`);
        if (initPatchId) {
          playlistContent += `#EXT-X-MAP:URI="${aggregatorUrl}/v1/blobs/by-quilt-patch-id/${initPatchId}"\\n`;
        }

        for (let i = 0; i < rendition.segmentCount - 1; i++) {
          const segPatchId = segmentPatchIdMap.get(`${rendition.quality}_seg_${i}`);
          playlistContent += `#EXTINF:4.0,\\n${aggregatorUrl}/v1/blobs/by-quilt-patch-id/${segPatchId}\\n`;
        }

        playlistContent += '#EXT-X-ENDLIST\\n';

        return {
          contents: new TextEncoder().encode(playlistContent),
          identifier: `${rendition.quality}_playlist`,
        };
      });

      // Retry upload if storage nodes are overloaded
      let playlistQuilt;
      let retries = 3;
      while (retries > 0) {
        try {
          console.log('[Upload] Calling uploadQuiltWithWallet for playlists...');
          playlistQuilt = await walrusSdk.uploadQuiltWithWallet(
            playlistBlobs,
            signAndExecuteTransaction,
            account!.address,
            {
              network: (process.env.NEXT_PUBLIC_WALRUS_NETWORK as 'mainnet' | 'testnet') || 'mainnet',
              epochs: costEstimate.epochs,
            }
          );
          console.log('[Upload] ✓ Playlists uploaded successfully');
          break; // Success, exit retry loop
        } catch (err) {
          retries--;
          if (retries === 0) throw err; // Out of retries, throw error

          console.log(`[Upload] Storage node error, retrying... (${retries} attempts left)`);
          setProgress({
            stage: 'uploading',
            percent: 80,
            message: `Storage nodes busy, retrying... (${retries} attempts left)`
          });
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
        }
      }

      setProgress({ stage: 'uploading', percent: 90, message: '3/3: Please sign transaction to upload master playlist...' });

      // Step 4: Upload master playlist - USER WILL SIGN THIRD TIME
      const playlistPatchIdMap = new Map();
      playlistQuilt.index.patches.forEach((patch: any) => {
        playlistPatchIdMap.set(patch.identifier, patch.patchId);
      });

      let masterContent = '#EXTM3U\\n#EXT-X-VERSION:7\\n\\n';
      segmentsData.renditions.forEach((rendition: any) => {
        const playlistPatchId = playlistPatchIdMap.get(`${rendition.quality}_playlist`);
        const playlistUri = `${aggregatorUrl}/v1/blobs/by-quilt-patch-id/${playlistPatchId}`;
        const [width, height] = rendition.resolution.split('x');
        masterContent += `#EXT-X-STREAM-INF:BANDWIDTH=${rendition.bitrate},RESOLUTION=${width}x${height}\\n${playlistUri}\\n`;
      });

      // Retry master playlist upload if needed
      let masterQuilt;
      let masterRetries = 3;
      while (masterRetries > 0) {
        try {
          console.log('[Upload] Calling uploadQuiltWithWallet for master playlist...');
          masterQuilt = await walrusSdk.uploadQuiltWithWallet(
            [{ contents: new TextEncoder().encode(masterContent), identifier: 'master_playlist' }],
            signAndExecuteTransaction,
            account!.address,
            {
              network: (process.env.NEXT_PUBLIC_WALRUS_NETWORK as 'mainnet' | 'testnet') || 'mainnet',
              epochs: costEstimate.epochs
            }
          );
          console.log('[Upload] ✓ Master playlist uploaded successfully');
          break;
        } catch (err) {
          masterRetries--;
          if (masterRetries === 0) throw err;

          console.log(`[Upload] Master playlist upload error, retrying... (${masterRetries} attempts left)`);
          setProgress({
            stage: 'uploading',
            percent: 90,
            message: `Retrying master playlist... (${masterRetries} attempts left)`
          });
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      const masterWalrusUri = `${aggregatorUrl}/v1/blobs/by-quilt-patch-id/${masterQuilt.index.patches[0].patchId}`;

      setProgress({ stage: 'uploading', percent: 95, message: 'Registering video...' });

      // Step 5: Register video metadata
      const registerResponse = await fetch('/api/v1/register-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          title,
          creatorId: account.address,
          walrusMasterUri: masterWalrusUri,
          posterWalrusUri: segmentsData.poster ? `${aggregatorUrl}/v1/blobs/by-quilt-patch-id/${segmentPatchIdMap.get('poster')}` : undefined,
          rootSecretEnc: segmentsData.rootSecretEnc,
          duration: segmentsData.duration,
          renditions: segmentsData.renditions.map((r: any) => ({
            name: r.quality,
            resolution: r.resolution,
            bitrate: r.bitrate,
            walrusPlaylistUri: `${aggregatorUrl}/v1/blobs/by-quilt-patch-id/${playlistPatchIdMap.get(`${r.quality}_playlist`)}`,
            segments: [], // Build from patch IDs
          })),
          paymentInfo: {
            paidWal: (Number(segmentQuilt.cost.totalCost) + Number(playlistQuilt.cost.totalCost) + Number(masterQuilt.cost.totalCost)) / 1_000_000_000,
            paidMist: (Number(segmentQuilt.cost.totalCost) + Number(playlistQuilt.cost.totalCost) + Number(masterQuilt.cost.totalCost)).toString(),
            walletAddress: account.address,
            transactionIds: {
              segments: segmentQuilt.blobObject.objectId,
              playlists: playlistQuilt.blobObject.objectId,
              master: masterQuilt.blobObject.objectId,
            },
          },
        }),
      });

      if (!registerResponse.ok) {
        throw new Error('Failed to register video');
      }

      const { video } = await registerResponse.json();

      setProgress({ stage: 'complete', percent: 100, message: 'Upload complete!' });
      console.log(`[Upload] Video uploaded: ${video.id}`);

      setTimeout(() => {
        router.push(`/watch/${video.id}`);
      }, 1000);

    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold text-foreground mb-2">Upload Video</h1>
          <p className="text-text-muted mb-8">
            Pay for decentralized storage with WAL tokens
          </p>

          {/* Upload Form */}
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
                disabled={isUploading || showCostApproval}
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
                disabled={isUploading || showCostApproval}
                placeholder="My awesome video"
                className="w-full px-4 py-3 bg-background-elevated border border-border rounded-lg"
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
                      ${selectedQualities.includes(quality)
                        ? 'bg-walrus-mint text-walrus-black border-walrus-mint'
                        : 'bg-background-elevated text-foreground border-border'
                      }
                      ${isUploading || showCostApproval ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={selectedQualities.includes(quality)}
                      onChange={() => handleQualityToggle(quality)}
                      disabled={isUploading || showCostApproval}
                      className="sr-only"
                    />
                    {quality}
                  </label>
                ))}
              </div>
            </div>

            {/* Cost Approval UI */}
            {showCostApproval && costEstimate && (
              <div className="p-6 bg-walrus-mint/10 border-2 border-walrus-mint rounded-lg">
                <h3 className="text-lg font-bold text-foreground mb-3">Approve Payment</h3>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Storage Cost:</span>
                    <span className="text-foreground font-mono font-bold">{costEstimate.totalWal} WAL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">File Size:</span>
                    <span className="text-foreground">{costEstimate.sizeFormatted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Storage Duration:</span>
                    <span className="text-foreground">{costEstimate.epochs} epochs (~{costEstimate.epochs * 2} days)</span>
                  </div>
                </div>
                <p className="text-sm text-text-muted mb-4">
                  You will be prompted to sign a transaction to pay {costEstimate.totalWal} WAL from your wallet.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleApproveAndPay}
                    className="flex-1 bg-walrus-mint text-walrus-black py-3 px-6 rounded-lg font-semibold hover:bg-mint-800"
                  >
                    Sign & Pay
                  </button>
                  <button
                    onClick={() => {
                      setShowCostApproval(false);
                      setIsUploading(false);
                      setCostEstimate(null);
                    }}
                    className="px-6 py-3 border-2 border-border rounded-lg text-foreground hover:bg-background-hover"
                  >
                    Cancel
                  </button>
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
                  <span className="text-walrus-mint font-bold">{progress.percent}%</span>
                </div>
                <div className="w-full bg-background-hover rounded-full h-2.5">
                  <div
                    className="bg-walrus-mint h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Upload Button */}
            {!showCostApproval && (
              <button
                onClick={handleUpload}
                disabled={!selectedFile || !account || !title || isUploading || selectedQualities.length === 0 || !sdkLoaded}
                className="w-full bg-walrus-mint text-walrus-black py-4 px-6 rounded-lg font-semibold
                  hover:bg-mint-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {!account ? 'Connect Wallet to Upload' : !sdkLoaded ? 'Loading SDK...' : 'Calculate Cost & Continue'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
