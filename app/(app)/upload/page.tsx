'use client';

/**
 * Upload Page V2: Client-Side Encryption
 * Transcode → Encrypt → Upload all in browser
 * Server only stores metadata + encrypted root secret
 */

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCurrentAccount, useSignAndExecuteTransaction, useCurrentWallet } from '@mysten/dapp-kit';
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
  const { currentWallet } = useCurrentWallet();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const { walrusNetwork } = useNetwork();
  const { buildFundingTransaction, estimateGasNeeded, autoReclaimGas, executeWithDelegator, delegatorAddress } = usePersonalDelegator();

  // Helper: Get default token type based on connected wallet
  const getDefaultTokenType = () => {
    if (currentWallet?.name) {
      const walletName = currentWallet.name.toLowerCase();
      console.log('[Upload] Checking wallet name for token type:', walletName);
      // Check if it's an IOTA wallet (check for common IOTA wallet names)
      if (walletName.includes('iota')) {
        console.log('[Upload] Detected IOTA wallet, using IOTA token type');
        return '0x2::iota::IOTA';
      }
    }
    // Default to SUI for all other wallets (including Sui Wallet, Suiet, Ethos, etc.)
    console.log('[Upload] Using default SUI token type');
    return '0x2::sui::SUI';
  };

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

  // Update default token type when wallet changes
  useEffect(() => {
    if (currentWallet) {
      const defaultTokenType = getDefaultTokenType();
      console.log('[Upload] Wallet changed - Name:', currentWallet.name, '-> Default token type:', defaultTokenType);

      // Update ALL fee configs that are using default SUI or IOTA tokens
      setFeeConfigs((prev) => {
        console.log('[Upload] Current fee configs:', prev);
        const updated = prev.map((config) => {
          // Update if it's using a default token type
          if (config.tokenType === '0x2::sui::SUI' || config.tokenType === '0x2::iota::IOTA') {
            console.log('[Upload] Updating token type from', config.tokenType, 'to', defaultTokenType);
            return {
              ...config,
              tokenType: defaultTokenType,
            };
          }
          return config;
        });
        return updated;
      });
    }
  }, [currentWallet]);

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
        tokenType: getDefaultTokenType(),
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
          network: walrusNetwork, // Pass network to get accurate Walrus SDK pricing
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
          network: walrusNetwork, // Save the network used for upload
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
    <div className="min-h-screen bg-gradient-to-br from-[#0668A6] via-[#0668A6] to-[#1AAACE]">
      <div className="pl-20 pr-12 pt-12 pb-6">
        <div className="max-w-4xl">
          <h1 ref={titleRef} className="text-3xl font-bold font-['Outfit'] text-white mb-2">
            Upload Video
          </h1>
          <p className="text-white/80 text-base font-medium font-['Outfit'] mb-8">
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
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold font-['Outfit'] shadow-[3px_3px_0_0_black] outline outline-2 outline-offset-[-2px] ${
                currentStep === 1 ? 'bg-[#EF4330] text-white outline-white' : 'bg-white text-black outline-black'
              }`}>
                1
              </div>
              <span className={`text-base font-semibold font-['Outfit'] ${currentStep === 1 ? 'text-white' : 'text-white/70'}`}>
                Video Details
              </span>
            </div>
            <div className="flex-1 h-[2px] bg-black" />
            <div className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold font-['Outfit'] shadow-[3px_3px_0_0_black] outline outline-2 outline-offset-[-2px] ${
                currentStep === 2 ? 'bg-[#EF4330] text-white outline-white' : 'bg-white text-black outline-black'
              }`}>
                2
              </div>
              <span className={`text-base font-semibold font-['Outfit'] ${currentStep === 2 ? 'text-white' : 'text-white/70'}`}>
                Monetization
              </span>
            </div>
            <div className="flex-1 h-[2px] bg-black" />
            <div className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold font-['Outfit'] shadow-[3px_3px_0_0_black] outline outline-2 outline-offset-[-2px] ${
                currentStep === 3 ? 'bg-[#EF4330] text-white outline-white' : 'bg-white text-black outline-black'
              }`}>
                3
              </div>
              <span className={`text-base font-semibold font-['Outfit'] ${currentStep === 3 ? 'text-white' : 'text-white/70'}`}>
                Fee Sharing
              </span>
            </div>
          </div>

          {/* Step 1: Video Details */}
          {currentStep === 1 && (
            <div className="p-6 bg-[#FFEEE5] rounded-[32px] shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)] outline outline-[3px] outline-offset-[-3px] outline-black flex flex-col gap-6">
            {/* File Upload */}
            <div>
              <label className="block text-base font-semibold font-['Outfit'] text-black mb-3">
                Video File
              </label>
              <div className="relative">
                <input
                  id="video-file"
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                  className="hidden"
                />
                <label
                  htmlFor="video-file"
                  className={`w-full p-4 bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black flex items-center justify-between cursor-pointer hover:shadow-[2px_2px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="text-base font-medium font-['Outfit'] text-black/70">
                    {selectedFile ? selectedFile.name : 'Choose a video file...'}
                  </span>
                  <div className="px-4 py-2 bg-black rounded-[32px] shadow-[2px_2px_0_0_black] outline outline-2 outline-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-base font-bold font-['Outfit'] text-white">Browse</span>
                  </div>
                </label>
              </div>
              {selectedFile && (
                <div className="mt-4 p-4 bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-base font-semibold font-['Outfit'] text-black">{selectedFile.name}</p>
                      <p className="text-sm font-medium font-['Outfit'] text-black/70 mt-1">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <svg className="w-6 h-6 text-[#EF4330]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}
            </div>

            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-base font-semibold font-['Outfit'] text-black mb-3">
                Title
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isUploading}
                placeholder="My awesome video"
                className="w-full px-5 py-3.5 bg-white rounded-2xl
                  shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)]
                  outline outline-2 outline-offset-[-2px] outline-black
                  text-black placeholder-black/40 text-base font-medium font-['Outfit']
                  focus:outline-[#EF4330] focus:outline-[3px]
                  transition-all
                  disabled:opacity-50"
              />
            </div>

            {/* Quality Selection */}
            <div>
              <label className="block text-base font-semibold font-['Outfit'] text-black mb-3">Quality</label>
              <div className="grid grid-cols-4 gap-3">
                {(['1080p', '720p', '480p', '360p'] as RenditionQuality[]).map((quality) => (
                  <label
                    key={quality}
                    className={`
                      flex items-center justify-center py-3.5 px-4 rounded-2xl cursor-pointer
                      font-bold font-['Outfit'] text-base
                      shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)]
                      outline outline-2 outline-offset-[-2px]
                      transition-all
                      ${
                        selectedQualities.includes(quality)
                          ? 'bg-[#EF4330] text-white outline-white'
                          : 'bg-white text-black outline-black hover:shadow-[2px_2px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px]'
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
                className="w-full bg-krill-orange text-white py-4 px-6 rounded-[32px] font-bold font-['Outfit'] text-lg
                  shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)]
                  outline outline-[3px] outline-white
                  hover:shadow-[2px_2px_0_0_black]
                  hover:translate-x-[1px] hover:translate-y-[1px]
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[3px_3px_0_0_black] disabled:hover:translate-x-0 disabled:hover:translate-y-0
                  transition-all"
              >
                Next: Set Monetization
              </button>
            </div>
          )}

          {/* Step 2: Monetization Settings */}
          {currentStep === 2 && (
            <div className="p-6 bg-[#FFEEE5] rounded-[32px] shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)] outline outline-[3px] outline-offset-[-3px] outline-black flex flex-col gap-6">
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
                <div className="p-4 bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-[#EF4330]">
                  <p className="text-base font-semibold font-['Outfit'] text-[#EF4330]">{error}</p>
                </div>
              )}

              {/* Progress */}
              {isUploading && (
                <div className="p-5 bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black">
                  <div className="flex justify-between mb-3">
                    <span className="text-black font-semibold font-['Outfit']">{progress.message}</span>
                    <span className="text-[#EF4330] font-bold font-['Outfit']">{Math.round(progress.percent)}%</span>
                  </div>
                  <div className="w-full bg-black/10 rounded-full h-3">
                    <div
                      className="bg-[#EF4330] h-3 rounded-full transition-all duration-500"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                  <div className="mt-3 text-sm text-black/70 font-medium font-['Outfit']">
                    Stage: {progress.stage}
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={handleBackStep}
                  disabled={isUploading}
                  className="flex-1 bg-white text-black py-4 px-6 rounded-[32px] font-bold font-['Outfit'] text-lg
                    shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)]
                    outline outline-[3px] outline-black
                    hover:shadow-[2px_2px_0_0_black]
                    hover:translate-x-[1px] hover:translate-y-[1px]
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[3px_3px_0_0_black] disabled:hover:translate-x-0 disabled:hover:translate-y-0
                    transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleNextStep}
                  disabled={feeConfigs.length === 0}
                  className="flex-1 bg-[#EF4330] text-white py-4 px-6 rounded-[32px] font-bold font-['Outfit'] text-lg
                    shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)]
                    outline outline-[3px] outline-white
                    hover:shadow-[2px_2px_0_0_black]
                    hover:translate-x-[1px] hover:translate-y-[1px]
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[3px_3px_0_0_black] disabled:hover:translate-x-0 disabled:hover:translate-y-0
                    transition-all"
                >
                  Next: Fee Sharing
                </button>
              </div>

              {/* Transcoding Progress - Bottom */}
              <TranscodingProgress isTranscoding={isTranscoding} progress={transcodingProgress} />

              {transcodedData && !isTranscoding && (
                <div className="p-4 bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black">
                  <div className="flex items-center gap-2">
                    <svg className="w-6 h-6 text-[#EF4330]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-base font-semibold font-['Outfit'] text-black">Video processing complete!</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Fee Sharing */}
          {currentStep === 3 && (
            <div className="p-6 bg-[#FFEEE5] rounded-[32px] shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)] outline outline-[3px] outline-offset-[-3px] outline-black flex flex-col gap-6">
              <Step3FeeSharing
                referrerSharePercent={referrerSharePercent}
                onReferrerShareChange={setReferrerSharePercent}
                onShowPlatformFeeDialog={() => setShowPlatformFeeDialog(true)}
              />

              {/* Error */}
              {error && (
                <div className="p-4 bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-[#EF4330]">
                  <p className="text-base font-semibold font-['Outfit'] text-[#EF4330]">{error}</p>
                </div>
              )}

              {/* Progress */}
              {isUploading && (
                <div className="p-5 bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black">
                  <div className="flex justify-between mb-3">
                    <span className="text-black font-semibold font-['Outfit']">{progress.message}</span>
                    <span className="text-[#EF4330] font-bold font-['Outfit']">{Math.round(progress.percent)}%</span>
                  </div>
                  <div className="w-full bg-black/10 rounded-full h-3">
                    <div
                      className="bg-[#EF4330] h-3 rounded-full transition-all duration-500"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                  <div className="mt-3 text-sm text-black/70 font-medium font-['Outfit']">
                    Stage: {progress.stage}
                  </div>
                </div>
              )}

              {/* Network Info (Read-only on step 3) */}
              <div className="p-4 bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium font-['Outfit'] text-black/70">Storage Network:</span>
                  <span className="text-base font-bold font-['Outfit'] text-black">{walrusNetwork === 'mainnet' ? 'Mainnet' : 'Testnet'}</span>
                </div>
                {costEstimate && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-medium font-['Outfit'] text-black/70">Estimated Cost:</span>
                    <span className="text-base font-bold font-['Outfit'] text-[#EF4330]">
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
                  className="flex-1 bg-white text-black py-4 px-6 rounded-[32px] font-bold font-['Outfit'] text-lg
                    shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)]
                    outline outline-[3px] outline-black
                    hover:shadow-[2px_2px_0_0_black]
                    hover:translate-x-[1px] hover:translate-y-[1px]
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[3px_3px_0_0_black] disabled:hover:translate-x-0 disabled:hover:translate-y-0
                    transition-all"
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
                  className="flex-1 bg-[#EF4330] text-white py-4 px-6 rounded-[32px] font-bold font-['Outfit'] text-lg
                    shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)]
                    outline outline-[3px] outline-white
                    hover:shadow-[2px_2px_0_0_black]
                    hover:translate-x-[1px] hover:translate-y-[1px]
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[3px_3px_0_0_black] disabled:hover:translate-x-0 disabled:hover:translate-y-0
                    transition-all"
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
                <div className="p-4 bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black">
                  <div className="flex items-center gap-2">
                    <svg className="w-6 h-6 text-[#EF4330]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-base font-semibold font-['Outfit'] text-black">Video ready for upload!</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Summary & Upload Progress */}
          {currentStep === 4 && (
            <div className="p-6 bg-[#FFEEE5] rounded-[32px] shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)] outline outline-[3px] outline-offset-[-3px] outline-black flex flex-col gap-6">
              {/* Configuration Summary */}
              <div className="p-6 bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black">
                <h3 className="text-xl font-bold font-['Outfit'] text-black mb-4">Upload Summary</h3>

                {/* Video Details */}
                <div className="mb-4 pb-4 border-b-2 border-black">
                  <h4 className="text-base font-bold font-['Outfit'] text-[#EF4330] mb-3">Video Details</h4>
                  <div className="space-y-2 text-sm">
                    <p className="font-['Outfit']"><span className="font-semibold text-black">Title:</span> <span className="text-black/70">{title}</span></p>
                    <p className="font-['Outfit']"><span className="font-semibold text-black">File:</span> <span className="text-black/70">{selectedFile?.name}</span></p>
                    <p className="font-['Outfit']"><span className="font-semibold text-black">Size:</span> <span className="text-black/70">{selectedFile && (selectedFile.size / 1024 / 1024).toFixed(2)} MB</span></p>
                    <p className="font-['Outfit']"><span className="font-semibold text-black">Quality:</span> <span className="text-black/70">{selectedQualities.join(', ')}</span></p>
                  </div>
                </div>

                {/* Monetization */}
                <div className="mb-4 pb-4 border-b-2 border-black">
                  <h4 className="text-base font-bold font-['Outfit'] text-[#EF4330] mb-3">Monetization</h4>
                  <div className="space-y-2">
                    {feeConfigs.map((config) => {
                      const metadata = coinMetadataCache[config.tokenType];
                      const priceData = coinPriceCache[config.tokenType];
                      return (
                        <div key={config.id} className="flex items-center justify-between text-sm font-['Outfit']">
                          <span className="text-black/70">
                            {metadata?.symbol || config.tokenType.split('::').pop()}:
                          </span>
                          <span className="text-black font-semibold">
                            {config.amountPer1000Views} per 1,000 views
                            {priceData && config.amountPer1000Views && (
                              <span className="text-[#EF4330] ml-2">
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
                <div className="mb-4 pb-4 border-b-2 border-black">
                  <h4 className="text-base font-bold font-['Outfit'] text-[#EF4330] mb-3">Revenue Sharing</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between font-['Outfit']">
                      <span className="text-black/70">Creator (You):</span>
                      <span className="text-black font-semibold">{100 - referrerSharePercent - 10}%</span>
                    </div>
                    <div className="flex justify-between font-['Outfit']">
                      <span className="text-black/70">Referrer:</span>
                      <span className="text-black font-semibold">{referrerSharePercent}%</span>
                    </div>
                    <div className="flex justify-between font-['Outfit']">
                      <span className="text-black/70">Platform:</span>
                      <span className="text-black font-semibold">10%</span>
                    </div>
                  </div>
                </div>

                {/* Storage Info */}
                {costEstimate && (
                  <div>
                    <h4 className="text-base font-bold font-['Outfit'] text-[#EF4330] mb-3">Storage</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between font-['Outfit']">
                        <span className="text-black/70">Network:</span>
                        <span className="text-black font-semibold">{walrusNetwork === 'mainnet' ? 'Mainnet' : 'Testnet'}</span>
                      </div>
                      <div className="flex justify-between font-['Outfit']">
                        <span className="text-black/70">Duration:</span>
                        <span className="text-black font-semibold">
                          {walrusNetwork === 'testnet'
                            ? `${testnetStorageDays} ${testnetStorageDays === 1 ? 'day' : 'days'}`
                            : STORAGE_OPTIONS[storageOptionIndex].label}
                        </span>
                      </div>
                      <div className="flex justify-between font-['Outfit']">
                        <span className="text-black/70">Cost:</span>
                        <span className="text-black font-semibold">
                          {walrusNetwork === 'testnet' ? 'Free' : `${costEstimate.totalWal} WAL (~$${costEstimate.totalUsd})`}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Progress */}
              {isUploading && (
                <div className="p-6 bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black">
                  <div className="flex justify-between mb-3">
                    <span className="text-black font-semibold font-['Outfit']">{progress.message}</span>
                    <span className="text-[#EF4330] font-bold font-['Outfit']">{Math.round(progress.percent)}%</span>
                  </div>
                  <div className="w-full bg-black/10 rounded-full h-4">
                    <div
                      className="bg-[#EF4330] h-4 rounded-full transition-all duration-500"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                  <div className="mt-3 text-sm text-black/70 font-medium font-['Outfit']">
                    Stage: {progress.stage}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-4 bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-[#EF4330]">
                  <p className="text-base font-semibold font-['Outfit'] text-[#EF4330]">{error}</p>
                </div>
              )}

              {/* Success Message */}
              {!isUploading && !error && (
                <div className="p-6 bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black">
                  <div className="flex items-center gap-3 mb-4">
                    <svg className="w-8 h-8 text-[#EF4330]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xl font-bold font-['Outfit'] text-black">Upload Complete!</span>
                  </div>
                  <p className="text-base font-medium font-['Outfit'] text-black/70 mb-6">
                    Your video has been successfully uploaded and is now available.
                  </p>
                  <button
                    onClick={() => router.push('/')}
                    className="w-full bg-[#EF4330] text-white py-4 px-6 rounded-[32px] font-bold font-['Outfit'] text-lg
                      shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)]
                      outline outline-[3px] outline-white
                      hover:shadow-[2px_2px_0_0_black]
                      hover:translate-x-[1px] hover:translate-y-[1px]
                      transition-all"
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
