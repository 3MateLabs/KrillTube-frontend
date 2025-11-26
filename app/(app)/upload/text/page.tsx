'use client';

/**
 * Text/Markdown Upload Page
 * Upload text articles and markdown content with monetization
 */

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { useSignAndExecuteTransaction as useIotaSignAndExecuteTransaction } from '@iota/dapp-kit';
import { Step2Monetization } from '@/components/upload/Step2Monetization';
import { Step3FeeSharing } from '@/components/upload/Step3FeeSharing';
import { UploadStepIndicator } from '@/components/upload/UploadStepIndicator';
import { useCurrentWalletMultiChain } from '@/lib/hooks/useCurrentWalletMultiChain';
import { useNetwork } from '@/contexts/NetworkContext';
import { usePersonalDelegator } from '@/lib/hooks/usePersonalDelegator';
import { uploadTextEncrypted, type UploadProgress } from '@/lib/upload/textUploadOrchestrator';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

function TextUploadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const account = useCurrentAccount();
  const { network } = useCurrentWalletMultiChain();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const { mutateAsync: iotaSignAndExecuteTransaction } = useIotaSignAndExecuteTransaction();
  const { walrusNetwork } = useNetwork();
  const { buildFundingTransaction, estimateGasNeeded, executeWithDelegator, delegatorAddress, autoReclaimGas } = usePersonalDelegator();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [wordsPerChunk, setWordsPerChunk] = useState<number>(500); // Default: 500 words per chunk
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
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  // Format number helper
  const formatNumber = (value: number): string => {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  // Calculate word count and chunks
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const calculatedChunks = Math.max(1, Math.ceil(wordCount / wordsPerChunk));

  // Fee config handlers
  const handleAddFeeConfig = () => {
    setFeeConfigs([
      ...feeConfigs,
      {
        id: crypto.randomUUID(),
        tokenType: network === 'iota' ? '0x2::iota::IOTA' : '0x2::sui::SUI',
        amountPer1000Views: '10',
        inputMode: 'coin',
      },
    ]);
  };

  const handleRemoveFeeConfig = (id: string) => {
    if (feeConfigs.length > 1) {
      setFeeConfigs(feeConfigs.filter((config) => config.id !== id));
    }
  };

  const handleUpdateFeeConfig = (id: string, field: keyof FeeConfig, value: string) => {
    setFeeConfigs(
      feeConfigs.map((config) => (config.id === id ? { ...config, [field]: value } : config))
    );
  };

  const handleUpdateCoinAmount = (id: string, value: string) => {
    handleUpdateFeeConfig(id, 'amountPer1000Views', value);
  };

  const handleUpdateUsdAmount = (id: string, value: string) => {
    handleUpdateFeeConfig(id, 'usdAmountPer1000Views', value);
  };

  const handleToggleInputMode = (id: string) => {
    setFeeConfigs(
      feeConfigs.map((config) =>
        config.id === id
          ? { ...config, inputMode: config.inputMode === 'coin' ? 'usd' : 'coin' }
          : config
      )
    );
  };

  // Upload handler
  const handleUpload = async () => {
    try {
      setIsUploading(true);
      setError(null);
      setProgress({ stage: 'encrypting', percent: 0, message: 'Preparing upload...' });

      // Validate wallet connection
      if (!account) {
        throw new Error('Please connect your wallet');
      }

      // Generate unique content ID
      const contentId = crypto.randomUUID();

      // Create text file from content
      const blob = new Blob([content], { type: 'text/plain' });
      const file = new File([blob], `${title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`, { type: 'text/plain' });

      // Fund delegator wallet (mainnet only) via PTB
      if (walrusNetwork === 'mainnet' && account) {
        console.log('[Text Upload] Funding delegator wallet with PTB...');

        // Calculate text file size
        const fileSizeMB = file.size / 1024 / 1024;

        // Rough estimate: 0.05 WAL per MB with 10x safety buffer
        // Text files are very small, so conservative estimate
        const estimatedWalMist = BigInt(Math.ceil(fileSizeMB * 0.05 * 1_000_000_000));
        const walAmountMist = estimatedWalMist * BigInt(10); // 10x buffer for safety

        // Estimate gas needed (text uses minimal transactions)
        const gasNeeded = estimateGasNeeded(2); // 2 transactions for text upload

        console.log('[Text Upload] PTB Funding:', {
          fileSizeMB: fileSizeMB.toFixed(4),
          estimatedWal: `${Number(estimatedWalMist) / 1_000_000_000} WAL`,
          walAmountWithBuffer: `${Number(walAmountMist) / 1_000_000_000} WAL (10x buffer)`,
          gasAmount: `${Number(gasNeeded) / 1_000_000_000} SUI`,
        });

        setProgress({ stage: 'encrypting', percent: 5, message: 'Funding delegator wallet...' });

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
          setProgress({ stage: 'encrypting', percent: 8, message: 'Approve funding transaction...' });
          console.log('[Text Upload] ⏳ Waiting for user to approve PTB...');

          const fundingResult = await signAndExecuteTransaction({ transaction: fundingTx });

          console.log('[Text Upload] ✓ Delegator funded:', fundingResult.digest);
          setProgress({ stage: 'encrypting', percent: 10, message: 'Delegator wallet funded!' });
        } catch (fundingError) {
          console.error('[Text Upload] Funding failed:', fundingError);
          throw new Error(`Failed to fund delegator: ${fundingError instanceof Error ? fundingError.message : 'Unknown error'}`);
        }
      }

      // Determine wallet setup based on network
      let effectiveSignAndExecute: any;
      let effectiveUploadAddress: string;

      if (walrusNetwork === 'mainnet') {
        // Use delegator wallet for mainnet
        if (!delegatorAddress || !executeWithDelegator) {
          throw new Error('Delegator wallet not initialized');
        }

        effectiveSignAndExecute = async (args: { transaction: any }) => {
          const result = await executeWithDelegator(args.transaction);
          if (!result) {
            throw new Error('Delegator transaction failed');
          }
          return {
            digest: result.digest,
            effects: result.success
              ? { status: { status: 'success' } }
              : { status: { status: 'failure' } },
          };
        };
        effectiveUploadAddress = delegatorAddress;

        console.log('[Text Upload] Using delegator wallet for mainnet:', delegatorAddress);
      } else {
        // Use user's own wallet for testnet
        effectiveSignAndExecute = signAndExecuteTransaction;
        effectiveUploadAddress = account.address;

        console.log('[Text Upload] Using user wallet for testnet:', account.address);
      }

      // Encrypt and upload text document
      console.log('[Text Upload] Starting encryption and upload...');
      const uploadResult = await uploadTextEncrypted(
        file,
        effectiveSignAndExecute,
        effectiveUploadAddress,
        {
          network: walrusNetwork,
          epochs: 53,
          onProgress: setProgress,
        }
      );

      console.log('[Text Upload] ✓ Encryption and upload complete');

      // Prepare creator configs for monetization
      const creatorConfigs = feeConfigs.map(config => ({
        objectId: crypto.randomUUID(), // TODO: Replace with actual on-chain object ID
        chain: 'sui',
        coinType: config.tokenType,
        pricePerView: config.amountPer1000Views,
        decimals: 9, // TODO: Fetch actual decimals from coin metadata
        metadata: tags || undefined,
      }));

      // Register text content with server
      setProgress({ stage: 'registering', percent: 90, message: 'Registering document...' });

      const registerResponse = await fetch('/api/v1/register-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentId,
          title,
          description: tags,
          creatorId: account.address,
          network: walrusNetwork,
          document: uploadResult.document,
          creatorConfigs,
        }),
      });

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json();
        throw new Error(errorData.error || 'Failed to register text content');
      }

      const registerData = await registerResponse.json();
      console.log('[Text Upload] ✓ Text content registered:', registerData.content.id);

      setProgress({ stage: 'complete', percent: 100, message: 'Upload complete!' });

      // Auto-reclaim gas
      if (walrusNetwork === 'mainnet' && account) {
        await autoReclaimGas(account.address);
      }

      // Redirect to viewing page
      setTimeout(() => {
        router.push(`/text/${registerData.content.id}`);
      }, 1500);

    } catch (err) {
      console.error('[Text Upload] Error:', err);

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

      // Auto-reclaim on error too if on mainnet
      if (walrusNetwork === 'mainnet' && account) {
        await autoReclaimGas(account.address).catch(console.error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0668A6] via-[#0668A6] to-[#1AAACE] pl-20 pr-12 pt-12 pb-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/upload')}
            className="px-4 py-2 bg-white/20 text-white rounded-[32px] font-semibold font-['Outfit'] text-sm hover:bg-white/30 transition-colors mb-4 inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Upload Options
          </button>
          <h1 className="text-4xl font-bold text-white mb-3 font-['Outfit']">Upload Text Content</h1>
          <p className="text-xl text-white/80 font-medium font-['Outfit']">
            Share articles and markdown content with monetization
          </p>
        </div>

        {/* Progress Steps */}
        <UploadStepIndicator
          currentStep={currentStep}
          stepLabels={{
            step1: 'Content Details',
            step2: 'Monetization',
            step3: 'Fee Sharing',
          }}
        />

        {/* Step 1: Content Editor */}
        {currentStep === 1 && (
          <div className="p-6 bg-[#FFEEE5] rounded-[32px] shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)] outline outline-[3px] outline-offset-[-3px] outline-black flex flex-col gap-6">
            <h2 className="text-2xl font-bold text-black font-['Outfit']">Content Details</h2>

            {/* Title */}
            <div className="p-6 bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black">
              <label className="block mb-2 text-base font-bold text-black font-['Outfit']">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter your article title"
                className="w-full px-4 py-3 border-2 border-black rounded-lg font-['Outfit'] text-black focus:outline-none focus:ring-2 focus:ring-[#EF4330]"
              />
            </div>

            {/* Tags */}
            <div className="p-6 bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black">
              <label className="block mb-2 text-base font-bold text-black font-['Outfit']">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. tutorial, blockchain, web3"
                className="w-full px-4 py-3 border-2 border-black rounded-lg font-['Outfit'] text-black focus:outline-none focus:ring-2 focus:ring-[#EF4330]"
              />
            </div>

            {/* Content Editor */}
            <div className="p-6 bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black">
              <div className="flex items-center justify-between mb-2">
                <label className="text-base font-bold text-black font-['Outfit']">
                  Content (Markdown supported)
                </label>
                <button
                  onClick={() => setPreviewMode(!previewMode)}
                  className="px-4 py-2 bg-[#0668A6] text-white rounded-[32px] font-semibold font-['Outfit'] text-sm shadow-[2px_2px_0_0_black] outline outline-2 outline-white hover:shadow-[1px_1px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                >
                  {previewMode ? 'Edit' : 'Preview'}
                </button>
              </div>

              {!previewMode ? (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your content here... Full markdown support:&#10;&#10;# Heading 1&#10;## Heading 2&#10;### Heading 3&#10;&#10;**bold text** and *italic text*&#10;&#10;[Link text](https://example.com)&#10;&#10;![Image alt text](https://example.com/image.jpg)&#10;&#10;- Bullet list&#10;- Item 2&#10;&#10;1. Numbered list&#10;2. Item 2&#10;&#10;| Column 1 | Column 2 |&#10;|----------|----------|&#10;| Cell 1   | Cell 2   |&#10;&#10;`inline code` and&#10;&#10;```&#10;code block&#10;```"
                  rows={20}
                  className="w-full px-4 py-3 border-2 border-black rounded-lg font-['Outfit'] font-mono text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#EF4330]"
                />
              ) : (
                <div className="w-full px-4 py-3 border-2 border-black rounded-lg font-['Outfit'] min-h-[500px] overflow-auto text-black
                  prose prose-slate max-w-none
                  prose-headings:font-bold prose-headings:text-black
                  prose-h1:text-3xl prose-h1:mb-4 prose-h1:mt-6
                  prose-h2:text-2xl prose-h2:mb-3 prose-h2:mt-5
                  prose-h3:text-xl prose-h3:mb-2 prose-h3:mt-4
                  prose-p:text-black prose-p:my-3
                  prose-a:text-[#0668A6] prose-a:underline hover:prose-a:text-[#1AAACE]
                  prose-strong:text-black prose-strong:font-bold
                  prose-em:text-black prose-em:italic
                  prose-code:text-[#EF4330] prose-code:bg-black/5 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                  prose-pre:bg-black/90 prose-pre:text-white prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto
                  prose-blockquote:border-l-4 prose-blockquote:border-[#0668A6] prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-black
                  prose-ul:list-disc prose-ul:ml-6 prose-ul:text-black
                  prose-ol:list-decimal prose-ol:ml-6 prose-ol:text-black
                  prose-li:text-black prose-li:my-1
                  prose-table:border-collapse prose-table:w-full prose-table:text-black
                  prose-th:border prose-th:border-black prose-th:bg-[#FFEEE5] prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:font-bold prose-th:text-black
                  prose-td:border prose-td:border-black prose-td:px-4 prose-td:py-2 prose-td:text-black
                  prose-img:rounded-lg prose-img:shadow-lg prose-img:my-4">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content || '*Preview will appear here...*'}
                  </ReactMarkdown>
                </div>
              )}

              {/* Helper Text */}
              <div className="mt-2 text-sm text-black/60 font-medium font-['Outfit']">
                Full Markdown support: Headers, **bold**, *italic*, [links](url), ![images](url), tables, code blocks, lists, and more
              </div>
            </div>

            {/* Word Count */}
            <div className="p-4 bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-black font-['Outfit']">
                  Word Count:
                </span>
                <span className="text-base font-bold text-[#EF4330] font-['Outfit']">
                  {wordCount}
                </span>
              </div>
            </div>

            {/* Chunk Configuration */}
            <div className="p-6 bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black">
              <h3 className="text-lg font-bold text-black font-['Outfit'] mb-4">Content Encryption Chunks</h3>
              <p className="text-sm text-black/70 font-medium font-['Outfit'] mb-4">
                Your content will be encrypted and split into chunks. Users pay per chunk they access.
              </p>

              <div className="space-y-4">
                {/* Words Per Chunk */}
                <div>
                  <label className="block mb-2 text-sm font-semibold text-black font-['Outfit']">
                    Words per chunk
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="2000"
                    step="100"
                    value={wordsPerChunk}
                    onChange={(e) => setWordsPerChunk(Math.max(100, parseInt(e.target.value) || 500))}
                    className="w-full px-4 py-3 border-2 border-black rounded-lg font-['Outfit'] text-black focus:outline-none focus:ring-2 focus:ring-[#EF4330]"
                  />
                  <p className="mt-1 text-xs text-black/60 font-medium font-['Outfit']">
                    Recommended: 500 words per chunk (range: 100-2000)
                  </p>
                </div>

                {/* Calculated Chunks Display */}
                <div className="p-4 bg-[#FFEEE5] rounded-lg border-2 border-black">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-black font-['Outfit']">
                        Total Chunks
                      </div>
                      <div className="text-xs text-black/70 font-medium font-['Outfit'] mt-1">
                        Based on {wordCount} words ÷ {wordsPerChunk} words/chunk
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-[#EF4330] font-['Outfit']">
                      {calculatedChunks}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
              <button
                onClick={() => router.push('/upload')}
                className="px-6 py-3 bg-white text-black rounded-[32px] font-semibold font-['Outfit'] shadow-[2px_2px_0_0_black] outline outline-2 outline-black hover:shadow-[1px_1px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!title) {
                    setError('Please enter a title');
                    return;
                  }
                  if (!content) {
                    setError('Please enter some content');
                    return;
                  }
                  setError(null);
                  setCurrentStep(2);
                }}
                className="px-6 py-3 bg-[#EF4330] text-white rounded-[32px] font-semibold font-['Outfit'] shadow-[2px_2px_0_0_black] outline outline-2 outline-white hover:shadow-[1px_1px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
              >
                Next: Set Monetization
              </button>
            </div>

            {error && (
              <div className="p-4 bg-[#EF4330]/10 border-2 border-[#EF4330] rounded-lg">
                <p className="text-[#EF4330] font-semibold font-['Outfit']">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Monetization (Shared Component) */}
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
            <div className="flex justify-between mt-4">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-6 py-3 bg-white text-black rounded-[32px] font-semibold font-['Outfit'] shadow-[2px_2px_0_0_black] outline outline-2 outline-black hover:shadow-[1px_1px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
              >
                Back
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                className="px-6 py-3 bg-[#EF4330] text-white rounded-[32px] font-semibold font-['Outfit'] shadow-[2px_2px_0_0_black] outline outline-2 outline-white hover:shadow-[1px_1px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
              >
                Next: Fee Sharing
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Fee Sharing (Shared Component) */}
        {currentStep === 3 && (
          <div className="p-6 bg-[#FFEEE5] rounded-[32px] shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)] outline outline-[3px] outline-offset-[-3px] outline-black flex flex-col gap-6">
            <Step3FeeSharing
              referrerSharePercent={referrerSharePercent}
              onReferrerShareChange={(value) => setReferrerSharePercent(value)}
              onShowPlatformFeeDialog={() => {}}
            />

            {/* Navigation */}
            <div className="flex justify-between mt-4">
              <button
                onClick={() => setCurrentStep(2)}
                disabled={isUploading}
                className="px-6 py-3 bg-white text-black rounded-[32px] font-semibold font-['Outfit'] shadow-[2px_2px_0_0_black] outline outline-2 outline-black hover:shadow-[1px_1px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Back
              </button>
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="px-6 py-3 bg-[#EF4330] text-white rounded-[32px] font-semibold font-['Outfit'] shadow-[2px_2px_0_0_black] outline outline-2 outline-white hover:shadow-[1px_1px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? 'Publishing...' : 'Publish Article'}
              </button>
            </div>

            {/* Upload Progress */}
            {isUploading && progress && (
              <div className="p-4 bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base font-semibold text-black font-['Outfit']">
                    {progress.message}
                  </span>
                  <span className="text-base font-bold text-[#EF4330] font-['Outfit']">
                    {progress.percent}%
                  </span>
                </div>
                <div className="w-full h-2 bg-black/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#EF4330] transition-all duration-300"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-[#EF4330]/10 border-2 border-[#EF4330] rounded-lg">
                <p className="text-[#EF4330] font-semibold font-['Outfit']">{error}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TextUploadPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TextUploadContent />
    </Suspense>
  );
}
