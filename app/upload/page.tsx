'use client';

/**
 * Upload Page V2: Client-Side Encryption
 * Transcode → Encrypt → Upload all in browser
 * Server only stores metadata + encrypted root secret
 */

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { useNetwork } from '@/contexts/NetworkContext';
import { UploadNetworkSwitcher } from '@/components/UploadNetworkSwitcher';
import { usePersonalDelegator } from '@/lib/hooks/usePersonalDelegator';
import { PlatformFeeComparisonDialog } from '@/components/PlatformFeeComparisonDialog';
import { Step2Monetization } from '@/components/upload/Step2Monetization';
import { Step3FeeSharing } from '@/components/upload/Step3FeeSharing';
import { TranscodingProgress } from '@/components/upload/TranscodingProgress';
import { CostEstimateSection } from '@/components/upload/CostEstimateSection';
import type { UploadProgress } from '@/lib/upload/clientUploadOrchestrator';

type RenditionQuality = '1080p' | '720p' | '480p' | '360p';

type FeeConfig = {
  id: string;
  tokenType: string;
  amountPer1000Views: string;
  usdAmountPer1000Views?: string; // Optional USD equivalent
  inputMode?: 'coin' | 'usd'; // Track which input mode user is using
};

type CoinMetadata = {
  decimals: number;
  name: string;
  symbol: string;
  description: string;
  iconUrl: string | null;
};

type CoinPrice = {
  usdPrice: number;
  timestamp: number;
};

type StorageOption = {
  label: string;
  epochs: number;
  category: 'days' | 'months' | 'years';
};

// Generate storage duration options
const generateStorageOptions = (): StorageOption[] => {
  const options: StorageOption[] = [];

  // 1-30 days
  for (let i = 1; i <= 30; i++) {
    options.push({
      label: `${i} ${i === 1 ? 'day' : 'days'}`,
      epochs: i,
      category: 'days',
    });
  }

  // 1-12 months (30 days per month)
  for (let i = 1; i <= 12; i++) {
    options.push({
      label: `${i} ${i === 1 ? 'month' : 'months'}`,
      epochs: i * 30,
      category: 'months',
    });
  }

  // 1, 1.5, 2, 2.5, 3 years (365 days per year)
  const years = [1, 1.5, 2, 2.5, 3];
  years.forEach((year) => {
    options.push({
      label: `${year} ${year === 1 ? 'year' : 'years'}`,
      epochs: Math.round(year * 365),
      category: 'years',
    });
  });

  return options;
};

const STORAGE_OPTIONS = generateStorageOptions();

// Initialize SuiClient for fetching coin metadata
const suiClient = new SuiClient({ url: getFullnodeUrl('mainnet') });

function UploadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const { walrusNetwork } = useNetwork();
  const { buildFundingTransaction, estimateGasNeeded, autoReclaimGas, executeWithDelegator, delegatorAddress } = usePersonalDelegator();

  // State declarations MUST come before useEffects that reference them
  const [debugMode, setDebugMode] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [selectedQualities, setSelectedQualities] = useState<RenditionQuality[]>([
    '1080p',
  ]);
  const [feeConfigs, setFeeConfigs] = useState<FeeConfig[]>([
    {
      id: crypto.randomUUID(),
      tokenType: '0x2::sui::SUI',
      amountPer1000Views: '10',
      inputMode: 'coin',
    },
  ]);
  const [coinMetadataCache, setCoinMetadataCache] = useState<Record<string, CoinMetadata>>({});
  const [coinPriceCache, setCoinPriceCache] = useState<Record<string, CoinPrice>>({});
  const [storageOptionIndex, setStorageOptionIndex] = useState<number>(0); // Index into STORAGE_OPTIONS (default: 1 day) - for mainnet
  const [testnetStorageDays, setTestnetStorageDays] = useState<number>(7); // 1-53 days for testnet (default: 7 days)
  const [referrerSharePercent, setReferrerSharePercent] = useState<number>(30); // 0-90% (platform always takes 10%, default: 30%)
  const [isTranscoding, setIsTranscoding] = useState(false);
  const [transcodingProgress, setTranscodingProgress] = useState<number>(0);
  const [transcodedData, setTranscodedData] = useState<any>(null); // Store transcoded video data
  const [showPlatformFeeDialog, setShowPlatformFeeDialog] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({
    stage: 'transcoding',
    percent: 0,
    message: '',
  });
  const [error, setError] = useState<string | null>(null);

  // Ref for scrolling to page title
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Debug: Log current network
  useEffect(() => {
    console.log('[Upload Page] Current Walrus Network:', walrusNetwork);
  }, [walrusNetwork]);

  // Debug mode: bypass wallet connection
  useEffect(() => {
    const isDebug = searchParams.get('no-wallet-debug') === 'true';
    setDebugMode(isDebug);
    if (isDebug) {
      console.log('[Upload] Debug mode enabled - wallet connection bypassed');
    }
  }, [searchParams]);

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

  // Use real account or debug placeholder
  const effectiveAccount = debugMode
    ? { address: '0x0000000000000000000000000000000000000000000000000000000000000000' }
    : account;

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

  const handleAddFeeConfig = () => {
    setFeeConfigs((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        tokenType: '0x2::sui::SUI',
        amountPer1000Views: '10',
        inputMode: 'coin',
      },
    ]);
  };

  const handleRemoveFeeConfig = (id: string) => {
    setFeeConfigs((prev) => prev.filter((config) => config.id !== id));
  };

  const handleUpdateFeeConfig = (id: string, field: keyof FeeConfig, value: string) => {
    setFeeConfigs((prev) =>
      prev.map((config) =>
        config.id === id ? { ...config, [field]: value } : config
      )
    );
  };

  // Toggle between coin and USD input mode
  const handleToggleInputMode = (id: string) => {
    setFeeConfigs((prev) =>
      prev.map((config) => {
        if (config.id !== id) return config;

        const newMode: 'coin' | 'usd' = config.inputMode === 'coin' ? 'usd' : 'coin';
        const updatedConfig: FeeConfig = { ...config, inputMode: newMode };

        // When switching to USD mode, calculate USD from coin amount
        if (newMode === 'usd') {
          const priceData = coinPriceCache[config.tokenType];
          if (priceData && priceData.usdPrice > 0 && config.amountPer1000Views) {
            const coinNum = parseFloat(config.amountPer1000Views);
            if (!isNaN(coinNum) && coinNum > 0) {
              const usdAmount = coinNum * priceData.usdPrice;
              updatedConfig.usdAmountPer1000Views = usdAmount.toString();
            }
          }
        }
        // When switching to coin mode, calculate coin from USD amount
        else if (newMode === 'coin') {
          const priceData = coinPriceCache[config.tokenType];
          if (priceData && priceData.usdPrice > 0 && config.usdAmountPer1000Views) {
            const usdNum = parseFloat(config.usdAmountPer1000Views);
            if (!isNaN(usdNum) && usdNum > 0) {
              const coinAmount = usdNum / priceData.usdPrice;
              updatedConfig.amountPer1000Views = coinAmount.toString();
            }
          }
        }

        return updatedConfig;
      })
    );
  };

  // Update USD amount and auto-convert to coin amount
  const handleUpdateUsdAmount = (id: string, usdValue: string) => {
    setFeeConfigs((prev) =>
      prev.map((config) => {
        if (config.id !== id) return config;

        // Store USD value
        const updatedConfig = { ...config, usdAmountPer1000Views: usdValue };

        // Convert USD to coin amount if we have the price
        const priceData = coinPriceCache[config.tokenType];
        if (priceData && priceData.usdPrice > 0 && usdValue) {
          const usdNum = parseFloat(usdValue);
          if (!isNaN(usdNum) && usdNum > 0) {
            const coinAmount = usdNum / priceData.usdPrice;
            updatedConfig.amountPer1000Views = coinAmount.toString();
          }
        }

        return updatedConfig;
      })
    );
  };

  // Update coin amount and auto-convert to USD
  const handleUpdateCoinAmount = (id: string, coinValue: string) => {
    setFeeConfigs((prev) =>
      prev.map((config) => {
        if (config.id !== id) return config;

        // Store coin value
        const updatedConfig = { ...config, amountPer1000Views: coinValue };

        // Convert coin to USD if we have the price
        const priceData = coinPriceCache[config.tokenType];
        if (priceData && priceData.usdPrice > 0 && coinValue) {
          const coinNum = parseFloat(coinValue);
          if (!isNaN(coinNum) && coinNum > 0) {
            const usdAmount = coinNum * priceData.usdPrice;
            updatedConfig.usdAmountPer1000Views = usdAmount.toString();
          }
        }

        return updatedConfig;
      })
    );
  };

  // Fetch coin metadata for a token type
  const fetchCoinMetadata = async (tokenType: string) => {
    // Check cache first
    if (coinMetadataCache[tokenType]) {
      return coinMetadataCache[tokenType];
    }

    try {
      const metadata = await suiClient.getCoinMetadata({ coinType: tokenType });
      if (metadata) {
        // Use fallback icon for SUI if metadata doesn't have one
        let iconUrl = metadata.iconUrl;
        if (!iconUrl && tokenType === '0x2::sui::SUI') {
          iconUrl = 'https://imagedelivery.net/cBNDGgkrsEA-b_ixIp9SkQ/sui-coin.svg/public';
        }

        const coinData: CoinMetadata = {
          decimals: metadata.decimals,
          name: metadata.name,
          symbol: metadata.symbol,
          description: metadata.description,
          iconUrl: iconUrl ?? null,
        };

        // Cache the metadata
        setCoinMetadataCache((prev) => ({ ...prev, [tokenType]: coinData }));
        return coinData;
      }
    } catch (error) {
      console.error(`[Coin Metadata] Failed to fetch for ${tokenType}:`, error);
    }

    return null;
  };

  // Fetch coin price for a token type
  const fetchCoinPrice = async (tokenType: string) => {
    // Check cache first (5 min cache)
    const cached = coinPriceCache[tokenType];
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return cached.usdPrice;
    }

    try {
      const response = await fetch(`/api/v1/coin-price/${encodeURIComponent(tokenType)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.price > 0) {
          const priceData: CoinPrice = {
            usdPrice: data.price,
            timestamp: Date.now(),
          };
          setCoinPriceCache((prev) => ({ ...prev, [tokenType]: priceData }));
          return data.price;
        }
      }
    } catch (error) {
      console.error(`[Coin Price] Failed to fetch for ${tokenType}:`, error);
    }

    return 0;
  };

  // Helper to format number without trailing zeros
  const formatNumber = (value: number): string => {
    return value.toFixed(9).replace(/\.?0+$/, '');
  };

  // Fetch metadata and prices for all fee configs when they change
  useEffect(() => {
    feeConfigs.forEach((config) => {
      if (config.tokenType) {
        if (!coinMetadataCache[config.tokenType]) {
          fetchCoinMetadata(config.tokenType);
        }
        if (!coinPriceCache[config.tokenType]) {
          fetchCoinPrice(config.tokenType);
        }
      }
    });
  }, [feeConfigs]);

  // Start transcoding video in background
  const startTranscoding = async () => {
    if (!selectedFile) return;

    setIsTranscoding(true);
    setTranscodingProgress(0);
    setError(null);

    try {
      console.log('[Upload] Starting background transcoding...');

      // Dynamically import transcode function
      const { transcodeVideo } = await import('@/lib/transcode/clientTranscode');

      // Start transcoding with progress callback
      const transcoded = await transcodeVideo(selectedFile, {
        qualities: selectedQualities,
        segmentDuration: 4,
        onProgress: (p) => {
          setTranscodingProgress(p.overall);
        },
      });

      console.log('[Upload] Transcoding complete:', transcoded.segments.length, 'segments');
      setTranscodedData(transcoded);
      setIsTranscoding(false);
    } catch (err) {
      console.error('[Upload] Transcoding error:', err);
      setError(err instanceof Error ? err.message : 'Transcoding failed');
      setIsTranscoding(false);
      setTranscodedData(null);
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1 && selectedFile && title && selectedQualities.length > 0) {
      setCurrentStep(2);
      setError(null);
      // Start transcoding in background when moving to step 2
      startTranscoding();
      // Scroll to page title
      setTimeout(() => {
        titleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } else if (currentStep === 2) {
      setCurrentStep(3);
      setError(null);
      // Scroll to page title
      setTimeout(() => {
        titleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const handleBackStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
      setError(null);
      // Scroll to page title
      setTimeout(() => {
        titleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } else if (currentStep === 3) {
      setCurrentStep(2);
      setError(null);
      // Scroll to page title
      setTimeout(() => {
        titleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  // Get current storage epochs (testnet uses simple day counter, mainnet uses STORAGE_OPTIONS)
  const storageEpochs = walrusNetwork === 'testnet' ? testnetStorageDays : STORAGE_OPTIONS[storageOptionIndex].epochs;

  // Debounced cost estimation - only recalculate after user stops dragging
  useEffect(() => {
    if (!selectedFile || selectedQualities.length === 0) return;

    // Debounce the cost estimation by 300ms
    const timeoutId = setTimeout(() => {
      handleEstimateCost();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [selectedFile, selectedQualities, storageOptionIndex, testnetStorageDays, walrusNetwork]);

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
          // Cap epochs to network-specific maximums (testnet: 53, mainnet: 53)
          epochs: walrusNetwork === 'mainnet' ? storageEpochs : Math.min(storageEpochs, 53),
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
    if (!selectedFile || !effectiveAccount || !title || !costEstimate) return;

    // Move to summary/uploading step
    setCurrentStep(4);
    setIsUploading(true);
    setError(null);

    // Scroll to page title
    setTimeout(() => {
      titleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    try {
      console.log('[Upload V2] Starting client-side upload...');
      if (debugMode) {
        console.log('[Upload V2] Running in DEBUG mode with placeholder wallet');
      }

      // STEP 1: Fund delegator wallet (mainnet only) via PTB
      if (walrusNetwork === 'mainnet' && !debugMode && account) {
        console.log('[Upload V2] Funding delegator wallet with PTB...');

        // Calculate WAL amount in MIST (1 WAL = 1_000_000_000 MIST)
        // Add 50x safety buffer because cost estimator uses simplified formula:
        // - Estimator doesn't use actual Walrus SDK storageCost() calculation
        // - Each blob requires 2 transactions (register + certify)
        // - Poster, playlists, and master playlist uploads (not in estimate)
        // - Encoding overhead (erasure coding expands data 3-5x)
        // - Upload relay tips (40 MIST per KiB of encoded data)
        // - Actual per-blob costs are much higher than approximation
        const estimatedWalMist = BigInt(Math.ceil(parseFloat(costEstimate.totalWal) * 1_000_000_000));
        const walAmountMist = estimatedWalMist * BigInt(50); // 50x buffer for inaccurate estimate

        // Estimate gas needed based on file size (rough calculation)
        const fileSizeMB = selectedFile.size / 1024 / 1024;
        const estimatedSegments = Math.ceil(fileSizeMB / 2) * selectedQualities.length;
        const gasNeeded = estimateGasNeeded(estimatedSegments);

        console.log('[Upload V2] PTB Funding:', {
          estimatedWal: `${parseFloat(costEstimate.totalWal).toFixed(6)} WAL`,
          walAmountWithBuffer: `${Number(walAmountMist) / 1_000_000_000} WAL (50x buffer)`,
          gasAmount: `${Number(gasNeeded) / 1_000_000_000} SUI`,
          segments: estimatedSegments,
        });

        try {
          // Build PTB that funds BOTH SUI and WAL in one transaction
          const fundingTx = await buildFundingTransaction(
            account.address,
            gasNeeded,
            walAmountMist
          );

          if (!fundingTx) {
            throw new Error('Failed to build funding transaction');
          }

          // User signs ONCE to fund both SUI gas + WAL storage
          setProgress({ stage: 'funding', percent: 5, message: 'Approve funding transaction...' });
          console.log('[Upload V2] ⏳ Waiting for user to approve PTB...');

          const fundingResult = await signAndExecuteTransaction({ transaction: fundingTx });

          console.log('[Upload V2] ✓ Delegator funded:', fundingResult.digest);
          setProgress({ stage: 'funding', percent: 10, message: 'Delegator wallet funded!' });
        } catch (fundingError) {
          console.error('[Upload V2] Funding failed:', fundingError);
          throw new Error(`Failed to fund delegator: ${fundingError instanceof Error ? fundingError.message : 'Unknown error'}`);
        }
      }

      // STEP 2: Dynamically import the upload orchestrator to avoid loading WASM during build
      const { uploadVideoClientSide } = await import('@/lib/upload/clientUploadOrchestrator');

      // Determine signer and address based on network
      let effectiveSignAndExecute;
      let effectiveUploadAddress;

      if (debugMode) {
        // Debug mode: mock transaction
        effectiveSignAndExecute = async () => ({ digest: 'debug-transaction-digest' });
        effectiveUploadAddress = effectiveAccount.address;
      } else if (walrusNetwork === 'mainnet') {
        // Mainnet: use delegator wallet (already funded via PTB)
        if (!delegatorAddress || !executeWithDelegator) {
          throw new Error('Delegator wallet not initialized');
        }
        // Wrap executeWithDelegator to match expected signature
        effectiveSignAndExecute = async (args: { transaction: any }) => {
          const result = await executeWithDelegator(args.transaction);
          if (!result) {
            throw new Error('Delegator transaction failed');
          }
          return {
            digest: result.digest,
            effects: result.success ? { status: { status: 'success' } } : { status: { status: 'failure' } },
          };
        };
        effectiveUploadAddress = delegatorAddress;
      } else {
        // Testnet: use user's wallet (free HTTP uploads)
        effectiveSignAndExecute = signAndExecuteTransaction;
        effectiveUploadAddress = effectiveAccount.address;
      }

      // Complete client-side flow: transcode → encrypt → upload
      const result = await uploadVideoClientSide(
        selectedFile,
        selectedQualities,
        effectiveSignAndExecute,
        effectiveUploadAddress,
        {
          network: walrusNetwork, // Dynamic Walrus network from context
          // Cap epochs to network-specific maximums (testnet: 53, mainnet: 53)
          epochs: walrusNetwork === 'mainnet' ? storageEpochs : Math.min(storageEpochs, 53),
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

      // Auto-reclaim unused gas if on mainnet
      if (walrusNetwork === 'mainnet' && account) {
        console.log('[Upload V2] Auto-reclaiming unused gas...');
        await autoReclaimGas(account.address);
      }

      setTimeout(() => {
        router.push(`/watch/${video.id}`);
      }, 1000);
    } catch (err) {
      console.error('[Upload V2] Error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      setIsUploading(false);

      // Auto-reclaim on error too if on mainnet
      if (walrusNetwork === 'mainnet' && account) {
        console.log('[Upload V2] Auto-reclaiming after error...');
        await autoReclaimGas(account.address).catch(console.error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="max-w-2xl">
          <h1 ref={titleRef} className="text-3xl font-bold text-foreground mb-2">
            Upload Video
          </h1>
          <p className="text-text-muted mb-6">
            {currentStep === 1
              ? 'Select your video and configure quality settings'
              : currentStep === 2
              ? 'Set monetization fees for your video'
              : currentStep === 3
              ? 'Configure fee sharing with referrers'
              : 'Review your settings and wait for upload to complete'}
          </p>

          {/* Step Indicator */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                currentStep === 1 ? 'bg-walrus-mint text-walrus-black' : 'bg-walrus-mint/30 text-walrus-mint'
              }`}>
                1
              </div>
              <span className={`text-sm font-medium ${currentStep === 1 ? 'text-foreground' : 'text-text-muted'}`}>
                Video Details
              </span>
            </div>
            <div className="flex-1 h-0.5 bg-border" />
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                currentStep === 2 ? 'bg-walrus-mint text-walrus-black' : currentStep > 2 ? 'bg-walrus-mint/30 text-walrus-mint' : 'bg-background-elevated text-text-muted border-2 border-border'
              }`}>
                2
              </div>
              <span className={`text-sm font-medium ${currentStep === 2 ? 'text-foreground' : 'text-text-muted'}`}>
                Monetization
              </span>
            </div>
            <div className="flex-1 h-0.5 bg-border" />
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                currentStep === 3 ? 'bg-walrus-mint text-walrus-black' : 'bg-background-elevated text-text-muted border-2 border-border'
              }`}>
                3
              </div>
              <span className={`text-sm font-medium ${currentStep === 3 ? 'text-foreground' : 'text-text-muted'}`}>
                Fee Sharing
              </span>
            </div>
          </div>

          {/* Step 1: Video Details */}
          {currentStep === 1 && (
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

              {/* Cost Estimate - Auto-calculated */}
              <CostEstimateSection
                costEstimate={costEstimate}
                isEstimating={isEstimating}
                walrusNetwork={walrusNetwork}
                storageOptionIndex={storageOptionIndex}
                storageOptions={STORAGE_OPTIONS}
                onStorageOptionChange={setStorageOptionIndex}
                testnetStorageDays={testnetStorageDays}
                onTestnetStorageDaysChange={setTestnetStorageDays}
              />

              {/* Next Button */}
              <button
                onClick={handleNextStep}
                disabled={!selectedFile || !title || selectedQualities.length === 0 || !costEstimate}
                className="w-full bg-walrus-mint text-walrus-black py-4 px-6 rounded-lg font-semibold
                  hover:bg-mint-800 disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors"
              >
                Next: Set Monetization
              </button>
            </div>
          )}

          {/* Step 2: Monetization Settings */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <Step2Monetization
                feeConfigs={feeConfigs}
                coinMetadataCache={coinMetadataCache}
                coinPriceCache={coinPriceCache}
                onAddFeeConfig={handleAddFeeConfig}
                onRemoveFeeConfig={handleRemoveFeeConfig}
                onUpdateTokenType={(id, value) => handleUpdateFeeConfig(id, 'tokenType', value)}
                onUpdateCoinAmount={handleUpdateCoinAmount}
                onUpdateUsdAmount={handleUpdateUsdAmount}
                onToggleInputMode={handleToggleInputMode}
                formatNumber={formatNumber}
              />

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

              {/* Navigation Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={handleBackStep}
                  disabled={isUploading}
                  className="flex-1 bg-background-elevated text-foreground py-4 px-6 rounded-lg font-semibold
                    border-2 border-border hover:border-walrus-mint/50 disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleNextStep}
                  disabled={feeConfigs.length === 0}
                  className="flex-1 bg-walrus-mint text-walrus-black py-4 px-6 rounded-lg font-semibold
                    hover:bg-mint-800 disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors"
                >
                  Next: Fee Sharing
                </button>
              </div>

              {/* Transcoding Progress - Bottom */}
              <TranscodingProgress isTranscoding={isTranscoding} progress={transcodingProgress} />

              {transcodedData && !isTranscoding && (
                <div className="p-4 bg-walrus-mint/10 border-2 border-walrus-mint/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-walrus-mint" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-foreground">Video processing complete!</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Fee Sharing */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <Step3FeeSharing
                referrerSharePercent={referrerSharePercent}
                onReferrerShareChange={setReferrerSharePercent}
                onShowPlatformFeeDialog={() => setShowPlatformFeeDialog(true)}
              />

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

              {/* Network Info (Read-only on step 3) */}
              <div className="p-4 bg-background-elevated border-2 border-border rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-muted">Storage Network:</span>
                  <span className="text-sm font-semibold text-foreground">{walrusNetwork === 'mainnet' ? 'Mainnet' : 'Testnet'}</span>
                </div>
                {costEstimate && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-text-muted">Estimated Cost:</span>
                    <span className="text-sm font-semibold text-walrus-mint">
                      {walrusNetwork === 'testnet' ? 'Free' : `${costEstimate.totalWal} WAL (~$${costEstimate.totalUsd})`}
                    </span>
                  </div>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={handleBackStep}
                  disabled={isUploading}
                  className="flex-1 bg-background-elevated text-foreground py-4 px-6 rounded-lg font-semibold
                    border-2 border-border hover:border-walrus-mint/50 disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleUpload}
                  disabled={
                    !selectedFile ||
                    !effectiveAccount ||
                    !title ||
                    isUploading ||
                    isTranscoding ||
                    selectedQualities.length === 0 ||
                    !costEstimate
                  }
                  className="flex-1 bg-walrus-mint text-walrus-black py-4 px-6 rounded-lg font-semibold
                    hover:bg-mint-800 disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors"
                >
                  {!effectiveAccount
                    ? 'Connect Wallet to Upload'
                    : isTranscoding
                    ? `Processing Video... ${Math.round(transcodingProgress)}%`
                    : isUploading
                    ? 'Uploading...'
                    : debugMode
                    ? '[DEBUG MODE] Start Upload'
                    : walrusNetwork === 'mainnet'
                    ? `Fund & Upload (${costEstimate?.totalWal} WAL + Gas)`
                    : 'Approve & Start Upload'}
                </button>
              </div>

              {/* Transcoding Progress - Bottom */}
              <TranscodingProgress isTranscoding={isTranscoding} progress={transcodingProgress} />

              {transcodedData && !isTranscoding && (
                <div className="p-4 bg-walrus-mint/10 border-2 border-walrus-mint/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-walrus-mint" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-foreground">Video ready for upload!</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Summary & Upload Progress */}
          {currentStep === 4 && (
            <div className="space-y-6">
              {/* Configuration Summary */}
              <div className="p-6 bg-background-elevated border-2 border-walrus-mint/30 rounded-lg">
                <h3 className="text-lg font-semibold text-foreground mb-4">Upload Summary</h3>

                {/* Video Details */}
                <div className="mb-4 pb-4 border-b border-border">
                  <h4 className="text-sm font-semibold text-walrus-mint mb-2">Video Details</h4>
                  <div className="space-y-1 text-sm text-text-muted">
                    <p><span className="font-medium">Title:</span> {title}</p>
                    <p><span className="font-medium">File:</span> {selectedFile?.name}</p>
                    <p><span className="font-medium">Size:</span> {selectedFile && (selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    <p><span className="font-medium">Quality:</span> {selectedQualities.join(', ')}</p>
                  </div>
                </div>

                {/* Monetization */}
                <div className="mb-4 pb-4 border-b border-border">
                  <h4 className="text-sm font-semibold text-walrus-mint mb-2">Monetization</h4>
                  <div className="space-y-2">
                    {feeConfigs.map((config) => {
                      const metadata = coinMetadataCache[config.tokenType];
                      const priceData = coinPriceCache[config.tokenType];
                      return (
                        <div key={config.id} className="flex items-center justify-between text-sm">
                          <span className="text-text-muted">
                            {metadata?.symbol || config.tokenType.split('::').pop()}:
                          </span>
                          <span className="text-foreground font-medium">
                            {config.amountPer1000Views} per 1,000 views
                            {priceData && config.amountPer1000Views && (
                              <span className="text-walrus-mint ml-2">
                                (~${(parseFloat(config.amountPer1000Views) * priceData.usdPrice).toFixed(2)})
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Fee Sharing */}
                <div className="mb-4 pb-4 border-b border-border">
                  <h4 className="text-sm font-semibold text-walrus-mint mb-2">Revenue Sharing</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Creator (You):</span>
                      <span className="text-foreground font-medium">{100 - referrerSharePercent - 10}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Referrer:</span>
                      <span className="text-foreground font-medium">{referrerSharePercent}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Platform:</span>
                      <span className="text-foreground font-medium">10%</span>
                    </div>
                  </div>
                </div>

                {/* Storage Info */}
                {costEstimate && (
                  <div>
                    <h4 className="text-sm font-semibold text-walrus-mint mb-2">Storage</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-text-muted">Network:</span>
                        <span className="text-foreground font-medium">{walrusNetwork === 'mainnet' ? 'Mainnet' : 'Testnet'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Duration:</span>
                        <span className="text-foreground font-medium">
                          {walrusNetwork === 'testnet'
                            ? `${testnetStorageDays} ${testnetStorageDays === 1 ? 'day' : 'days'}`
                            : STORAGE_OPTIONS[storageOptionIndex].label}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Cost:</span>
                        <span className="text-foreground font-medium">
                          {walrusNetwork === 'testnet' ? 'Free' : `${costEstimate.totalWal} WAL (~$${costEstimate.totalUsd})`}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Progress */}
              {isUploading && (
                <div className="p-6 bg-background-elevated border-2 border-walrus-mint/20 rounded-lg">
                  <div className="flex justify-between mb-3">
                    <span className="text-foreground font-medium">{progress.message}</span>
                    <span className="text-walrus-mint font-bold">{Math.round(progress.percent)}%</span>
                  </div>
                  <div className="w-full bg-background-hover rounded-full h-3">
                    <div
                      className="bg-walrus-mint h-3 rounded-full transition-all duration-500"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                  <div className="mt-3 text-sm text-text-muted">
                    Stage: {progress.stage}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-4 border-2 border-red-500/30 bg-red-500/10 rounded-lg">
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              {/* Success Message */}
              {!isUploading && !error && (
                <div className="p-6 bg-walrus-mint/10 border-2 border-walrus-mint/30 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <svg className="w-6 h-6 text-walrus-mint" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-lg font-semibold text-foreground">Upload Complete!</span>
                  </div>
                  <p className="text-sm text-text-muted mb-4">
                    Your video has been successfully uploaded and is now available.
                  </p>
                  <button
                    onClick={() => router.push('/')}
                    className="w-full bg-walrus-mint text-walrus-black py-3 px-6 rounded-lg font-semibold
                      hover:bg-mint-800 transition-colors"
                  >
                    Go to Homepage
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Platform Fee Comparison Dialog */}
      <PlatformFeeComparisonDialog
        isOpen={showPlatformFeeDialog}
        onClose={() => setShowPlatformFeeDialog(false)}
      />
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
