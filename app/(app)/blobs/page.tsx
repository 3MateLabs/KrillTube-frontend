'use client';

import { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { uploadWithWallet, UploadProgress } from '@/lib/walrus-upload-client';
import { getBlobMetadata, calculateExtendCost, extendBlob, deleteBlob } from '@/lib/walrus-manage-client';

interface BlobInfo {
  blobObjectId: string;
  blobId: string;
  endEpoch: number;
  size: string;
  deletable: boolean;
}

export default function BlobsPage() {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

  // Blob info state
  const [blobObjectId, setBlobObjectId] = useState('');
  const [blobInfo, setBlobInfo] = useState<BlobInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);

  // Extend state
  const [epochs, setEpochs] = useState(1);
  const [extendCost, setExtendCost] = useState<any>(null);
  const [extending, setExtending] = useState(false);

  // Delete state
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState('');

  // Error state
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Upload blob using Walrus SDK (requires wallet signatures)
  const handleUpload = async () => {
    if (!file || !currentAccount) return;

    setUploading(true);
    setError(null);
    setSuccess(null);
    setUploadProgress(null);

    try {
      // Upload using Walrus SDK - requires 2 wallet signatures
      const result = await uploadWithWallet(
        file,
        5, // Store for 5 epochs (~10 weeks on mainnet)
        signAndExecuteTransaction,
        currentAccount.address,
        (progress) => {
          setUploadProgress(progress);
        }
      );

      setUploadResult(result);
      setSuccess(
        `✅ Blob uploaded! You signed 2 transactions and paid with your WAL tokens.\nBlob ID: ${result.blobId.substring(0, 20)}...`
      );
      setBlobObjectId(result.blobObjectId);

    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  // Fetch blob metadata from blockchain (client-side SDK)
  const handleFetchBlobInfo = async () => {
    if (!blobObjectId) return;

    setLoadingInfo(true);
    setError(null);

    try {
      const info = await getBlobMetadata(blobObjectId);
      setBlobInfo(info);
      setSuccess('Blob info fetched successfully');

    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch blob info');
    } finally {
      setLoadingInfo(false);
    }
  };

  // Calculate extend cost (client-side SDK)
  const handleCalculateExtendCost = async () => {
    if (!blobInfo) return;

    setError(null);

    try {
      const cost = await calculateExtendCost(blobInfo.size, epochs);
      setExtendCost({
        success: true,
        size: blobInfo.size,
        epochs,
        ...cost,
      });

    } catch (err) {
      console.error('Cost calculation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to calculate cost');
    }
  };

  // Extend blob storage (client-side SDK with wallet signing)
  const handleExtend = async () => {
    if (!blobInfo || !currentAccount) return;

    setExtending(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await extendBlob(
        blobInfo.blobObjectId,
        epochs,
        signAndExecuteTransaction,
        currentAccount.address
      );

      setSuccess(
        `✅ Storage extended by ${epochs} epochs!\n` +
        `New end epoch: ${result.newEndEpoch}\n` +
        `Transaction: ${result.digest.substring(0, 20)}...`
      );

      // Refresh blob info
      await handleFetchBlobInfo();

    } catch (err) {
      console.error('Extend error:', err);
      setError(err instanceof Error ? err.message : 'Failed to extend storage');
    } finally {
      setExtending(false);
    }
  };

  // Delete blob (client-side SDK with wallet signing)
  const handleDelete = async () => {
    if (!blobInfo || !currentAccount || confirmDelete !== 'DELETE') return;

    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await deleteBlob(
        blobInfo.blobObjectId,
        signAndExecuteTransaction,
        currentAccount.address
      );

      setSuccess(
        `✅ Blob deleted successfully!\n` +
        `Storage rebate reclaimed to your wallet.\n` +
        `Transaction: ${result.digest.substring(0, 20)}...`
      );

      // Clear blob info
      setBlobInfo(null);
      setBlobObjectId('');
      setConfirmDelete('');

    } catch (err) {
      console.error('Delete error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete blob');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0668A6] via-[#0668A6] to-[#1AAACE] p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Blob Testing</h1>

        {/* Wallet Status */}
        {!currentAccount ? (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-400 font-medium">⚠️ Please connect your Sui wallet to continue</p>
          </div>
        ) : (
          <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 mb-6">
            <p className="text-green-400 font-medium">✅ Connected: {currentAccount.address.slice(0, 10)}...{currentAccount.address.slice(-8)}</p>
          </div>
        )}

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 mb-6">
            <p className="text-green-400">{success}</p>
          </div>
        )}

        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-black mb-4">1. Upload Blob to Mainnet (SDK Upload)</h2>
          <p className="text-gray-600 mb-2">Upload using Walrus SDK - YOU sign transactions and pay with your WAL tokens.</p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-800 font-medium mb-2">
              🔐 <strong>This requires 2 wallet signatures + WAL tokens</strong>
            </p>
            <p className="text-sm text-yellow-700">
              <strong>Upload Flow:</strong><br />
              1️⃣ Encode blob locally (no signature)<br />
              2️⃣ <strong>Sign transaction</strong> to register blob (pays WAL for storage)<br />
              3️⃣ Upload encoded data to storage nodes (no signature)<br />
              4️⃣ <strong>Sign transaction</strong> to certify blob (pays WAL for write)<br />
              <br />
              ✅ You own the blob automatically<br />
              ✅ Works on mainnet with your wallet<br />
              ⚠️ Requires WAL tokens in your wallet
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select File (Recommended: &lt; 1MB for testing)
              </label>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                disabled={uploading || !currentAccount}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            {uploadProgress && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 font-medium mb-2">
                  Step {uploadProgress.step}/{uploadProgress.totalSteps}
                </p>
                <p className="text-sm text-blue-700">{uploadProgress.message}</p>
                <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${(uploadProgress.step / uploadProgress.totalSteps) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || uploading || !currentAccount}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading (check wallet for signatures)...' : '🔐 Upload with Wallet (2 signatures required)'}
            </button>

            {uploadResult && (
              <div className="bg-gray-100 rounded-lg p-4">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Blob Object ID:</strong><br />
                  <code className="text-xs bg-white p-1 rounded">{uploadResult.blobObjectId}</code>
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Blob ID:</strong><br />
                  <code className="text-xs bg-white p-1 rounded">{uploadResult.blobId}</code>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Fetch Blob Info Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-black mb-4">2. Fetch Blob Metadata</h2>
          <p className="text-gray-600 mb-4">Enter a blob object ID to fetch its metadata from the blockchain.</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Blob Object ID
              </label>
              <input
                type="text"
                value={blobObjectId}
                onChange={(e) => setBlobObjectId(e.target.value)}
                placeholder="0x..."
                disabled={loadingInfo}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <button
              onClick={handleFetchBlobInfo}
              disabled={!blobObjectId || loadingInfo}
              className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {loadingInfo ? 'Fetching...' : '🔍 Fetch Blob Info'}
            </button>

            {blobInfo && (
              <div className="bg-gray-100 rounded-lg p-4 space-y-2">
                <p className="text-sm text-gray-700">
                  <strong>Blob ID:</strong> <code className="text-xs bg-white p-1 rounded">{blobInfo.blobId}</code>
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Size:</strong> {parseInt(blobInfo.size).toLocaleString()} bytes
                </p>
                <p className="text-sm text-gray-700">
                  <strong>End Epoch:</strong> {blobInfo.endEpoch} (~{blobInfo.endEpoch * 14} days)
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Deletable:</strong> {blobInfo.deletable ? '✅ Yes' : '❌ No'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Extend Section */}
        {blobInfo && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-black mb-4">3. Extend Storage</h2>
            <p className="text-gray-600 mb-2">Extend the storage duration for this blob.</p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                🔐 <strong>Wallet signing required</strong> - You must sign a transaction to extend storage.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Epochs (1 epoch ≈ 14 days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={epochs}
                  onChange={(e) => setEpochs(parseInt(e.target.value) || 1)}
                  disabled={extending}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <button
                onClick={handleCalculateExtendCost}
                disabled={extending}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                💰 Calculate Cost
              </button>

              {extendCost && (
                <div className="bg-blue-100 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <strong>Estimated Cost:</strong> {extendCost.costWal} WAL ({extendCost.costMist} MIST)
                  </p>
                  <p className="text-sm text-blue-900">
                    <strong>New End Epoch:</strong> {blobInfo.endEpoch + epochs}
                  </p>
                </div>
              )}

              <button
                onClick={handleExtend}
                disabled={extending || !currentAccount}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {extending ? 'Extending...' : '⏰ Extend Storage'}
              </button>
            </div>
          </div>
        )}

        {/* Delete Section */}
        {blobInfo && blobInfo.deletable && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-red-500">
            <h2 className="text-2xl font-bold text-red-600 mb-4">4. Delete Blob ⚠️</h2>
            <p className="text-gray-600 mb-2">Permanently delete this blob and reclaim storage rebate. This action cannot be undone!</p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                🔐 <strong>Wallet signing required</strong> - You must sign a transaction to delete the blob.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 font-medium mb-2">Warning:</p>
                <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                  <li>Blob will be permanently deleted from Walrus</li>
                  <li>You will receive a storage rebate in SUI</li>
                  <li>This action cannot be reversed</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type <span className="text-red-600 font-mono">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={confirmDelete}
                  onChange={(e) => setConfirmDelete(e.target.value)}
                  placeholder="DELETE"
                  disabled={deleting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <button
                onClick={handleDelete}
                disabled={deleting || confirmDelete !== 'DELETE' || !currentAccount}
                className="w-full px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : '🗑️ Delete Forever'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
