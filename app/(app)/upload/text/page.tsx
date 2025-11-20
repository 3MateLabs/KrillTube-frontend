'use client';

/**
 * Text/Markdown Upload Page
 * Upload text articles and markdown content with monetization
 */

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useSignAndExecuteTransaction as useIotaSignAndExecuteTransaction } from '@iota/dapp-kit';
import { Step2Monetization } from '@/components/upload/Step2Monetization';
import { Step3FeeSharing } from '@/components/upload/Step3FeeSharing';
import { UploadStepIndicator } from '@/components/upload/UploadStepIndicator';
import { useCurrentWalletMultiChain } from '@/lib/hooks/useCurrentWalletMultiChain';
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
  const account = useCurrentAccount();
  const { network } = useCurrentWalletMultiChain();
  const { mutateAsync: iotaSignAndExecuteTransaction } = useIotaSignAndExecuteTransaction();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [allowSubscription, setAllowSubscription] = useState<boolean>(true);
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

  // Format number helper
  const formatNumber = (value: number): string => {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

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
                  {content.trim().split(/\s+/).filter(Boolean).length}
                </span>
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
              allowSubscription={allowSubscription}
              onToggleSubscription={() => setAllowSubscription(!allowSubscription)}
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
              onUpdateReferrerShare={(value) => setReferrerSharePercent(value)}
            />

            {/* Navigation */}
            <div className="flex justify-between mt-4">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-6 py-3 bg-white text-black rounded-[32px] font-semibold font-['Outfit'] shadow-[2px_2px_0_0_black] outline outline-2 outline-black hover:shadow-[1px_1px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
              >
                Back
              </button>
              <button
                onClick={() => {
                  // TODO: Implement upload logic
                  alert('Text content upload coming soon!');
                }}
                className="px-6 py-3 bg-[#EF4330] text-white rounded-[32px] font-semibold font-['Outfit'] shadow-[2px_2px_0_0_black] outline outline-2 outline-white hover:shadow-[1px_1px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
              >
                Publish Article
              </button>
            </div>
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
