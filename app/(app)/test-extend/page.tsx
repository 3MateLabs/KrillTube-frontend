'use client';

import { useState, useEffect } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';

interface Video {
  id: string;
  title: string;
  creatorId: string;
  network: string;
  masterEndEpoch: number | null;
  masterBlobObjectId?: string | null;
  blobCount: number;
  renditions: Array<{
    segments: Array<{ id: string }>;
  }>;
}

interface ExtendResponse {
  success: boolean;
  videoId: string;
  blobCount: number;
  epochs: number;
  blobObjectIds: string[]; // Blob IDs for client-side PTB construction
  batchMode: boolean;
  instructions: {
    steps: string[];
    note: string;
  };
}

export default function TestExtendPage() {
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [epochs, setEpochs] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [extendResponse, setExtendResponse] = useState<ExtendResponse | null>(null);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Fetch user's videos
  useEffect(() => {
    if (!account?.address) return;

    const fetchVideos = async () => {
      try {
        console.log('[Test Extend] Fetching videos for:', account.address);
        const res = await fetch(`/api/v1/videos/creator/${account.address}`);
        if (!res.ok) throw new Error('Failed to fetch videos');
        const data = await res.json();

        console.log('[Test Extend] API Response:', data);

        // Only show mainnet videos
        const mainnetVideos = data.videos.filter((v: Video) => v.network === 'mainnet');
        console.log('[Test Extend] Mainnet videos:', mainnetVideos);
        console.log('[Test Extend] Videos with blob IDs:', mainnetVideos.filter((v: Video) => v.masterBlobObjectId).length);
        console.log('[Test Extend] Videos without blob IDs:', mainnetVideos.filter((v: Video) => !v.masterBlobObjectId).length);

        setVideos(mainnetVideos);
      } catch (err) {
        console.error('[Test Extend] Failed to fetch videos:', err);
      }
    };

    fetchVideos();
  }, [account?.address]);

  // Step 1: Get extend transaction from API
  const handleGetExtendTransaction = async () => {
    if (!selectedVideoId || !account?.address) {
      setError('Please select a video and connect wallet');
      return;
    }

    setLoading(true);
    setError('');
    setResult('');
    setExtendResponse(null);

    try {
      console.log('[Test Extend] Requesting batch extend transaction...');

      const res = await fetch(`/api/v1/videos/${selectedVideoId}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          epochs,
          creatorId: account.address,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to get extend transaction');
      }

      const data: ExtendResponse = await res.json();
      console.log('[Test Extend] Extend response:', data);

      setExtendResponse(data);
      setResult(`Ready to extend ${data.blobCount} blobs!\nBatch Mode: ${data.batchMode ? 'YES (Single PTB)' : 'NO'}\n\nCost will be shown in your wallet when you sign the transaction.`);
    } catch (err) {
      console.error('[Test Extend] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Build PTB client-side and execute
  const handleExecuteExtend = async () => {
    if (!extendResponse || !account?.address) {
      setError('No transaction to execute');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('[Test Extend] Building PTB client-side (browser WASM)...');
      console.log('[Test Extend] Blob IDs to extend:', extendResponse.blobObjectIds.length);

      // Import Walrus SDK for client-side PTB construction
      const { buildBatchExtendTransaction } = await import('@/lib/walrus-sdk');

      // Build batch extend transaction in browser (where WASM works)
      const blobs = extendResponse.blobObjectIds.map(blobObjectId => ({
        blobObjectId,
      }));

      console.log('[Test Extend] Calling buildBatchExtendTransaction...');
      const transaction = await buildBatchExtendTransaction(blobs, extendResponse.epochs);
      console.log('[Test Extend] PTB built successfully');

      // Sign and execute the transaction
      console.log('[Test Extend] Requesting wallet signature...');
      const result = await signAndExecute({
        transaction,
      });

      console.log('[Test Extend] ✅ Transaction executed:', result);
      setResult(`✅ Transaction executed successfully!\n\nDigest: ${result.digest}\n\nAll ${extendResponse.blobCount} blobs have been extended in a single PTB transaction!`);

    } catch (err) {
      console.error('[Test Extend] Execution error:', err);
      setError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  const selectedVideo = videos.find(v => v.id === selectedVideoId);
  const blobCount = selectedVideo
    ? 1 + // master
      (selectedVideo.renditions?.length || 0) + // playlists
      selectedVideo.renditions.reduce((sum, r) => sum + r.segments.length, 0) + // segments
      1 // poster
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0668A6] via-[#0668A6] to-[#1AAACE] p-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Test Batch Extend (PTB)
          </h1>
          <p className="text-white/80">
            Test extending all video blobs in a single Programmable Transaction Block
          </p>
        </div>

        {/* Wallet Status */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-black text-black">
          <h2 className="text-xl font-bold mb-4">Wallet Status</h2>
          {account?.address ? (
            <div className="text-sm">
              <span className="font-semibold">Connected:</span>{' '}
              <span className="font-mono">{account.address.slice(0, 10)}...{account.address.slice(-8)}</span>
            </div>
          ) : (
            <p className="text-red-600">Please connect your wallet first</p>
          )}
        </div>

        {/* Video Selection */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-black text-black">
          <h2 className="text-xl font-bold mb-4">Select Video</h2>

          {videos.length === 0 ? (
            <p className="text-gray-600">No mainnet videos found. Upload a video on mainnet first.</p>
          ) : (
            <>
              <select
                value={selectedVideoId}
                onChange={(e) => setSelectedVideoId(e.target.value)}
                className="w-full px-4 py-3 border-2 border-black rounded-xl"
              >
                <option value="">-- Select a video --</option>
                {videos.map((video) => {
                  const vBlobCount = 1 + (video.renditions?.length || 0) +
                    video.renditions.reduce((sum, r) => sum + r.segments.length, 0) + 1;
                  const hasBlobs = !!video.masterBlobObjectId;
                  return (
                    <option key={video.id} value={video.id} disabled={!hasBlobs}>
                      {video.title} ({vBlobCount} blobs) {!hasBlobs ? '⚠️ No blob IDs' : '✓'}
                    </option>
                  );
                })}
              </select>

              {videos.filter(v => !v.masterBlobObjectId).length > 0 && (
                <div className="mt-4 p-4 bg-yellow-50 rounded-xl border-2 border-yellow-600">
                  <p className="text-sm text-yellow-800">
                    ⚠️ <strong>Warning:</strong> Some videos don't have blob object IDs.
                    These were uploaded before the blob ownership fix.
                    Only videos with blob IDs can be extended.
                    Please upload a new video on mainnet to test the batch extend feature.
                  </p>
                </div>
              )}
            </>
          )}

          {selectedVideo && (
            <div className={`mt-4 p-4 rounded-xl border-2 ${selectedVideo.masterBlobObjectId ? 'bg-green-50 border-green-600' : 'bg-red-50 border-red-600'}`}>
              <h3 className="font-bold mb-2">Video Info:</h3>
              <div className="text-sm space-y-1">
                <p><span className="font-semibold">Title:</span> {selectedVideo.title}</p>
                <p><span className="font-semibold">Network:</span> {selectedVideo.network}</p>
                <p><span className="font-semibold">Blob Object ID:</span> {selectedVideo.masterBlobObjectId ? `✓ ${selectedVideo.masterBlobObjectId.slice(0, 10)}...` : '✗ Not available'}</p>
                <p><span className="font-semibold">Current End Epoch:</span> {selectedVideo.masterEndEpoch || 'Unknown'}</p>
                <p><span className="font-semibold">Estimated Blob Count:</span> {blobCount}</p>
                <p><span className="font-semibold">Renditions:</span> {selectedVideo.renditions?.length || 0}</p>
                <p><span className="font-semibold">Total Segments:</span> {selectedVideo.renditions.reduce((sum, r) => sum + r.segments.length, 0)}</p>
              </div>
              {!selectedVideo.masterBlobObjectId && (
                <div className="mt-3 p-2 bg-red-100 rounded border border-red-600">
                  <p className="text-xs text-red-800">
                    ⚠️ This video cannot be extended because it's missing blob object IDs.
                    Please upload a new video on mainnet to test the extend feature.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Epochs Input */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-black text-black">
          <h2 className="text-xl font-bold mb-4">Extension Period</h2>
          <div className="flex items-center gap-4">
            <label className="font-semibold">Epochs:</label>
            <input
              type="number"
              value={epochs}
              onChange={(e) => setEpochs(parseInt(e.target.value) || 1)}
              min={1}
              max={100}
              className="px-4 py-2 border-2 border-black rounded-xl w-32"
            />
            <span className="text-sm text-gray-600">
              (1 epoch ≈ 1 day on mainnet)
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-black text-black">
          <h2 className="text-xl font-bold mb-4">Actions</h2>

          <div className="space-y-4">
            {/* Step 1: Get Transaction */}
            <button
              onClick={handleGetExtendTransaction}
              disabled={loading || !selectedVideoId || !account?.address}
              className="w-full px-6 py-3 bg-blue-600 text-white font-bold rounded-xl
                shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-black
                hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1.00)]
                hover:translate-x-[1px] hover:translate-y-[1px]
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all"
            >
              {loading && !extendResponse ? 'Building PTB Transaction...' : 'Step 1: Get Batch Extend Transaction'}
            </button>

            {/* Step 2: Execute Transaction */}
            {extendResponse && (
              <button
                onClick={handleExecuteExtend}
                disabled={loading}
                className="w-full px-6 py-3 bg-green-600 text-white font-bold rounded-xl
                  shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-black
                  hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1.00)]
                  hover:translate-x-[1px] hover:translate-y-[1px]
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all"
              >
                {loading && extendResponse ? 'Executing...' : 'Step 2: Sign & Execute PTB'}
              </button>
            )}
          </div>
        </div>

        {/* Response */}
        {extendResponse && (
          <div className="bg-white rounded-2xl p-6 mb-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-black text-black">
            <h2 className="text-xl font-bold mb-4">Extend Transaction Details</h2>
            <div className="bg-blue-50 rounded-xl p-4 border-2 border-black">
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(extendResponse, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="bg-green-100 rounded-2xl p-6 mb-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-black">
            <h2 className="text-xl font-bold mb-4 text-green-800">Result</h2>
            <pre className="text-sm whitespace-pre-wrap">{result}</pre>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-100 rounded-2xl p-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-black">
            <h2 className="text-xl font-bold mb-4 text-red-800">Error</h2>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-white/20 rounded-2xl p-6 border-2 border-white text-white">
          <h3 className="text-lg font-bold mb-2">How to Test:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Connect your Sui wallet (must be video creator)</li>
            <li>Select a mainnet video you own</li>
            <li>Set the number of epochs to extend (default 5)</li>
            <li>Click "Step 1: Get Batch Extend Transaction" to build the PTB</li>
            <li>Review the transaction details (blob count, cost, batch mode)</li>
            <li>Click "Step 2: Sign & Execute PTB" to execute the batch extend</li>
            <li>Check console logs for PTB construction details</li>
            <li>Check if all blobs were extended in a single transaction!</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
