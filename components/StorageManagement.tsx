'use client';

import { useState, useEffect } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { formatDuration } from '@/lib/types';
import { useRouter } from 'next/navigation';

interface StorageManagementProps {
  videoId: string;
  network: string;
  creatorId: string;
  masterBlobObjectId?: string | null;
  masterEndEpoch?: number | null;
}

/**
 * Storage Management Component for Mainnet Videos
 *
 * MAINNET ONLY: Shows epoch countdown, extend storage button, and delete button
 *
 * Features:
 * - Real-time epoch countdown (days remaining until expiry)
 * - Extend storage with cost preview
 * - Delete video with rebate display
 * - Transaction signing with Sui wallet
 */
export function StorageManagement({
  videoId,
  network,
  creatorId,
  masterBlobObjectId,
  masterEndEpoch,
}: StorageManagementProps) {
  const currentAccount = useCurrentAccount();
  const [currentEpoch, setCurrentEpoch] = useState<number | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Check if user is the creator
  const isCreator = currentAccount?.address === creatorId;

  // Mainnet only
  if (network !== 'mainnet') {
    return null;
  }

  // No blob object ID (quilt upload)
  if (!masterBlobObjectId || !masterEndEpoch) {
    return (
      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-amber-500/20 rounded flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-amber-400 mb-1">
              Storage Management Not Available
            </h3>
            <p className="text-xs text-text-muted leading-relaxed">
              This video was uploaded via batch upload and does not have blob object metadata.
              Extend/delete operations require blob object IDs.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate days remaining (2-week epochs)
  useEffect(() => {
    // TODO: Fetch current epoch from Sui blockchain
    // For now, estimate based on time
    // Mainnet epochs are approximately 2 weeks
    const EPOCH_DURATION_SECONDS = 14 * 24 * 60 * 60; // 14 days
    const ESTIMATED_GENESIS_TIME = 1700000000; // Placeholder genesis time
    const currentTime = Math.floor(Date.now() / 1000);
    const estimatedEpoch = Math.floor((currentTime - ESTIMATED_GENESIS_TIME) / EPOCH_DURATION_SECONDS);

    setCurrentEpoch(estimatedEpoch);

    if (masterEndEpoch) {
      const epochsRemaining = masterEndEpoch - estimatedEpoch;
      const days = epochsRemaining * 14; // Each epoch is ~14 days
      setDaysRemaining(days);
    }
  }, [masterEndEpoch]);

  return (
    <div className="space-y-4">
      {/* Storage Expiry Countdown */}
      <div className={`p-4 rounded-lg border ${
        (daysRemaining ?? 0) < 30
          ? 'bg-red-500/10 border-red-500/30'
          : (daysRemaining ?? 0) < 90
            ? 'bg-amber-500/10 border-amber-500/30'
            : 'bg-green-500/10 border-green-500/30'
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${
              (daysRemaining ?? 0) < 30
                ? 'bg-red-500/20'
                : (daysRemaining ?? 0) < 90
                  ? 'bg-amber-500/20'
                  : 'bg-green-500/20'
            }`}>
              <svg className={`w-5 h-5 ${
                (daysRemaining ?? 0) < 30
                  ? 'text-red-400'
                  : (daysRemaining ?? 0) < 90
                    ? 'text-amber-400'
                    : 'text-green-400'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className={`text-sm font-medium mb-1 ${
                (daysRemaining ?? 0) < 30
                  ? 'text-red-400'
                  : (daysRemaining ?? 0) < 90
                    ? 'text-amber-400'
                    : 'text-green-400'
              }`}>
                {daysRemaining !== null ? (
                  daysRemaining < 0 ? (
                    'Storage Expired'
                  ) : daysRemaining < 1 ? (
                    'Expires Today'
                  ) : daysRemaining < 30 ? (
                    'Expiring Soon'
                  ) : (
                    'Storage Active'
                  )
                ) : (
                  'Loading...'
                )}
              </h3>
              <p className="text-xs text-text-muted leading-relaxed mb-2">
                {daysRemaining !== null ? (
                  daysRemaining < 0 ? (
                    'This video storage has expired and may no longer be accessible.'
                  ) : (
                    `${Math.floor(daysRemaining)} days remaining (ends at epoch ${masterEndEpoch})`
                  )
                ) : (
                  'Calculating expiry...'
                )}
              </p>
              {currentEpoch && (
                <p className="text-xs text-text-muted">
                  Current epoch: {currentEpoch}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Creator Actions */}
      {isCreator && (
        <div className="p-4 bg-background-elevated rounded-lg border border-border/30">
          <h3 className="text-sm font-medium text-foreground mb-3">Storage Management</h3>
          <p className="text-xs text-text-muted mb-4">
            As the creator, you can extend storage duration or permanently delete this video.
          </p>

          <div className="flex gap-3">
            {/* Extend Storage Button */}
            <button
              onClick={() => setShowExtendModal(true)}
              className="flex-1 px-4 py-2.5 bg-walrus-mint text-walrus-black rounded-lg font-medium hover:bg-mint-800 transition-colors text-sm"
            >
              ⏰ Extend Storage
            </button>

            {/* Delete Video Button */}
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex-1 px-4 py-2.5 bg-red-500/20 text-red-400 rounded-lg font-medium hover:bg-red-500/30 transition-colors text-sm border border-red-500/30"
            >
              🗑️ Delete Video
            </button>
          </div>
        </div>
      )}

      {/* Not Creator Warning */}
      {!isCreator && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-500/20 rounded flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-blue-400 mb-1">
                Creator Only
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Only the video creator can extend storage or delete this video.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Extend Storage Modal */}
      {showExtendModal && (
        <ExtendStorageModal
          videoId={videoId}
          onClose={() => setShowExtendModal(false)}
        />
      )}

      {/* Delete Video Modal */}
      {showDeleteModal && (
        <DeleteVideoModal
          videoId={videoId}
          onClose={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
}

/**
 * Extend Storage Modal Component
 */
function ExtendStorageModal({ videoId, onClose }: { videoId: string; onClose: () => void }) {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();

  const [epochs, setEpochs] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingCost, setLoadingCost] = useState(false);
  const [costEstimate, setCostEstimate] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch cost estimate when epochs change
  useEffect(() => {
    const fetchCost = async () => {
      setLoadingCost(true);
      try {
        const response = await fetch(`/api/v1/videos/${videoId}/extend`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            epochs,
            creatorId: currentAccount?.address,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to calculate cost');
        }

        const data = await response.json();
        setCostEstimate(data);
      } catch (err) {
        console.error('Failed to fetch cost estimate:', err);
        setError(err instanceof Error ? err.message : 'Failed to calculate cost');
      } finally {
        setLoadingCost(false);
      }
    };

    if (currentAccount?.address) {
      fetchCost();
    }
  }, [epochs, videoId, currentAccount?.address]);

  const handleExtend = async () => {
    if (!currentAccount?.address || !costEstimate) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Build unsigned transaction (already fetched in costEstimate)
      const unsignedTx = costEstimate.unsignedTransaction;

      // 2. Sign and execute transaction with Sui wallet
      const result = await signAndExecuteTransaction({
        transaction: Transaction.from(unsignedTx),
      });

      console.log('[Extend] Transaction executed:', result.digest);

      // 3. Wait for transaction confirmation
      await suiClient.waitForTransaction({
        digest: result.digest,
      });

      // 4. Call finalize API to update database
      const finalizeResponse = await fetch(`/api/v1/videos/${videoId}/extend/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionDigest: result.digest,
          blobObjectId: costEstimate.blobCosts[0].blobObjectId, // Master blob
          creatorId: currentAccount.address,
          additionalEpochs: epochs,
        }),
      });

      if (!finalizeResponse.ok) {
        const error = await finalizeResponse.json();
        throw new Error(error.error || 'Failed to finalize extension');
      }

      setSuccess(true);
      setTimeout(() => {
        window.location.reload(); // Reload to show updated expiry
      }, 2000);

    } catch (err) {
      console.error('[Extend] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to extend storage');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background-elevated rounded-lg border border-border max-w-md w-full p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Extend Storage</h2>

        {success ? (
          <div className="space-y-4 mb-6">
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
              <svg className="w-12 h-12 text-green-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm font-medium text-green-400 mb-1">Storage Extended!</p>
              <p className="text-xs text-text-muted">Your video storage has been extended successfully.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Additional Epochs (1 epoch ≈ 14 days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={epochs}
                  onChange={(e) => setEpochs(parseInt(e.target.value) || 1)}
                  disabled={loading}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground disabled:opacity-50"
                />
              </div>

              <div className="p-3 bg-background rounded-lg border border-border/30">
                <p className="text-xs text-text-muted mb-1">Estimated Cost:</p>
                {loadingCost ? (
                  <p className="text-sm text-text-muted">Calculating...</p>
                ) : costEstimate ? (
                  <>
                    <p className="text-lg font-semibold text-walrus-mint">
                      {costEstimate.totalCost.wal} WAL
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                      {epochs * 14} days • {costEstimate.blobCount} blobs
                    </p>
                  </>
                ) : error ? (
                  <p className="text-sm text-red-400">{error}</p>
                ) : (
                  <p className="text-sm text-text-muted">Enter epochs to see cost</p>
                )}
              </div>

              {error && !loadingCost && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-foreground hover:bg-background-elevated transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExtend}
                disabled={loading || loadingCost || !costEstimate}
                className="flex-1 px-4 py-2 bg-walrus-mint text-walrus-black rounded-lg font-medium hover:bg-mint-800 transition-colors disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Extend Storage'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Delete Video Modal Component
 */
function DeleteVideoModal({ videoId, onClose }: { videoId: string; onClose: () => void }) {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const router = useRouter();

  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [deleteInfo, setDeleteInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch delete info on mount
  useEffect(() => {
    const fetchDeleteInfo = async () => {
      setLoadingInfo(true);
      try {
        const response = await fetch(`/api/v1/videos/${videoId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creatorId: currentAccount?.address,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to get delete information');
        }

        const data = await response.json();
        setDeleteInfo(data);
      } catch (err) {
        console.error('Failed to fetch delete info:', err);
        setError(err instanceof Error ? err.message : 'Failed to get delete information');
      } finally {
        setLoadingInfo(false);
      }
    };

    if (currentAccount?.address) {
      fetchDeleteInfo();
    }
  }, [videoId, currentAccount?.address]);

  const handleDelete = async () => {
    if (confirmText !== 'DELETE' || !currentAccount?.address || !deleteInfo) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Build unsigned transaction (already fetched in deleteInfo)
      const unsignedTx = deleteInfo.unsignedTransaction;

      // 2. Sign and execute transaction with Sui wallet
      const result = await signAndExecuteTransaction({
        transaction: Transaction.from(unsignedTx),
      });

      console.log('[Delete] Transaction executed:', result.digest);

      // 3. Wait for transaction confirmation
      await suiClient.waitForTransaction({
        digest: result.digest,
      });

      // 4. Call finalize API to delete from database
      const finalizeResponse = await fetch(`/api/v1/videos/${videoId}/delete/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionDigest: result.digest,
          creatorId: currentAccount.address,
        }),
      });

      if (!finalizeResponse.ok) {
        const error = await finalizeResponse.json();
        throw new Error(error.error || 'Failed to finalize deletion');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/library'); // Redirect to library after deletion
      }, 2000);

    } catch (err) {
      console.error('[Delete] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete video');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background-elevated rounded-lg border border-red-500/30 max-w-md w-full p-6">
        <h2 className="text-lg font-semibold text-red-400 mb-4">⚠️ Delete Video</h2>

        {success ? (
          <div className="space-y-4 mb-6">
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
              <svg className="w-12 h-12 text-green-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm font-medium text-green-400 mb-1">Video Deleted!</p>
              <p className="text-xs text-text-muted">Your video has been deleted and storage rebate issued. Redirecting...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-6">
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400 font-medium mb-2">
                  This action cannot be undone
                </p>
                <p className="text-xs text-text-muted leading-relaxed">
                  Deleting this video will permanently remove all data from Walrus storage.
                  You will receive a storage rebate (refund) to your wallet.
                </p>
              </div>

              <div className="p-3 bg-background rounded-lg border border-border/30">
                <p className="text-xs text-text-muted mb-1">Storage Information:</p>
                {loadingInfo ? (
                  <p className="text-sm text-text-muted">Loading...</p>
                ) : deleteInfo ? (
                  <>
                    <p className="text-sm text-foreground mb-2">
                      {deleteInfo.blobCount} blobs will be deleted
                    </p>
                    <p className="text-xs text-text-muted">
                      Storage resources will be returned to your wallet
                    </p>
                  </>
                ) : error ? (
                  <p className="text-sm text-red-400">{error}</p>
                ) : (
                  <p className="text-sm text-text-muted">Unable to fetch delete info</p>
                )}
              </div>

              {error && !loadingInfo && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Type <span className="text-red-400 font-mono">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  disabled={loading || loadingInfo}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground disabled:opacity-50"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-foreground hover:bg-background-elevated transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading || confirmText !== 'DELETE' || loadingInfo || !deleteInfo}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
