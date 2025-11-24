'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { CustomVideoPlayer } from '@/components/CustomVideoPlayer';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient, useSignPersonalMessage } from '@mysten/dapp-kit';

// Helper function to fix Walrus URLs
const fixWalrusUrl = (url: string, network: string = 'mainnet'): string => {
  if (!url) return url;

  const AGGREGATOR_DOMAIN = 'aggregator.walrus.space';
  const TESTNET_AGGREGATOR = 'aggregator.walrus-testnet.walrus.space';
  const AGGREGATOR_REPLACEMENT = 'aggregator.mainnet.walrus.mirai.cloud';

  const targetAggregator = network === 'testnet'
    ? TESTNET_AGGREGATOR
    : AGGREGATOR_REPLACEMENT;

  let fixed = url;
  if (fixed.includes(TESTNET_AGGREGATOR)) {
    fixed = fixed.replace(TESTNET_AGGREGATOR, targetAggregator);
  } else if (fixed.includes(AGGREGATOR_DOMAIN)) {
    fixed = fixed.replace(AGGREGATOR_DOMAIN, targetAggregator);
  }

  return fixed;
};

export default function WatchPage() {
  const params = useParams();
  const videoId = params.id as string;
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();

  const [video, setVideo] = useState<any | null>(null);
  const [creator, setCreator] = useState<any | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [allVideos, setAllVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extend storage state
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extending, setExtending] = useState(false);
  const [epochs, setEpochs] = useState(5);
  const [extendError, setExtendError] = useState<string | null>(null);
  const [extendSuccess, setExtendSuccess] = useState<string | null>(null);

  // Delete storage state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');

  // Like state
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likingInProgress, setLikingInProgress] = useState(false);

  // Comments state
  const [comments, setComments] = useState<any[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [donationAmount, setDonationAmount] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  // Blob IDs section state
  const [showBlobIds, setShowBlobIds] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch current video
        const videoResponse = await fetch(`/api/v1/videos/${videoId}`);

        if (!videoResponse.ok) {
          if (videoResponse.status === 404) {
            setError('Video not found');
          } else {
            setError('Failed to load video');
          }
          setLoading(false);
          return;
        }

        const videoData = await videoResponse.json();

        if (videoData.video) {
          setVideo(videoData.video);

          // Fetch creator profile data
          if (videoData.video.creatorId) {
            try {
              const creatorResponse = await fetch(`/api/v1/profile/${videoData.video.creatorId}`);
              if (creatorResponse.ok) {
                const creatorData = await creatorResponse.json();
                setCreator(creatorData.profile);
                setIsSubscribed(creatorData.isSubscribed || false);
              }
            } catch (err) {
              console.error('Error fetching creator profile:', err);
              // Continue even if creator fetch fails
            }
          }
        } else {
          setError('Video not available');
          setLoading(false);
          return;
        }

        // Fetch all videos for recommendations
        const videosResponse = await fetch('/api/v1/videos?limit=50');
        if (videosResponse.ok) {
          const videosData = await videosResponse.json();
          setAllVideos(videosData.videos || []);
        }

        // Fetch like status and count
        try {
          const userId = account?.address || '';
          const likeResponse = await fetch(`/api/v1/videos/${videoId}/like?userId=${userId}`);
          if (likeResponse.ok) {
            const likeData = await likeResponse.json();
            setLiked(likeData.liked);
            setLikeCount(likeData.likeCount);
          }
        } catch (err) {
          console.error('Error fetching like status:', err);
          // Continue even if like fetch fails
        }

        // Fetch comments
        try {
          const commentsResponse = await fetch(`/api/v1/videos/${videoId}/comments`);
          if (commentsResponse.ok) {
            const commentsData = await commentsResponse.json();
            setComments(commentsData.comments || []);
          }
        } catch (err) {
          console.error('Error fetching comments:', err);
          // Continue even if comments fetch fails
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load video');
        setLoading(false);
      }
    };

    fetchData();
  }, [videoId, account?.address]);

  // Handler for batch extend
  const handleExtendStorage = async () => {
    if (!account?.address || !video) {
      setExtendError('Please connect your wallet');
      return;
    }

    if (account.address !== video.creatorId) {
      setExtendError('Only the video creator can extend storage');
      return;
    }

    setExtending(true);
    setExtendError(null);
    setExtendSuccess(null);

    try {
      console.log('[Watch] Requesting batch extend transaction...');

      // Step 1: Get extend transaction details from API
      const res = await fetch(`/api/v1/videos/${videoId}/extend`, {
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

      const extendResponse = await res.json();
      console.log('[Watch] Extend response:', extendResponse);

      // Step 2: Execute batch extend client-side
      const { batchExtendBlobs } = await import('@/lib/walrus-batch-extend-client');

      const result = await batchExtendBlobs({
        blobObjectIds: extendResponse.blobObjectIds,
        epochs: extendResponse.epochs,
        signAndExecuteTransaction: signAndExecute,
        walletAddress: account.address,
      });

      console.log('[Watch] ✅ Batch extend complete:', result);

      // Step 3: Fetch actual end epoch from blockchain (source of truth)
      let actualEndEpoch = (video.masterEndEpoch || 0) + epochs; // Default calculation

      try {
        // Import getBlobMetadata to fetch from blockchain
        const { getBlobMetadata } = await import('@/lib/walrus-manage-client');

        // Use the master blob's object ID to verify the new epoch
        if (extendResponse.blobObjectIds && extendResponse.blobObjectIds.length > 0) {
          const masterBlobId = extendResponse.blobObjectIds[0];
          console.log('[Watch] Fetching actual end epoch from blockchain for blob:', masterBlobId);

          const blobMetadata = await getBlobMetadata(masterBlobId);
          actualEndEpoch = blobMetadata.endEpoch;

          console.log('[Watch] ✅ Actual end epoch from blockchain:', actualEndEpoch);
        }
      } catch (blockchainError) {
        console.warn('[Watch] Could not fetch from blockchain, using calculated value:', blockchainError);
        // Continue with calculated value
      }

      // Step 4: Finalize - update database with actual blockchain epoch
      try {
        const finalizeRes = await fetch(`/api/v1/videos/${videoId}/extend/finalize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            digest: result.digest,
            newEndEpoch: actualEndEpoch, // Use actual epoch from blockchain
            creatorId: account.address,
          }),
        });

        if (finalizeRes.ok) {
          console.log('[Watch] ✅ Database updated with new end epoch:', actualEndEpoch);

          // Update local state to show new epoch immediately (no reload needed)
          setVideo({
            ...video,
            masterEndEpoch: actualEndEpoch,
          });
        } else {
          console.warn('[Watch] ⚠️ Failed to update database, but blockchain extend succeeded');
        }
      } catch (finalizeError) {
        console.error('[Watch] Finalize error:', finalizeError);
        // Don't fail the whole operation if finalize fails - blockchain extend succeeded
      }

      setExtendSuccess(
        `Successfully extended ${result.blobCount} blobs for ${result.epochs} epochs! ` +
        `New end epoch: ${actualEndEpoch}. Total cost: ${result.totalCostWal} WAL.`
      );

      // Close modal after 2 seconds to show updated epoch in modal
      setTimeout(() => {
        setShowExtendModal(false);
        setExtendError(null);
        setExtendSuccess(null);
      }, 3000);

    } catch (err) {
      console.error('[Watch] Extend error:', err);
      setExtendError(err instanceof Error ? err.message : 'Failed to extend storage');
    } finally {
      setExtending(false);
    }
  };

  // Handler for delete video
  const handleDeleteVideo = async () => {
    if (!account?.address || !video) {
      setDeleteError('Please connect your wallet');
      return;
    }

    if (account.address !== video.creatorId) {
      setDeleteError('Only the video creator can delete this video');
      return;
    }

    if (confirmText !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm');
      return;
    }

    setDeleting(true);
    setDeleteError(null);
    setDeleteSuccess(null);

    try {
      console.log('[Watch] Requesting delete transaction...');

      // Step 1: Get delete transaction from API
      const res = await fetch(`/api/v1/videos/${videoId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: account.address,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to get delete transaction');
      }

      const deleteResponse = await res.json();
      console.log('[Watch] Delete response:', deleteResponse);

      // Step 2: Sign and execute delete transaction
      const { Transaction } = await import('@mysten/sui/transactions');
      const result = await signAndExecute({
        transaction: Transaction.from(deleteResponse.unsignedTransaction),
      });

      console.log('[Watch] ✅ Delete transaction complete:', result.digest);

      // Step 3: Wait for transaction confirmation
      await suiClient.waitForTransaction({ digest: result.digest });

      // Step 4: Finalize deletion - remove from database
      const finalizeRes = await fetch(`/api/v1/videos/${videoId}/delete/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionDigest: result.digest,
          creatorId: account.address,
        }),
      });

      if (!finalizeRes.ok) {
        const finalizeError = await finalizeRes.json();
        throw new Error(finalizeError.error || 'Failed to finalize deletion');
      }

      console.log('[Watch] ✅ Video deleted successfully from database');

      setDeleteSuccess('Video deleted successfully! Redirecting to home...');

      // Redirect to home after 2 seconds
      setTimeout(() => {
        window.location.href = '/home';
      }, 2000);

    } catch (err) {
      console.error('[Watch] Delete error:', err);
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete video');
    } finally {
      setDeleting(false);
    }
  };

  // Handler for like toggle
  const handleToggleLike = async () => {
    if (!account?.address) {
      alert('Please connect your wallet to like videos');
      return;
    }

    if (likingInProgress) return;

    setLikingInProgress(true);

    // Optimistic update
    const wasLiked = liked;
    const prevCount = likeCount;
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);

    try {
      const res = await fetch(`/api/v1/videos/${videoId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: account.address,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to toggle like');
      }

      const data = await res.json();

      // Update with server response
      setLiked(data.liked);
      setLikeCount(data.likeCount);

      console.log(`[Watch] ${data.liked ? 'Liked' : 'Unliked'} video`);

    } catch (err) {
      console.error('[Watch] Like error:', err);
      // Revert optimistic update on error
      setLiked(wasLiked);
      setLikeCount(prevCount);
      alert('Failed to update like. Please try again.');
    } finally {
      setLikingInProgress(false);
    }
  };

  // Handler for posting comments
  const handlePostComment = async () => {
    if (!account?.address) {
      alert('Please connect your wallet to comment');
      return;
    }

    if (!commentInput.trim()) {
      alert('Please enter a comment');
      return;
    }

    if (commentInput.length > 1000) {
      alert('Comment cannot exceed 1000 characters');
      return;
    }

    setPostingComment(true);

    try {
      let txDigest: string | undefined;
      let chain: string | undefined;
      const donationAmountMist = donationAmount ? (parseFloat(donationAmount) * 1_000_000_000).toString() : "0";

      // Step 1: If donation provided, execute payment transaction first
      if (donationAmount && parseFloat(donationAmount) > 0) {
        console.log('[Watch] Processing donation payment...');

        const { Transaction } = await import('@mysten/sui/transactions');
        const tx = new Transaction();
        tx.setSender(account.address);

        // Split coins and transfer to creator
        const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(donationAmountMist)]);
        tx.transferObjects([coin], tx.pure.address(video.creatorId));

        const result = await signAndExecute({
          transaction: tx,
        });

        if (!result.digest) {
          throw new Error('Donation transaction failed');
        }

        txDigest = result.digest;
        chain = 'sui'; // TODO: Make this dynamic based on network
        console.log('[Watch] ✅ Donation payment successful:', result.digest);
      }

      // Step 2: Sign the comment with user's wallet
      const messageBytes = new TextEncoder().encode(commentInput.trim());

      console.log('[Watch] Requesting signature for comment...');
      const { signature } = await signPersonalMessage({
        message: messageBytes,
      });

      console.log('[Watch] Comment signed successfully');

      // Step 3: Post comment with signature and optional donation
      const res = await fetch(`/api/v1/videos/${videoId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: account.address,
          content: commentInput.trim(),
          signature,
          donationAmount: donationAmountMist,
          txDigest,
          chain,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to post comment');
      }

      const data = await res.json();

      // Add new comment to the list (sorted by backend)
      setComments([data.comment, ...comments]);
      setCommentInput('');
      setDonationAmount('');

      const successMsg = donationAmount && parseFloat(donationAmount) > 0
        ? `Comment posted with ${donationAmount} SUI donation!`
        : 'Comment posted successfully!';
      console.log('[Watch]', successMsg);

    } catch (err) {
      console.error('[Watch] Comment error:', err);
      alert(err instanceof Error ? err.message : 'Failed to post comment. Please try again.');
    } finally {
      setPostingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen relative bg-gradient-to-br from-[#00579B] via-[#0B79B0] to-[#1AAACE] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white font-semibold text-lg">Loading video...</p>
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="w-full min-h-screen relative bg-gradient-to-br from-[#00579B] via-[#0B79B0] to-[#1AAACE] flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {error || 'Video not found'}
          </h2>
          <p className="text-white/80 mb-6">
            This video may have been removed or the link is incorrect.
          </p>
          <Link
            href="/home"
            className="inline-block px-6 py-3 bg-white text-black font-semibold rounded-[32px] shadow-[3px_3px_0_0_rgba(0,0,0,1)] outline outline-2 outline-black hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Helper function to format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 30) return `${diffInDays} days ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
  };

  // Filter videos by section (excluding current video)
  const otherVideos = allVideos.filter(v => v.id !== videoId);

  return (
    <div className="w-full min-h-screen bg-[#0668A6]">
      {/* Main Content */}
      <div className="pl-20 pr-12 pt-12 pb-4 flex flex-col justify-start items-start gap-0">
        {/* Top Row - Video Player and Recommended Videos */}
        <div className="w-full flex justify-start items-start gap-6">
          {/* Left - Video Player */}
          <div className="flex-1">
            <div className="w-full max-w-[970px] rounded-[32px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] border-[3px] border-black overflow-hidden bg-black">
              <CustomVideoPlayer
                videoId={video.id}
                videoUrl={video.walrusMasterUri}
                network={video.network || 'mainnet'}
                title={video.title}
                autoplay={false}
                posterUrl={video.poster || (video.posterWalrusUri ? fixWalrusUrl(video.posterWalrusUri, video.network || 'mainnet') : undefined)}
                encryptionType={video.encryptionType || 'per-video'}
                channelId={video.sealObjectId}
                creatorAddress={video.creatorId}
                creatorName={creator?.name}
                channelPrice={creator?.channelPrice}
                channelChain={creator?.channelChain}
              />
            </div>
          </div>

          {/* Right - Category Tabs and Recommended Videos */}
          <div className="w-80 flex flex-col justify-start items-start gap-4">
            {/* Category Tabs */}
            <div className="w-full flex flex-wrap justify-start items-center gap-2">
              <div className="px-4 py-2 bg-black rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-white flex justify-start items-center gap-2.5">
                <div className="justify-start text-white text-base font-semibold font-['Outfit']">All</div>
              </div>
              <div className="px-4 py-2 bg-gradient-to-br from-sky-700 via-sky-700 to-cyan-500 rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black flex justify-start items-center gap-2.5">
                <div className="justify-start text-white text-base font-semibold font-['Outfit']">Live</div>
              </div>
              <div className="px-4 py-2 bg-gradient-to-br from-sky-700 via-sky-700 to-cyan-500 rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black flex justify-start items-center gap-2.5">
                <div className="justify-start text-white text-base font-semibold font-['Outfit']">Memes</div>
              </div>
              <div className="px-4 py-2 bg-gradient-to-br from-sky-700 via-sky-700 to-cyan-500 rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black flex justify-start items-center gap-2.5">
                <div className="justify-start text-white text-base font-semibold font-['Outfit']">Gaming</div>
              </div>
            </div>

            {/* Recommended Videos Container */}
            <div className="w-full flex flex-col justify-start items-start gap-3 pt-4">
              {/* Demo Cards */}
              {[1, 2, 3, 4, 5, 6].map((index) => (
                <div key={index} className="w-full p-2.5 bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black inline-flex flex-col justify-start items-start gap-2.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1.00)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer">
                  <div className="self-stretch inline-flex justify-center items-center gap-2">
                    <Image
                      className="w-32 h-24 rounded-lg shadow-[1.4795299768447876px_1.4795299768447876px_0px_0px_rgba(0,0,0,1.00)] border-1 border-black object-cover"
                      src="https://i.imgur.com/pkTKVOL.png"
                      alt="Video thumbnail"
                      width={136}
                      height={96}
                    />
                    <div className="inline-flex flex-col justify-start items-start gap-2">
                      <div className="self-stretch inline-flex justify-between items-start">
                        <div className="justify-start text-black text-sm font-semibold font-['Outfit'] [text-shadow:_0px_3px_5px_rgb(0_0_0_/_0.25)]">Walrus</div>
                        <div className="w-5 h-5 relative overflow-hidden">
                          <div className="w-[3.20px] h-3 left-[8px] top-[3.20px] absolute bg-black" />
                        </div>
                      </div>
                      <div className="self-stretch inline-flex justify-start items-end gap-4">
                        <div className="inline-flex flex-col justify-start items-start gap-2">
                          <div className="justify-start text-black text-base font-bold font-['Outfit']">Walrus Haulout Hackathon</div>
                          <div className="self-stretch inline-flex justify-start items-start gap-1">
                            <div className="justify-start text-black text-xs font-medium font-['Outfit']">533 views</div>
                            <div className="justify-start text-black text-xs font-medium font-['Outfit'] tracking-tight">•3 years ago</div>
                          </div>
                        </div>
                        <div className="flex justify-start items-center">
                          <div className="inline-flex flex-col justify-start items-start gap-[2.94px]">
                            <div className="justify-start text-black text-base font-semibold font-['Outfit']">1</div>
                          </div>
                          <Image src="/logos/sui-logo.png" alt="SUI" width={16} height={16} className="object-contain" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Creator Info and Actions Row */}
        <div className="w-full flex justify-start items-start gap-6 -mt-53">
          <div className="flex-1 max-w-[970px]">
            <div className="w-full inline-flex justify-between items-center">
              <div className="flex justify-start items-center gap-4">
                {/* Profile Picture - Clickable */}
                {creator ? (
                  <Link href={`/profile/${video.creatorId}`} className="w-16 h-16 relative block">
                    {creator.avatar ? (
                      <img
                        className="w-16 h-16 rounded-full border-2 border-black object-cover"
                        src={creator.avatar}
                        alt={creator.name}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full border-2 border-black bg-gradient-to-br from-walrus-mint to-walrus-grape flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </Link>
                ) : (
                  <div className="w-16 h-16 rounded-full border-2 border-black bg-gradient-to-br from-walrus-mint to-walrus-grape flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}

                {/* Name and Subscribers - Clickable */}
                <div className="flex flex-col justify-start items-start gap-1">
                  {creator ? (
                    <Link href={`/profile/${video.creatorId}`} className="text-black text-xl font-bold font-['Outfit'] hover:text-walrus-grape transition-colors">
                      {creator.name}
                    </Link>
                  ) : (
                    <div className="text-black text-xl font-bold font-['Outfit']">
                      {video.creatorId ? `${video.creatorId.slice(0, 6)}...${video.creatorId.slice(-4)}` : 'Anonymous'}
                    </div>
                  )}
                  <div className="text-black text-sm font-normal font-['Outfit']">
                    {creator ? `${creator.subscriberCount} ${creator.subscriberCount === 1 ? 'Subscriber' : 'Subscribers'}` : '0 Subscribers'}
                  </div>
                </div>

                {/* Subscribe Button - Shows subscription status */}
                {isSubscribed ? (
                  <div className="px-6 py-2.5 bg-[#97F0E5] rounded-[32px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black inline-flex justify-center items-center gap-2">
                    <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div className="text-black text-base font-bold font-['Outfit']">Subscribed</div>
                  </div>
                ) : (
                  <Link
                    href={`/profile/${video.creatorId}`}
                    className="px-6 py-2.5 bg-white rounded-[32px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black inline-flex justify-center items-center cursor-pointer hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1.00)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                  >
                    <div className="text-black text-base font-bold font-['Outfit']">Subscribe</div>
                  </Link>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-start items-center gap-3">
                {/* Like Button */}
                <button
                  onClick={handleToggleLike}
                  disabled={likingInProgress}
                  className={`w-12 h-12 rounded-full shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black inline-flex justify-center items-center cursor-pointer hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1.00)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all disabled:opacity-50 disabled:cursor-not-allowed ${liked ? 'bg-[#EF4330]' : 'bg-white'}`}
                  title={liked ? `${likeCount} likes` : `${likeCount} likes - Click to like`}
                >
                  {liked ? (
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                  )}
                </button>

                {/* Bookmark Button */}
                <div className="w-12 h-12 bg-white rounded-full shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black inline-flex justify-center items-center cursor-pointer hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1.00)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all">
                  <svg className="w-6 h-6 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>

                {/* Tip Button */}
                <div className="w-12 h-12 bg-white rounded-full shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black inline-flex justify-center items-center gap-1 cursor-pointer hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1.00)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all">
                  <span className="text-black text-base font-semibold font-['Outfit']">5</span>
                  <Image src="/logos/sui-logo.png" alt="SUI" width={16} height={16} className="object-contain" />
                </div>

                {/* Creator Action Buttons - Only visible to video owner */}
                {account?.address === video.creatorId && (
                  <>
                    {/* Extend Storage Button */}
                    <button
                      onClick={() => setShowExtendModal(true)}
                      className="px-4 py-2 bg-[#1AAACE] text-white font-bold rounded-[32px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black inline-flex items-center gap-2 cursor-pointer hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1.00)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-['Outfit']">Extend Storage</span>
                    </button>

                    {/* Delete Video Button */}
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="px-4 py-2 bg-[#EF4330] text-white font-bold rounded-[32px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black inline-flex items-center gap-2 cursor-pointer hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1.00)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span className="text-sm font-['Outfit']">Delete Video</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="w-80"></div>
        </div>

        {/* Description Section - Left Side Only */}
        <div className="w-full flex justify-start items-start gap-6 mt-6">
          <div className="flex-1 max-w-[970px]">
            <div className="w-full p-6 bg-[#F5F0E8] rounded-[32px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] border-[3px] border-black flex flex-col justify-start items-start gap-3">
              <div className="text-black text-xl font-bold font-['Outfit']">Description</div>
              <div className="text-black text-base font-normal font-['Outfit']">No Description was provided....</div>
            </div>
          </div>
          <div className="w-80"></div>
        </div>

        {/* Blob IDs Section - Only visible to creator */}
        {account?.address === video.creatorId && video.network === 'mainnet' && (
          <div className="w-full flex justify-start items-start gap-6 mt-6">
            <div className="flex-1 max-w-[970px]">
              <div className="w-full p-6 bg-[#F5F0E8] rounded-[32px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] border-[3px] border-black flex flex-col justify-start items-start gap-3">
                <button
                  onClick={() => setShowBlobIds(!showBlobIds)}
                  className="w-full flex justify-between items-center cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <div className="text-black text-xl font-bold font-['Outfit']">Storage Blob IDs (Mainnet)</div>
                  </div>
                  <svg className={`w-6 h-6 text-black transition-transform ${showBlobIds ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showBlobIds && (
                  <div className="w-full flex flex-col gap-4">
                    <p className="text-sm text-black/70 font-['Outfit']">
                      All Walrus blob object IDs for this video. Click any ID to view on Sui Explorer.
                    </p>

                    {/* Master Playlist */}
                    {video.masterBlobObjectId && (
                      <div className="p-4 bg-white rounded-2xl border-2 border-black flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <div className="px-2 py-1 bg-[#1AAACE] rounded-full">
                            <span className="text-white text-xs font-bold font-['Outfit']">MASTER</span>
                          </div>
                          <span className="text-sm font-semibold text-black font-['Outfit']">HLS Master Playlist</span>
                        </div>
                        <a
                          href={`https://suiscan.xyz/mainnet/object/${video.masterBlobObjectId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-mono text-[#0668A6] hover:text-[#1AAACE] break-all font-['Outfit']"
                        >
                          {video.masterBlobObjectId}
                        </a>
                        <div className="text-xs text-black/60 font-['Outfit']">
                          End Epoch: {video.masterEndEpoch || 'Unknown'}
                        </div>
                      </div>
                    )}

                    {/* Poster Image */}
                    {video.posterBlobObjectId && (
                      <div className="p-4 bg-white rounded-2xl border-2 border-black flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <div className="px-2 py-1 bg-[#EF4330] rounded-full">
                            <span className="text-white text-xs font-bold font-['Outfit']">POSTER</span>
                          </div>
                          <span className="text-sm font-semibold text-black font-['Outfit']">Thumbnail Image</span>
                        </div>
                        <a
                          href={`https://suiscan.xyz/mainnet/object/${video.posterBlobObjectId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-mono text-[#0668A6] hover:text-[#1AAACE] break-all font-['Outfit']"
                        >
                          {video.posterBlobObjectId}
                        </a>
                        <div className="text-xs text-black/60 font-['Outfit']">
                          End Epoch: {video.posterEndEpoch || 'Unknown'}
                        </div>
                      </div>
                    )}

                    {/* Renditions */}
                    {video.renditions && video.renditions.length > 0 && (
                      <div className="flex flex-col gap-3">
                        <div className="text-base font-bold text-black font-['Outfit']">
                          Renditions ({video.renditions.length})
                        </div>
                        {video.renditions.map((rendition: any) => (
                          <div key={rendition.id} className="p-4 bg-white rounded-2xl border-2 border-black flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                              <div className="px-2 py-1 bg-gradient-to-br from-walrus-mint to-walrus-grape rounded-full">
                                <span className="text-white text-xs font-bold font-['Outfit']">{rendition.name.toUpperCase()}</span>
                              </div>
                              <span className="text-sm font-semibold text-black font-['Outfit']">
                                {rendition.resolution} ({rendition.segmentCount} segments)
                              </span>
                            </div>

                            {/* Playlist Blob */}
                            {rendition.playlistBlobObjectId && (
                              <div className="ml-4 flex flex-col gap-1">
                                <span className="text-xs font-semibold text-black/70 font-['Outfit']">Playlist:</span>
                                <a
                                  href={`https://suiscan.xyz/mainnet/object/${rendition.playlistBlobObjectId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-mono text-[#0668A6] hover:text-[#1AAACE] break-all font-['Outfit']"
                                >
                                  {rendition.playlistBlobObjectId}
                                </a>
                                <div className="text-xs text-black/60 font-['Outfit']">
                                  End Epoch: {rendition.playlistEndEpoch || 'Unknown'}
                                </div>
                              </div>
                            )}

                            {/* Segments */}
                            <details className="ml-4">
                              <summary className="text-xs font-semibold text-black/70 font-['Outfit'] cursor-pointer hover:text-black">
                                View {rendition.segmentCount} segments
                              </summary>
                              <div className="mt-2 flex flex-col gap-2 max-h-64 overflow-y-auto">
                                {rendition.segments.map((segment: any) => (
                                  segment.blobObjectId && (
                                    <div key={segment.segIdx} className="p-2 bg-[#FFEEE5] rounded-lg">
                                      <div className="text-xs text-black/60 font-['Outfit'] mb-1">
                                        Segment {segment.segIdx} ({segment.duration.toFixed(2)}s, {(segment.size / 1024).toFixed(1)} KB)
                                      </div>
                                      <a
                                        href={`https://suiscan.xyz/mainnet/object/${segment.blobObjectId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs font-mono text-[#0668A6] hover:text-[#1AAACE] break-all font-['Outfit']"
                                      >
                                        {segment.blobObjectId}
                                      </a>
                                      <div className="text-xs text-black/60 font-['Outfit'] mt-1">
                                        End Epoch: {segment.endEpoch || 'Unknown'}
                                      </div>
                                    </div>
                                  )
                                ))}
                              </div>
                            </details>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="p-3 bg-gradient-to-br from-[#1AAACE]/10 to-[#0668A6]/10 rounded-xl border-2 border-[#1AAACE]/30">
                      <p className="text-xs text-black/70 font-['Outfit']">
                        💡 <strong>Tip:</strong> These blob IDs can be used to verify storage on Walrus and track expiration epochs. Each link opens the Sui Explorer for on-chain verification.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="w-80"></div>
          </div>
        )}

        {/* Black divider line */}
        <div className="w-full h-[2px] bg-black mt-6"></div>

        {/* Comments Section - Full Width */}
        <div className="w-full mt-6">
          <div className="w-full p-4 bg-[#F5F0E8] rounded-2xl shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black inline-flex flex-col justify-start items-start gap-2.5">
              <div className="self-stretch inline-flex justify-between items-end">
                <div className="justify-start text-black text-2xl font-semibold font-['Outfit']">Comments</div>
                <div className="justify-start text-black text-sm font-semibold font-['Outfit']">{comments.length} comment{comments.length !== 1 ? 's' : ''}</div>
              </div>

              {/* Comment Input */}
              <div className="w-full p-4 bg-white rounded-2xl outline outline-[3px] outline-offset-[-3px] outline-black flex flex-col gap-3">
                <textarea
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder={account?.address ? "Add a comment..." : "Connect wallet to comment"}
                  disabled={!account?.address || postingComment}
                  maxLength={1000}
                  rows={3}
                  className="w-full px-3 py-2 border-2 border-black/20 rounded-xl font-['Outfit'] text-black placeholder-black/50 resize-none focus:outline-none focus:border-[#1AAACE] disabled:opacity-50 disabled:cursor-not-allowed"
                />

                {/* Donation Input */}
                <div className="flex items-center gap-3">
                  <label className="text-sm font-semibold text-black font-['Outfit']">
                    💰 Donate (Optional):
                  </label>
                  <input
                    type="number"
                    value={donationAmount}
                    onChange={(e) => setDonationAmount(e.target.value)}
                    placeholder="0.00"
                    disabled={!account?.address || postingComment}
                    min="0"
                    step="0.01"
                    className="w-32 px-3 py-1.5 border-2 border-black/20 rounded-lg font-['Outfit'] text-black placeholder-black/50 focus:outline-none focus:border-[#1AAACE] disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="text-sm text-black/70 font-['Outfit']">SUI</span>
                  <span className="text-xs text-black/50 font-['Outfit']">(Higher donations = better visibility)</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-black/60 font-['Outfit']">
                    {commentInput.length}/1000 characters
                  </span>
                  <button
                    onClick={handlePostComment}
                    disabled={!account?.address || postingComment || !commentInput.trim()}
                    className="px-6 py-2 bg-[#1AAACE] text-white font-bold rounded-[32px] shadow-[3px_3px_0_0_rgba(0,0,0,1)] outline outline-2 outline-black hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-['Outfit']"
                  >
                    {postingComment ? 'Posting...' : (donationAmount && parseFloat(donationAmount) > 0 ? `Donate & Comment` : 'Post Comment')}
                  </button>
                </div>
              </div>

              {/* Comments List */}
              <div className="self-stretch flex flex-col justify-start items-start gap-3">
                {comments.length === 0 ? (
                  <div className="w-full p-8 bg-white rounded-2xl outline outline-[3px] outline-offset-[-3px] outline-black flex flex-col items-center justify-center gap-2">
                    <svg className="w-12 h-12 text-black/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-black/50 font-semibold font-['Outfit']">No comments yet</p>
                    <p className="text-black/40 text-sm font-['Outfit']">Be the first to comment!</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="self-stretch p-4 bg-white rounded-2xl outline outline-[3px] outline-offset-[-3px] outline-black flex flex-col justify-start items-start gap-2.5">
                      <div className="self-stretch inline-flex justify-start items-center gap-5">
                        <div className="w-10 inline-flex flex-col justify-start items-end gap-[5px]">
                          <div className="self-stretch h-10 relative">
                            {comment.userAvatar ? (
                              <img
                                className="w-10 h-10 rounded-full object-cover border-2 border-black"
                                src={comment.userAvatar}
                                alt={comment.userName || 'User'}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full border-2 border-black bg-gradient-to-br from-walrus-mint to-walrus-grape flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 inline-flex flex-col justify-start items-start gap-2.5">
                          <div className="self-stretch inline-flex items-center gap-2">
                            <div className="justify-start text-black text-xl font-semibold font-['Outfit']">
                              {comment.userName ? `From @${comment.userName}` : `${comment.userId.slice(0, 6)}...${comment.userId.slice(-4)}`}
                            </div>
                            {comment.donationAmount && comment.donationAmount !== "0" && (
                              <div className="px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full inline-flex items-center gap-1" title={`Donated ${Number(comment.donationAmount) / 1_000_000_000} SUI`}>
                                <span className="text-white text-xs font-bold font-['Outfit']">
                                  💰 {Number(comment.donationAmount) / 1_000_000_000} SUI
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="self-stretch justify-start text-black text-base font-normal font-['Outfit'] whitespace-pre-wrap break-words">
                            {comment.content}
                          </div>
                        </div>
                      </div>
                      <div className="self-stretch inline-flex justify-between items-center gap-2">
                        <div className="justify-start text-black text-xs font-medium font-['Outfit']">
                          {formatTimeAgo(comment.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
        </div>
      </div>

      {/* Extend Storage Modal */}
      {showExtendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowExtendModal(false)}>
          <div className="bg-white rounded-[32px] shadow-[5px_5px_0_0_rgba(0,0,0,1)] outline outline-[3px] outline-black p-8 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-black mb-4 font-['Outfit']">Extend Storage</h2>

            {/* Current storage info */}
            {video.masterEndEpoch && (
              <div className="mb-6 p-4 bg-[#FFEEE5] rounded-2xl border-2 border-black">
                <p className="text-sm text-black font-semibold mb-1 font-['Outfit']">Current End Epoch:</p>
                <p className="text-lg text-black font-bold font-['Outfit']">{video.masterEndEpoch}</p>
                <p className="text-xs text-black/70 mt-2 font-['Outfit']">(1 epoch ≈ 14 days on mainnet)</p>
              </div>
            )}

            {/* Epochs input */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-black mb-2 font-['Outfit']">
                Extend by epochs:
              </label>
              <input
                type="number"
                value={epochs}
                onChange={(e) => setEpochs(parseInt(e.target.value) || 1)}
                min={1}
                max={100}
                className="w-full px-4 py-3 border-2 border-black rounded-xl font-['Outfit'] text-black"
              />
              <p className="text-xs text-black/70 mt-2 font-['Outfit']">
                This will extend all {video.blobCount || '450+'} blobs in a single transaction
              </p>
            </div>

            {/* Error message */}
            {extendError && (
              <div className="mb-4 p-4 bg-red-100 rounded-xl border-2 border-red-600">
                <p className="text-sm text-red-800 font-['Outfit']">{extendError}</p>
              </div>
            )}

            {/* Success message */}
            {extendSuccess && (
              <div className="mb-4 p-4 bg-green-100 rounded-xl border-2 border-green-600">
                <p className="text-sm text-green-800 font-['Outfit']">{extendSuccess}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowExtendModal(false)}
                disabled={extending}
                className="flex-1 px-6 py-3 bg-white text-black font-bold rounded-[32px] shadow-[3px_3px_0_0_rgba(0,0,0,1)] outline outline-2 outline-black hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-['Outfit']"
              >
                Cancel
              </button>
              <button
                onClick={handleExtendStorage}
                disabled={extending}
                className="flex-1 px-6 py-3 bg-[#1AAACE] text-white font-bold rounded-[32px] shadow-[3px_3px_0_0_rgba(0,0,0,1)] outline outline-2 outline-black hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-['Outfit']"
              >
                {extending ? 'Extending...' : 'Extend Storage'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Video Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white rounded-[32px] shadow-[5px_5px_0_0_rgba(0,0,0,1)] outline outline-[3px] outline-black p-8 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[#EF4330] rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-black font-['Outfit']">Delete Video</h2>
            </div>

            <div className="mb-6 p-4 bg-red-50 rounded-2xl border-2 border-red-200">
              <p className="text-base text-black mb-2 font-['Outfit']">
                You are about to delete: <span className="font-bold">{video.title}</span>
              </p>
              <p className="text-sm text-[#EF4330] font-bold mb-2 font-['Outfit']">
                ⚠️ This action is permanent and cannot be undone!
              </p>
              <ul className="text-sm text-black/70 space-y-1 list-disc list-inside font-['Outfit']">
                <li>Video will be removed from Walrus storage</li>
                <li>All associated data will be deleted</li>
                <li>You will receive a storage rebate in SUI</li>
              </ul>
            </div>

            {/* Confirmation input */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-black mb-2 font-['Outfit']">
                Type <span className="text-[#EF4330] font-mono">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE here"
                disabled={deleting}
                className="w-full px-4 py-3 border-2 border-black rounded-xl font-['Outfit'] text-black placeholder-black/50 focus:outline-none focus:ring-2 focus:ring-[#EF4330]"
              />
            </div>

            {/* Error message */}
            {deleteError && (
              <div className="mb-4 p-4 bg-red-100 rounded-xl border-2 border-red-600">
                <p className="text-sm text-red-800 font-['Outfit']">{deleteError}</p>
              </div>
            )}

            {/* Success message */}
            {deleteSuccess && (
              <div className="mb-4 p-4 bg-green-100 rounded-xl border-2 border-green-600">
                <p className="text-sm text-green-800 font-['Outfit']">{deleteSuccess}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setConfirmText('');
                  setDeleteError(null);
                }}
                disabled={deleting}
                className="flex-1 px-6 py-3 bg-white text-black font-bold rounded-[32px] shadow-[3px_3px_0_0_rgba(0,0,0,1)] outline outline-2 outline-black hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-['Outfit']"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteVideo}
                disabled={deleting || confirmText !== 'DELETE'}
                className="flex-1 px-6 py-3 bg-[#EF4330] text-white font-bold rounded-[32px] shadow-[3px_3px_0_0_rgba(0,0,0,1)] outline outline-2 outline-black hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-['Outfit']"
              >
                {deleting ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
