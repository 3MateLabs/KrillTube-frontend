'use client';

/**
 * Upload Page V2: Client-Side Encryption
 * Transcode → Encrypt → Upload all in browser
 * Server only stores metadata + encrypted root secret
 */

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { useNetwork } from '@/contexts/NetworkContext';
import { UploadNetworkSwitcher } from '@/components/UploadNetworkSwitcher';
import { usePersonalDelegator } from '@/lib/hooks/usePersonalDelegator';
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
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
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
  const [storageOptionIndex, setStorageOptionIndex] = useState<number>(0); // Index into STORAGE_OPTIONS (default: 1 day)
  const [referrerSharePercent, setReferrerSharePercent] = useState<number>(30); // 0-90% (platform always takes 10%, default: 30%)
  const [isTranscoding, setIsTranscoding] = useState(false);
  const [transcodingProgress, setTranscodingProgress] = useState<number>(0);
  const [transcodedData, setTranscodedData] = useState<any>(null); // Store transcoded video data
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({
    stage: 'transcoding',
    percent: 0,
    message: '',
  });
  const [error, setError] = useState<string | null>(null);

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

        const newMode = config.inputMode === 'coin' ? 'usd' : 'coin';
        const updatedConfig = { ...config, inputMode: newMode };

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
          iconUrl: iconUrl,
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
    } else if (currentStep === 2) {
      setCurrentStep(3);
      setError(null);
    }
  };

  const handleBackStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
      setError(null);
    } else if (currentStep === 3) {
      setCurrentStep(2);
      setError(null);
    }
  };

  // Get current storage epochs
  const selectedStorageOption = STORAGE_OPTIONS[storageOptionIndex];
  const storageEpochs = selectedStorageOption.epochs;

  // Debounced cost estimation - only recalculate after user stops dragging
  useEffect(() => {
    if (!selectedFile || selectedQualities.length === 0) return;

    // Debounce the cost estimation by 300ms
    const timeoutId = setTimeout(() => {
      handleEstimateCost();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [selectedFile, selectedQualities, storageOptionIndex, walrusNetwork]);

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
          epochs: walrusNetwork === 'mainnet' ? storageEpochs : 100, // Testnet uses ~100 epochs (100 days)
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

    setIsUploading(true);
    setError(null);

    try {
      console.log('[Upload V2] Starting client-side upload...');
      if (debugMode) {
        console.log('[Upload V2] Running in DEBUG mode with placeholder wallet');
      }

      // STEP 1: Fund delegator wallet (mainnet only) via PTB
      if (walrusNetwork === 'mainnet' && !debugMode && account) {
        console.log('[Upload V2] Funding delegator wallet with PTB...');

        // Calculate WAL amount in MIST (1 WAL = 1_000_000_000 MIST)
        // Add 20x safety buffer because cost estimator uses simplified formula:
        // - Estimator doesn't use actual Walrus SDK storageCost() calculation
        // - Each blob requires 2 transactions (register + certify)
        // - Poster, playlists, and master playlist uploads (not in estimate)
        // - Encoding overhead (erasure coding expands data 3-5x)
        // - Upload relay tips (40 MIST per KiB of encoded data)
        // - Actual per-blob costs are much higher than approximation
        const estimatedWalMist = BigInt(Math.ceil(parseFloat(costEstimate.totalWal) * 1_000_000_000));
        const walAmountMist = estimatedWalMist * BigInt(20); // 20x buffer for inaccurate estimate

        // Estimate gas needed based on file size (rough calculation)
        const fileSizeMB = selectedFile.size / 1024 / 1024;
        const estimatedSegments = Math.ceil(fileSizeMB / 2) * selectedQualities.length;
        const gasNeeded = estimateGasNeeded(estimatedSegments);

        console.log('[Upload V2] PTB Funding:', {
          estimatedWal: `${parseFloat(costEstimate.totalWal).toFixed(6)} WAL`,
          walAmountWithBuffer: `${Number(walAmountMist) / 1_000_000_000} WAL (20x buffer)`,
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
          // Use user-selected epochs for mainnet, testnet uses 100 epochs
          epochs: walrusNetwork === 'mainnet' ? storageEpochs : 100,
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
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Upload Video
          </h1>
          <p className="text-text-muted mb-6">
            {currentStep === 1 ? 'Select your video and configure quality settings' : currentStep === 2 ? 'Set monetization fees for your video' : 'Configure fee sharing with referrers'}
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
              {(costEstimate || isEstimating) && (
              <div className="p-5 bg-background-elevated border-2 border-walrus-mint/30 rounded-lg relative">
                {/* Loading overlay */}
                {isEstimating && (
                  <div className="absolute inset-0 bg-background-elevated/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-walrus-mint"></div>
                      <span className="text-text-muted text-sm">Calculating...</span>
                    </div>
                  </div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    Estimated Storage Cost
                  </h3>
                  <div className="ml-4">
                    <UploadNetworkSwitcher />
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Storage Duration */}
                  {walrusNetwork === 'mainnet' ? (
                    <div>
                      <div className="flex items-baseline justify-between mb-2">
                        <label className="text-sm font-medium text-text-muted">
                          Storage Duration:
                        </label>
                        <span className="text-foreground font-bold text-xl">
                          {selectedStorageOption.label}
                        </span>
                      </div>

                      {/* Categorical Slider */}
                      <div className="relative">
                        <input
                          type="range"
                          min="0"
                          max={STORAGE_OPTIONS.length - 1}
                          value={storageOptionIndex}
                          onChange={(e) => setStorageOptionIndex(parseInt(e.target.value))}
                          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-walrus-mint"
                          style={{
                            background: `linear-gradient(to right,
                              var(--walrus-mint) 0%,
                              var(--walrus-mint) ${(storageOptionIndex / (STORAGE_OPTIONS.length - 1)) * 100}%,
                              #4b5563 ${(storageOptionIndex / (STORAGE_OPTIONS.length - 1)) * 100}%,
                              #4b5563 100%)`
                          }}
                        />

                        {/* Category Markers */}
                        <div className="flex justify-between text-xs text-text-muted mt-2 px-1">
                          <span className="font-medium">Days</span>
                          <span className="font-medium">Months</span>
                          <span className="font-medium">Years</span>
                        </div>
                      </div>

                      {/* Quick Presets */}
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => setStorageOptionIndex(6)} // 7 days
                          className="px-3 py-1.5 text-xs bg-background-hover text-text-muted rounded-lg hover:bg-walrus-mint/20 hover:text-walrus-mint transition-colors"
                        >
                          7 days
                        </button>
                        <button
                          onClick={() => setStorageOptionIndex(30)} // 1 month
                          className="px-3 py-1.5 text-xs bg-background-hover text-text-muted rounded-lg hover:bg-walrus-mint/20 hover:text-walrus-mint transition-colors"
                        >
                          1 month
                        </button>
                        <button
                          onClick={() => setStorageOptionIndex(35)} // 6 months
                          className="px-3 py-1.5 text-xs bg-background-hover text-text-muted rounded-lg hover:bg-walrus-mint/20 hover:text-walrus-mint transition-colors"
                        >
                          6 months
                        </button>
                        <button
                          onClick={() => setStorageOptionIndex(42)} // 1 year
                          className="px-3 py-1.5 text-xs bg-background-hover text-text-muted rounded-lg hover:bg-walrus-mint/20 hover:text-walrus-mint transition-colors"
                        >
                          1 year
                        </button>
                      </div>

                      <p className="text-xs text-walrus-mint mt-3">
                        💡 You can extend storage later or delete early to receive rebates
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-background-hover rounded-lg border border-border">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-text-muted">Storage Duration:</span>
                        <span className="text-foreground font-semibold">100 days</span>
                      </div>
                      <p className="text-xs text-text-muted mt-2">
                        ℹ️ You can store data in testnet for 100 days and it will be expired
                      </p>
                    </div>
                  )}

                  {/* Total Cost */}
                  {costEstimate && (
                    <>
                      <div className="flex items-baseline justify-between pt-3 border-t border-border">
                        <span className="text-text-muted">Total Cost:</span>
                        {walrusNetwork === 'testnet' ? (
                          <span className="text-walrus-mint font-bold text-lg">
                            Free
                          </span>
                        ) : (
                          <div className="flex items-baseline gap-3">
                            <span className="text-foreground font-mono font-bold text-lg">
                              {costEstimate.totalWal} WAL
                            </span>
                            <span className="text-walrus-mint font-medium">
                              (~${costEstimate.totalUsd} USD)
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Storage Size */}
                      <div className="flex items-baseline justify-between">
                        <span className="text-text-muted">Estimated Storage:</span>
                        <span className="text-foreground font-mono">
                          {costEstimate.storageMB} MB
                        </span>
                      </div>

                      {/* Breakdown - Only show for mainnet */}
                      {walrusNetwork === 'mainnet' && (
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
                      )}

                      <p className="text-xs text-text-muted mt-3">
                        {walrusNetwork === 'testnet'
                          ? 'Testnet storage is free. No payment required.'
                          : 'This is an estimate. Actual cost may vary slightly based on final file size.'}
                      </p>
                    </>
                  )}
                </div>
              </div>
              )}

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
              {/* Fee Configurations */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-foreground">
                    Payment Methods
                  </label>
                  <button
                    onClick={handleAddFeeConfig}
                    className="text-sm text-walrus-mint hover:text-mint-800 font-medium transition-colors flex items-center gap-1"
                  >
                    <span className="text-lg">+</span> Add Payment Method
                  </button>
                </div>

                <div className="space-y-4">
                  {feeConfigs.map((config, index) => (
                    <div key={config.id} className="p-5 bg-background-elevated border-2 border-border rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-semibold text-foreground">Payment Method {index + 1}</h4>
                        {feeConfigs.length > 1 && (
                          <button
                            onClick={() => handleRemoveFeeConfig(config.id)}
                            className="text-sm text-red-400 hover:text-red-300 transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="space-y-4">
                        {/* Token Type */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <label className="text-sm font-medium text-text-muted">
                              Token Type
                            </label>
                            {coinMetadataCache[config.tokenType]?.iconUrl && (
                              <img
                                src={coinMetadataCache[config.tokenType].iconUrl!}
                                alt={coinMetadataCache[config.tokenType]?.symbol || 'Token'}
                                className="w-4 h-4 rounded-full"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}
                            {coinMetadataCache[config.tokenType] && (
                              <span className="text-xs text-walrus-mint font-medium">
                                {coinMetadataCache[config.tokenType].symbol}
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            value={config.tokenType}
                            onChange={(e) => handleUpdateFeeConfig(config.id, 'tokenType', e.target.value)}
                            placeholder="0x2::sui::SUI"
                            className="w-full px-4 py-3 bg-background border border-border rounded-lg
                              text-foreground placeholder-text-muted/50 font-mono text-sm
                              focus:outline-none focus:ring-2 focus:ring-walrus-mint"
                          />
                          <p className="text-xs text-text-muted mt-1">
                            Enter the full token type (e.g., 0x2::sui::SUI)
                          </p>
                        </div>

                        {/* Amount per 1000 views */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-text-muted">
                              Amount per 1,000 Views{config.inputMode === 'usd' ? ' (in USD)' : ''}
                            </label>
                            <button
                              type="button"
                              onClick={() => handleToggleInputMode(config.id)}
                              className="text-xs px-2 py-1 rounded bg-background-hover hover:bg-border text-walrus-mint font-medium transition-colors"
                            >
                              {config.inputMode === 'coin' ? 'USD' : coinMetadataCache[config.tokenType]?.symbol || 'Coin'}
                            </button>
                          </div>

                          {/* Input field based on mode */}
                          {config.inputMode === 'coin' ? (
                            <input
                              type="number"
                              value={config.amountPer1000Views}
                              onChange={(e) => handleUpdateCoinAmount(config.id, e.target.value)}
                              placeholder="0"
                              min="0"
                              step="0.000001"
                              className="w-full px-4 py-3 bg-background border border-border rounded-lg
                                text-foreground placeholder-text-muted/50
                                focus:outline-none focus:ring-2 focus:ring-walrus-mint"
                            />
                          ) : (
                            <input
                              type="number"
                              value={config.usdAmountPer1000Views || ''}
                              onChange={(e) => handleUpdateUsdAmount(config.id, e.target.value)}
                              placeholder="0"
                              min="0"
                              step="0.01"
                              className="w-full px-4 py-3 bg-background border border-border rounded-lg
                                text-foreground placeholder-text-muted/50
                                focus:outline-none focus:ring-2 focus:ring-walrus-mint"
                            />
                          )}

                          {/* Show conversion below input */}
                          {config.inputMode === 'usd' && config.usdAmountPer1000Views && parseFloat(config.usdAmountPer1000Views) > 0 && coinPriceCache[config.tokenType] && (
                            <p className="text-xs text-text-muted mt-2">
                              ≈{' '}
                              {coinMetadataCache[config.tokenType]?.iconUrl && (
                                <img
                                  src={coinMetadataCache[config.tokenType].iconUrl!}
                                  alt={coinMetadataCache[config.tokenType]?.symbol || 'Token'}
                                  className="w-3.5 h-3.5 rounded-full inline align-middle"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              )}{' '}
                              <span className="font-semibold text-walrus-mint">
                                {config.amountPer1000Views && parseFloat(config.amountPer1000Views) > 0
                                  ? formatNumber(parseFloat(config.amountPer1000Views))
                                  : '0'}{' '}
                                {coinMetadataCache[config.tokenType]?.symbol || config.tokenType.split('::').pop() || 'TOKEN'}
                              </span>
                            </p>
                          )}

                          {config.inputMode === 'coin' && config.amountPer1000Views && parseFloat(config.amountPer1000Views) > 0 && coinPriceCache[config.tokenType] && (
                            <p className="text-xs text-text-muted mt-2">
                              ≈ <span className="font-semibold text-walrus-mint">${formatNumber(parseFloat(config.amountPer1000Views) * coinPriceCache[config.tokenType].usdPrice)} USD</span>
                            </p>
                          )}

                          <p className="text-xs text-text-muted mt-3">
                            You will get{' '}
                            {coinMetadataCache[config.tokenType]?.iconUrl && (
                              <img
                                src={coinMetadataCache[config.tokenType].iconUrl!}
                                alt={coinMetadataCache[config.tokenType]?.symbol || 'Token'}
                                className="w-3.5 h-3.5 rounded-full inline align-middle"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}{' '}
                            <span className="font-semibold text-foreground">
                              {config.amountPer1000Views && parseFloat(config.amountPer1000Views) > 0
                                ? formatNumber(parseFloat(config.amountPer1000Views))
                                : '0'}{' '}
                              {coinMetadataCache[config.tokenType]?.symbol || config.tokenType.split('::').pop() || 'TOKEN'}
                            </span>
                            {coinPriceCache[config.tokenType] && config.amountPer1000Views && parseFloat(config.amountPer1000Views) > 0 && (
                              <span className="text-walrus-mint font-medium">
                                {' '}(~${formatNumber(parseFloat(config.amountPer1000Views) * coinPriceCache[config.tokenType].usdPrice)} USD)
                              </span>
                            )}{' '}
                            per 1000 views and each viewer will pay{' '}
                            {coinMetadataCache[config.tokenType]?.iconUrl && (
                              <img
                                src={coinMetadataCache[config.tokenType].iconUrl!}
                                alt={coinMetadataCache[config.tokenType]?.symbol || 'Token'}
                                className="w-3.5 h-3.5 rounded-full inline align-middle"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}{' '}
                            <span className="font-semibold text-foreground">
                              {config.amountPer1000Views && parseFloat(config.amountPer1000Views) > 0
                                ? formatNumber(parseFloat(config.amountPer1000Views) / 1000)
                                : '0'}{' '}
                              {coinMetadataCache[config.tokenType]?.symbol || config.tokenType.split('::').pop() || 'TOKEN'}
                            </span>
                            {coinPriceCache[config.tokenType] && config.amountPer1000Views && parseFloat(config.amountPer1000Views) > 0 && (
                              <span className="text-walrus-mint font-medium">
                                {' '}(~${formatNumber((parseFloat(config.amountPer1000Views) / 1000) * coinPriceCache[config.tokenType].usdPrice)} USD)
                              </span>
                            )}{' '}
                            to watch your full video
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="p-5 bg-background-elevated border-2 border-walrus-mint/30 rounded-lg">
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  Monetization Summary
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Total Payment Methods:</span>
                    <span className="text-foreground font-semibold">{feeConfigs.length}</span>
                  </div>
                  {feeConfigs.map((config, index) => (
                    <div key={config.id} className="flex justify-between text-sm py-2 border-t border-border">
                      <span className="text-text-muted">Method {index + 1}:</span>
                      <div className="text-right">
                        <div className="inline-flex items-center gap-1.5 text-foreground font-medium">
                          {coinMetadataCache[config.tokenType]?.iconUrl && (
                            <img
                              src={coinMetadataCache[config.tokenType].iconUrl!}
                              alt={coinMetadataCache[config.tokenType]?.symbol || 'Token'}
                              className="w-3.5 h-3.5 rounded-full"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                          <span>
                            {config.amountPer1000Views && parseFloat(config.amountPer1000Views) > 0
                              ? formatNumber(parseFloat(config.amountPer1000Views))
                              : '0'}{' '}
                            {coinMetadataCache[config.tokenType]?.symbol || config.tokenType.split('::').pop() || 'TOKEN'}
                          </span>
                        </div>
                        {coinPriceCache[config.tokenType] && config.amountPer1000Views && parseFloat(config.amountPer1000Views) > 0 && (
                          <div className="text-xs text-walrus-mint font-medium">
                            ~${formatNumber(parseFloat(config.amountPer1000Views) * coinPriceCache[config.tokenType].usdPrice)} USD
                          </div>
                        )}
                        <div className="text-xs text-text-muted">per 1,000 views</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

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
              {isTranscoding && (
                <div className="p-5 bg-background-elevated border-2 border-walrus-mint/30 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-walrus-mint"></div>
                    <span className="text-foreground font-medium">Processing video in background...</span>
                    <span className="text-walrus-mint font-bold ml-auto">{Math.round(transcodingProgress)}%</span>
                  </div>
                  <div className="w-full bg-background-hover rounded-full h-2">
                    <div
                      className="bg-walrus-mint h-2 rounded-full transition-all duration-300"
                      style={{ width: `${transcodingProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-text-muted mt-2">
                    Your video is being processed while you configure monetization. This will speed up the final upload!
                  </p>
                </div>
              )}

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
              {/* Referrer Share Configuration */}
              <div className="p-6 bg-background-elevated border-2 border-border rounded-lg">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Revenue Sharing
                </h3>
                <p className="text-sm text-text-muted mb-6">
                  Configure how your video revenue will be shared. The platform automatically takes 10% to maintain the service.
                </p>

                {/* Referrer Share Slider */}
                <div className="mb-8">
                  <div className="flex items-baseline justify-between mb-3">
                    <label className="text-sm font-medium text-foreground">
                      Referrer Share
                    </label>
                    <span className="text-2xl font-bold text-walrus-mint">
                      {referrerSharePercent}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="90"
                    step="5"
                    value={referrerSharePercent}
                    onChange={(e) => setReferrerSharePercent(parseInt(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-walrus-mint"
                    style={{
                      background: `linear-gradient(to right,
                        var(--walrus-mint) 0%,
                        var(--walrus-mint) ${(referrerSharePercent / 90) * 100}%,
                        #4b5563 ${(referrerSharePercent / 90) * 100}%,
                        #4b5563 100%)`
                    }}
                  />

                  {/* Quick Presets */}
                  <div className="flex gap-2 mt-4">
                    {[0, 10, 20, 30, 40, 50].map((percent) => (
                      <button
                        key={percent}
                        onClick={() => setReferrerSharePercent(percent)}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                          referrerSharePercent === percent
                            ? 'bg-walrus-mint text-walrus-black font-semibold'
                            : 'bg-background-hover text-text-muted hover:bg-walrus-mint/20 hover:text-walrus-mint'
                        }`}
                      >
                        {percent}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Revenue Distribution Pie Chart */}
                <div className="p-5 bg-background border border-border rounded-lg">
                  <h4 className="text-sm font-semibold text-foreground mb-4">
                    Revenue Distribution
                  </h4>

                  <div className="flex items-center gap-8">
                    {/* Pie Chart SVG */}
                    <svg width="160" height="160" viewBox="0 0 160 160" className="flex-shrink-0">
                      {(() => {
                        const creatorPercent = 100 - referrerSharePercent - 10;
                        const platformPercent = 10;

                        // Calculate pie slices
                        const radius = 70;
                        const cx = 80;
                        const cy = 80;

                        // Helper to get point on circle
                        const getPoint = (percent: number) => {
                          const angle = (percent / 100) * 2 * Math.PI - Math.PI / 2;
                          return {
                            x: cx + radius * Math.cos(angle),
                            y: cy + radius * Math.sin(angle),
                          };
                        };

                        // Calculate cumulative percentages
                        let cumulative = 0;
                        const slices = [
                          { label: 'Creator', percent: creatorPercent, color: '#83FFE6' }, // walrus-mint
                          { label: 'Referrer', percent: referrerSharePercent, color: '#A78BFA' }, // purple
                          { label: 'Platform', percent: platformPercent, color: '#6B7280' }, // gray
                        ];

                        return (
                          <>
                            {slices.map((slice, i) => {
                              if (slice.percent === 0) return null;

                              const startPercent = cumulative;
                              cumulative += slice.percent;
                              const endPercent = cumulative;

                              const start = getPoint(startPercent);
                              const end = getPoint(endPercent);

                              const largeArc = slice.percent > 50 ? 1 : 0;

                              const pathData = [
                                `M ${cx} ${cy}`,
                                `L ${start.x} ${start.y}`,
                                `A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`,
                                'Z',
                              ].join(' ');

                              return (
                                <path
                                  key={i}
                                  d={pathData}
                                  fill={slice.color}
                                  stroke="#1a1a1a"
                                  strokeWidth="2"
                                />
                              );
                            })}
                          </>
                        );
                      })()}
                    </svg>

                    {/* Legend */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#83FFE6' }} />
                          <span className="text-sm text-foreground">Creator (You)</span>
                        </div>
                        <span className="text-sm font-semibold text-walrus-mint">
                          {100 - referrerSharePercent - 10}%
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#A78BFA' }} />
                          <span className="text-sm text-foreground">Referrer</span>
                        </div>
                        <span className="text-sm font-semibold text-purple-400">
                          {referrerSharePercent}%
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#6B7280' }} />
                          <span className="text-sm text-foreground">Platform</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-400">
                          10%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {/* Example with referrer */}
                    <div className="p-3 bg-background-hover rounded-lg">
                      <p className="text-xs text-text-muted">
                        <span className="font-semibold text-foreground">Example 1: With Referrer</span> - If a viewer pays 10 SUI to watch your video through a referral link:
                      </p>
                      <ul className="mt-2 space-y-1 text-xs text-text-muted ml-4">
                        <li>• You receive: <span className="text-walrus-mint font-semibold">{((100 - referrerSharePercent - 10) / 100 * 10).toFixed(2)} SUI</span></li>
                        <li>• Referrer receives: <span className="text-purple-400 font-semibold">{(referrerSharePercent / 100 * 10).toFixed(2)} SUI</span></li>
                        <li>• Platform receives: <span className="text-gray-400 font-semibold">1.00 SUI</span></li>
                      </ul>
                    </div>

                    {/* Example without referrer */}
                    <div className="p-3 bg-background-hover rounded-lg">
                      <p className="text-xs text-text-muted">
                        <span className="font-semibold text-foreground">Example 2: No Referrer</span> - If a viewer pays 10 SUI directly (no referral):
                      </p>
                      <ul className="mt-2 space-y-1 text-xs text-text-muted ml-4">
                        <li>• You receive: <span className="text-walrus-mint font-semibold">{((100 - 10) / 100 * 10).toFixed(2)} SUI</span> <span className="text-walrus-mint/70">(you get the referrer's share too!)</span></li>
                        <li>• Referrer receives: <span className="text-purple-400 font-semibold">0.00 SUI</span> <span className="text-text-muted/70">(no referrer)</span></li>
                        <li>• Platform receives: <span className="text-gray-400 font-semibold">1.00 SUI</span></li>
                      </ul>
                    </div>

                    <p className="text-xs text-walrus-mint/80 italic">
                      💡 When there's no referrer, you keep their share! The platform always takes 10%.
                    </p>
                  </div>
                </div>
              </div>

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
              {isTranscoding && (
                <div className="p-5 bg-background-elevated border-2 border-walrus-mint/30 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-walrus-mint"></div>
                    <span className="text-foreground font-medium">Processing video in background...</span>
                    <span className="text-walrus-mint font-bold ml-auto">{Math.round(transcodingProgress)}%</span>
                  </div>
                  <div className="w-full bg-background-hover rounded-full h-2">
                    <div
                      className="bg-walrus-mint h-2 rounded-full transition-all duration-300"
                      style={{ width: `${transcodingProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-text-muted mt-2">
                    Video processing is almost done! You can continue configuring while we finish.
                  </p>
                </div>
              )}

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
