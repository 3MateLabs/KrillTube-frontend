'use client';

/**
 * Image Upload Page: Client-Side Encryption
 * Encrypt → Upload to Walrus → Store encrypted metadata
 */

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
// IOTA disabled - using Sui/Walrus only
// import { useSignAndExecuteTransaction as useIotaSignAndExecuteTransaction } from '@iota/dapp-kit';
import { useNetwork } from '@/contexts/NetworkContext';
import { usePersonalDelegator } from '@/lib/hooks/usePersonalDelegator';
import { useCurrentWalletMultiChain } from '@/lib/hooks/useCurrentWalletMultiChain';
import { UploadStepIndicator } from '@/components/upload/UploadStepIndicator';
import { Step2Monetization } from '@/components/upload/Step2Monetization';
import { Step3FeeSharing } from '@/components/upload/Step3FeeSharing';
import Image from 'next/image';

type FeeConfig = {
  id: string;
  tokenType: string;
  amountPer1000Views: string;
  usdAmountPer1000Views?: string;
  inputMode?: 'coin' | 'usd';
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

type UploadProgress = {
  stage: 'encrypting' | 'uploading' | 'registering' | 'complete';
  percent: number;
  message: string;
};

function ImagesUploadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const account = useCurrentAccount();
  const { network, suiWallet, iotaWallet } = useCurrentWalletMultiChain();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  // IOTA disabled - using Sui/Walrus only
  // const { mutateAsync: iotaSignAndExecuteTransaction } = useIotaSignAndExecuteTransaction();
  const iotaSignAndExecuteTransaction: any = null;
  const { walrusNetwork } = useNetwork();
  const { buildFundingTransaction, estimateGasNeeded, executeWithDelegator, delegatorAddress, autoReclaimGas } = usePersonalDelegator();

  // Helper: Get default token type based on network
  const getDefaultTokenType = (index: number = 0) => {
    if (network === 'iota') {
      if (index === 0) {
        return process.env.NEXT_PUBLIC_IOTA_DEMO_KRILL_COIN || '0x2::iota::IOTA';
      } else {
        return '0x2::iota::IOTA';
      }
    }
    if (index === 0) {
      return process.env.NEXT_PUBLIC_SUI_DEMO_KRILL_COIN || '0x2::sui::SUI';
    } else {
      return '0x2::sui::SUI';
    }
  };

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
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
  const [referrerSharePercent, setReferrerSharePercent] = useState<number>(30);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({
    stage: 'encrypting',
    percent: 0,
    message: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);

  const titleRef = useRef<HTMLHeadingElement>(null);

  // Debug mode
  useEffect(() => {
    const isDebug = searchParams.get('no-wallet-debug') === 'true';
    setDebugMode(isDebug);
  }, [searchParams]);

  // Update default token type when network changes
  useEffect(() => {
    if (network) {
      setFeeConfigs((prev) => {
        return prev.map((config, index) => {
          const newTokenType = getDefaultTokenType(index);
          const isDefaultToken =
            config.tokenType === '0x2::sui::SUI' ||
            config.tokenType === '0x2::iota::IOTA' ||
            config.tokenType === process.env.NEXT_PUBLIC_SUI_DEMO_KRILL_COIN ||
            config.tokenType === process.env.NEXT_PUBLIC_IOTA_DEMO_KRILL_COIN;

          if (isDefaultToken) {
            return {
              ...config,
              tokenType: newTokenType,
              amountPer1000Views: index === 0 ? '10000' : '10',
            };
          }
          return config;
        });
      });
    }
  }, [network, suiWallet, iotaWallet]);

  const effectiveAccount = debugMode
    ? { address: '0x0000000000000000000000000000000000000000000000000000000000000000' }
    : network === 'iota' && iotaWallet
    ? { address: iotaWallet.accounts?.[0]?.address || '' }
    : account;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Validate all files are images
    const invalidFiles = files.filter(file => !file.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      setError(`Invalid files: ${invalidFiles.map(f => f.name).join(', ')}. Only images allowed.`);
      return;
    }

    setSelectedFiles(files);

    // Generate previews
    const previews = files.map(file => URL.createObjectURL(file));
    setFilePreviews(previews);

    // Set default title from first file if empty
    if (!title && files[0]) {
      setTitle(files[0].name.replace(/\.[^/.]+$/, ''));
    }

    setError(null);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(filePreviews[index]);
    setFilePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddFeeConfig = () => {
    setFeeConfigs((prev) => {
      const newIndex = prev.length;
      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          tokenType: getDefaultTokenType(newIndex),
          amountPer1000Views: '10',
          inputMode: 'coin',
        },
      ];
    });
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

  const handleToggleInputMode = (id: string) => {
    setFeeConfigs((prev) =>
      prev.map((config) => {
        if (config.id !== id) return config;
        const newMode: 'coin' | 'usd' = config.inputMode === 'coin' ? 'usd' : 'coin';
        const updatedConfig: FeeConfig = { ...config, inputMode: newMode };

        if (newMode === 'usd') {
          const priceData = coinPriceCache[config.tokenType];
          if (priceData && priceData.usdPrice > 0 && config.amountPer1000Views) {
            const coinNum = parseFloat(config.amountPer1000Views);
            if (!isNaN(coinNum) && coinNum > 0) {
              updatedConfig.usdAmountPer1000Views = (coinNum * priceData.usdPrice).toString();
            }
          }
        } else {
          const priceData = coinPriceCache[config.tokenType];
          if (priceData && priceData.usdPrice > 0 && config.usdAmountPer1000Views) {
            const usdNum = parseFloat(config.usdAmountPer1000Views);
            if (!isNaN(usdNum) && usdNum > 0) {
              updatedConfig.amountPer1000Views = (usdNum / priceData.usdPrice).toString();
            }
          }
        }
        return updatedConfig;
      })
    );
  };

  const handleUpdateUsdAmount = (id: string, usdValue: string) => {
    setFeeConfigs((prev) =>
      prev.map((config) => {
        if (config.id !== id) return config;
        const updatedConfig = { ...config, usdAmountPer1000Views: usdValue };
        const priceData = coinPriceCache[config.tokenType];
        if (priceData && priceData.usdPrice > 0 && usdValue) {
          const usdNum = parseFloat(usdValue);
          if (!isNaN(usdNum) && usdNum > 0) {
            updatedConfig.amountPer1000Views = (usdNum / priceData.usdPrice).toString();
          }
        }
        return updatedConfig;
      })
    );
  };

  const handleUpdateCoinAmount = (id: string, coinValue: string) => {
    setFeeConfigs((prev) =>
      prev.map((config) => {
        if (config.id !== id) return config;
        const updatedConfig = { ...config, amountPer1000Views: coinValue };
        const priceData = coinPriceCache[config.tokenType];
        if (priceData && priceData.usdPrice > 0 && coinValue) {
          const coinNum = parseFloat(coinValue);
          if (!isNaN(coinNum) && coinNum > 0) {
            updatedConfig.usdAmountPer1000Views = (coinNum * priceData.usdPrice).toString();
          }
        }
        return updatedConfig;
      })
    );
  };

  const formatNumber = (value: number): string => {
    return value.toFixed(9).replace(/\.?0+$/, '');
  };

  const handleNextStep = () => {
    if (currentStep === 1 && selectedFiles.length > 0 && title) {
      setCurrentStep(2);
      setError(null);
      setTimeout(() => {
        titleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } else if (currentStep === 2) {
      setCurrentStep(3);
      setError(null);
      setTimeout(() => {
        titleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const handleBackStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
      setError(null);
      setTimeout(() => {
        titleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } else if (currentStep === 3) {
      setCurrentStep(2);
      setError(null);
      setTimeout(() => {
        titleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const handleUpload = async () => {
    if (!selectedFiles.length || !effectiveAccount || !title) return;

    setCurrentStep(4);
    setIsUploading(true);
    setError(null);

    setTimeout(() => {
      titleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    try {
      console.log('[Image Upload] Starting encrypted image upload...');

      // Generate unique content ID
      const contentId = crypto.randomUUID();

      // STEP 1: Create creator config if monetization enabled
      const creatorConfigs: Array<{
        objectId: string;
        chain: string;
        coinType: string;
        pricePerView: string;
        decimals: number;
        metadata?: string;
      }> = [];

      if (feeConfigs.length > 0 && !debugMode && network) {
        console.log('[Image Upload] Creating creator config...');
        setProgress({ stage: 'uploading', percent: 2, message: 'Creating monetization config...' });

        // Creator config creation logic (same as video)
        // TODO: Import and execute tunnel config creation
      }

      // STEP 2: Fund delegator wallet (mainnet only) via PTB
      if (walrusNetwork === 'mainnet' && !debugMode && account) {
        console.log('[Image Upload] Funding delegator wallet with PTB...');

        // Calculate total image size
        const totalImageSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
        const imageSizeMB = totalImageSize / 1024 / 1024;

        // Rough estimate: 0.1 WAL per MB with 10x safety buffer
        // Images are smaller than videos, so this conservative estimate should be sufficient
        const estimatedWalMist = BigInt(Math.ceil(imageSizeMB * 0.1 * 1_000_000_000));
        const walAmountMist = estimatedWalMist * BigInt(10); // 10x buffer for safety

        // Estimate gas needed (images use fewer transactions than video segments)
        // Each image requires ~2 transactions (register + certify)
        const gasNeeded = estimateGasNeeded(selectedFiles.length * 2);

        console.log('[Image Upload] PTB Funding:', {
          totalSizeMB: imageSizeMB.toFixed(2),
          estimatedWal: `${Number(estimatedWalMist) / 1_000_000_000} WAL`,
          walAmountWithBuffer: `${Number(walAmountMist) / 1_000_000_000} WAL (10x buffer)`,
          gasAmount: `${Number(gasNeeded) / 1_000_000_000} SUI`,
          images: selectedFiles.length,
        });

        setProgress({ stage: 'uploading', percent: 5, message: 'Funding delegator wallet...' });

        try {
          // Build PTB that funds BOTH SUI gas and WAL storage in one transaction
          const fundingTx = await buildFundingTransaction(
            account.address,
            gasNeeded,
            walAmountMist
          );

          if (!fundingTx) {
            throw new Error('Failed to build funding transaction');
          }

          // User signs ONCE to fund both SUI gas + WAL storage
          setProgress({ stage: 'uploading', percent: 8, message: 'Approve funding transaction...' });
          console.log('[Image Upload] ⏳ Waiting for user to approve PTB...');

          const fundingResult = await signAndExecuteTransaction({ transaction: fundingTx });

          console.log('[Image Upload] ✓ Delegator funded:', fundingResult.digest);
          setProgress({ stage: 'uploading', percent: 10, message: 'Delegator wallet funded!' });
        } catch (fundingError) {
          console.error('[Image Upload] Funding failed:', fundingError);
          throw new Error(`Failed to fund delegator: ${fundingError instanceof Error ? fundingError.message : 'Unknown error'}`);
        }
      }

      // STEP 3: Encrypt and upload images
      setProgress({ stage: 'encrypting', percent: 15, message: 'Encrypting images...' });

      const { uploadImagesEncrypted } = await import('@/lib/upload/imageUploadOrchestrator');

      let effectiveSignAndExecute;
      let effectiveUploadAddress;

      if (debugMode) {
        effectiveSignAndExecute = async () => ({ digest: 'debug-tx' });
        effectiveUploadAddress = effectiveAccount.address;
      } else if (walrusNetwork === 'mainnet') {
        if (!delegatorAddress || !executeWithDelegator) {
          throw new Error('Delegator wallet not initialized');
        }
        effectiveSignAndExecute = async (args: { transaction: any }) => {
          const result = await executeWithDelegator(args.transaction);
          if (!result) throw new Error('Delegator transaction failed');
          return {
            digest: result.digest,
            effects: result.success ? { status: { status: 'success' } } : { status: { status: 'failure' } },
          };
        };
        effectiveUploadAddress = delegatorAddress;
      } else {
        effectiveSignAndExecute = signAndExecuteTransaction;
        effectiveUploadAddress = effectiveAccount.address;
      }

      const uploadResult = await uploadImagesEncrypted(
        selectedFiles,
        effectiveSignAndExecute,
        effectiveUploadAddress,
        {
          network: walrusNetwork,
          epochs: 53, // ~2 years on mainnet (14 days per epoch)
          onProgress: setProgress,
        }
      );

      console.log('[Image Upload] Upload complete:', uploadResult);

      // STEP 4: Register with server
      setProgress({ stage: 'registering', percent: 95, message: 'Registering images...' });

      const registerResponse = await fetch('/api/v1/register-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId,
          title,
          description,
          creatorId: effectiveAccount.address,
          network: walrusNetwork,
          images: uploadResult.images,
          creatorConfigs,
        }),
      });

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json();
        throw new Error(errorData.error || 'Registration failed');
      }

      const { content } = await registerResponse.json();

      setProgress({ stage: 'complete', percent: 100, message: 'Upload complete!' });
      console.log('[Image Upload] Registered:', content.id);

      // Auto-reclaim gas
      if (walrusNetwork === 'mainnet' && account) {
        await autoReclaimGas(account.address);
      }

      setTimeout(() => {
        router.push(`/images/${content.id}`);
      }, 1000);
    } catch (err) {
      console.error('[Image Upload] Error:', err);

      // Provide user-friendly error messages
      let errorMessage = err instanceof Error ? err.message : 'Upload failed';

      if (errorMessage.includes('No WAL tokens')) {
        if (walrusNetwork === 'mainnet') {
          errorMessage = 'Delegator wallet needs WAL tokens. Please contact support or fund the delegator wallet with WAL tokens to enable mainnet uploads.';
        } else {
          errorMessage = 'No WAL tokens found. Please get testnet WAL from the faucet: https://faucet.walrus-testnet.walrus.space';
        }
      } else if (errorMessage.includes('Delegator wallet not initialized')) {
        errorMessage = 'Delegator wallet is not set up. Please configure the delegator wallet for mainnet uploads or switch to testnet.';
      }

      setError(errorMessage);
      setIsUploading(false);

      if (walrusNetwork === 'mainnet' && account) {
        await autoReclaimGas(account.address).catch(console.error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0668A6] via-[#0668A6] to-[#1AAACE]">
      <div className="pl-20 pr-12 pt-12 pb-6">
        <div className="max-w-4xl">
          {/* Back Button */}
          <button
            onClick={() => router.push('/upload')}
            className="px-4 py-2 bg-white/20 text-white rounded-[32px] font-semibold font-['Outfit'] text-sm hover:bg-white/30 transition-colors mb-4 inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Upload Options
          </button>

          <h1 ref={titleRef} className="text-3xl font-bold font-['Outfit'] text-white mb-2">
            Upload Images
          </h1>
          <p className="text-white/80 text-base font-medium font-['Outfit'] mb-8">
            {currentStep === 1
              ? 'Select your images and add details'
              : currentStep === 2
              ? 'Set monetization fees for your images'
              : currentStep === 3
              ? 'Configure fee sharing with referrers'
              : 'Review your settings and wait for upload to complete'}
          </p>

          {/* Step Indicator */}
          <UploadStepIndicator
            currentStep={currentStep}
            stepLabels={{
              step1: 'Image Details',
              step2: 'Monetization',
              step3: 'Fee Sharing',
            }}
          />

          {/* Step 1: Image Selection */}
          {currentStep === 1 && (
            <div className="p-6 bg-[#FFEEE5] rounded-[32px] shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)] outline outline-[3px] outline-offset-[-3px] outline-black flex flex-col gap-6">
              {/* File Upload */}
              <div>
                <label className="block text-base font-semibold font-['Outfit'] text-black mb-3">
                  Image Files
                </label>
                <div className="relative">
                  <input
                    id="image-files"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    disabled={isUploading}
                    className="hidden"
                  />
                  <label
                    htmlFor="image-files"
                    className={`w-full p-4 bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black flex items-center justify-between cursor-pointer hover:shadow-[2px_2px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span className="text-base font-medium font-['Outfit'] text-black/70">
                      {selectedFiles.length > 0 ? `${selectedFiles.length} image(s) selected` : 'Choose image files...'}
                    </span>
                    <div className="px-4 py-2 bg-black rounded-[32px] shadow-[2px_2px_0_0_black] outline outline-2 outline-white flex items-center gap-2">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-base font-bold font-['Outfit'] text-white">Browse</span>
                    </div>
                  </label>
                </div>

                {/* Image Previews */}
                {selectedFiles.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-4">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="relative p-2 bg-white rounded-xl shadow-[2px_2px_0_0_black] outline outline-2 outline-black">
                        <div className="aspect-square rounded-lg overflow-hidden mb-2">
                          <img
                            src={filePreviews[index]}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="text-xs font-semibold font-['Outfit'] text-black truncate">{file.name}</p>
                        <p className="text-xs font-medium font-['Outfit'] text-black/70">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                        <button
                          onClick={() => handleRemoveFile(index)}
                          disabled={isUploading}
                          className="absolute top-1 right-1 w-6 h-6 bg-[#EF4330] text-white rounded-full flex items-center justify-center hover:bg-[#EF4330]/80 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    ))}
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
                  placeholder="My awesome images"
                  className="w-full px-5 py-3.5 bg-white rounded-2xl
                    shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)]
                    outline outline-2 outline-offset-[-2px] outline-black
                    text-black placeholder-black/40 text-base font-medium font-['Outfit']
                    focus:outline-[#EF4330] focus:outline-[3px]
                    transition-all
                    disabled:opacity-50"
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-base font-semibold font-['Outfit'] text-black mb-3">
                  Description (Optional)
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isUploading}
                  placeholder="Describe your images..."
                  rows={4}
                  className="w-full px-5 py-3.5 bg-white rounded-2xl
                    shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)]
                    outline outline-2 outline-offset-[-2px] outline-black
                    text-black placeholder-black/40 text-base font-medium font-['Outfit']
                    focus:outline-[#EF4330] focus:outline-[3px]
                    transition-all
                    disabled:opacity-50
                    resize-none"
                />
              </div>

              {/* Next Button */}
              <button
                onClick={handleNextStep}
                disabled={selectedFiles.length === 0 || !title}
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

          {/* Step 2: Monetization */}
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

              {/* Navigation */}
              <div className="flex gap-4">
                <button
                  onClick={handleBackStep}
                  className="flex-1 bg-white text-black py-4 px-6 rounded-[32px] font-bold font-['Outfit'] text-lg
                    shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)]
                    outline outline-[3px] outline-black
                    hover:shadow-[2px_2px_0_0_black]
                    hover:translate-x-[1px] hover:translate-y-[1px]
                    transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleNextStep}
                  className="flex-1 bg-[#EF4330] text-white py-4 px-6 rounded-[32px] font-bold font-['Outfit'] text-lg
                    shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)]
                    outline outline-[3px] outline-white
                    hover:shadow-[2px_2px_0_0_black]
                    hover:translate-x-[1px] hover:translate-y-[1px]
                    transition-all"
                >
                  Next: Fee Sharing
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Fee Sharing */}
          {currentStep === 3 && (
            <div className="p-6 bg-[#FFEEE5] rounded-[32px] shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)] outline outline-[3px] outline-offset-[-3px] outline-black flex flex-col gap-6">
              <Step3FeeSharing
                referrerSharePercent={referrerSharePercent}
                onReferrerShareChange={setReferrerSharePercent}
                onShowPlatformFeeDialog={() => {}}
                network={network}
              />

              {/* Navigation */}
              <div className="flex gap-4">
                <button
                  onClick={handleBackStep}
                  disabled={isUploading}
                  className="flex-1 bg-white text-black py-4 px-6 rounded-[32px] font-bold font-['Outfit'] text-lg
                    shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)]
                    outline outline-[3px] outline-black
                    hover:shadow-[2px_2px_0_0_black]
                    hover:translate-x-[1px] hover:translate-y-[1px]
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!selectedFiles.length || !effectiveAccount || !title || isUploading}
                  className="flex-1 bg-[#EF4330] text-white py-4 px-6 rounded-[32px] font-bold font-['Outfit'] text-lg
                    shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)]
                    outline outline-[3px] outline-white
                    hover:shadow-[2px_2px_0_0_black]
                    hover:translate-x-[1px] hover:translate-y-[1px]
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all"
                >
                  {isUploading ? 'Uploading...' : 'Start Upload'}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Upload Progress */}
          {currentStep === 4 && (
            <div className="p-6 bg-[#FFEEE5] rounded-[32px] shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)] outline outline-[3px] outline-offset-[-3px] outline-black flex flex-col gap-6">
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

              {error && (
                <div className="p-4 bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-[#EF4330]">
                  <p className="text-base font-semibold font-['Outfit'] text-[#EF4330]">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ImagesUploadPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading...</div>
      </div>
    }>
      <ImagesUploadContent />
    </Suspense>
  );
}
