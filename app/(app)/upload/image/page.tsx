'use client';

/**
 * Image Upload Page
 * Upload images with monetization and fee sharing
 */

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useSignAndExecuteTransaction as useIotaSignAndExecuteTransaction } from '@iota/dapp-kit';
import { Step2Monetization } from '@/components/upload/Step2Monetization';
import { Step3FeeSharing } from '@/components/upload/Step3FeeSharing';
import { UploadStepIndicator } from '@/components/upload/UploadStepIndicator';
import { useCurrentWalletMultiChain } from '@/lib/hooks/useCurrentWalletMultiChain';
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

function ImageUploadContent() {
  const router = useRouter();
  const account = useCurrentAccount();
  const { network } = useCurrentWalletMultiChain();
  const { mutateAsync: iotaSignAndExecuteTransaction } = useIotaSignAndExecuteTransaction();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setSelectedImages(files);

    // Generate previews
    const previews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  // Remove image
  const handleRemoveImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

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
          <h1 className="text-4xl font-bold text-white mb-3 font-['Outfit']">Upload Images</h1>
          <p className="text-xl text-white/80 font-medium font-['Outfit']">
            Share your photos and artwork with monetization
          </p>
        </div>

        {/* Progress Steps */}
        <UploadStepIndicator
          currentStep={currentStep}
          stepLabels={{
            step1: 'Image Details',
            step2: 'Monetization',
            step3: 'Fee Sharing',
          }}
        />

        {/* Step 1: Image Details */}
        {currentStep === 1 && (
          <div className="p-6 bg-[#FFEEE5] rounded-[32px] shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)] outline outline-[3px] outline-offset-[-3px] outline-black flex flex-col gap-6">
            <h2 className="text-2xl font-bold text-black font-['Outfit']">Image Details</h2>

            {/* Image Selection */}
            <div className="p-6 bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black">
              <label className="block mb-2 text-base font-bold text-black font-['Outfit']">
                Select Images
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-6 py-4 bg-[#0668A6] text-white rounded-[32px] font-semibold font-['Outfit'] text-base shadow-[2px_2px_0_0_black] outline outline-2 outline-white hover:shadow-[1px_1px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
              >
                {selectedImages.length === 0 ? 'Choose Images' : `${selectedImages.length} image(s) selected`}
              </button>

              {/* Image Previews */}
              {imagePreviews.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-xl border-2 border-black"
                      />
                      <button
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-2 right-2 w-6 h-6 bg-[#EF4330] text-white rounded-full flex items-center justify-center text-sm font-bold hover:bg-[#d63b29] transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Title */}
            <div className="p-6 bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black">
              <label className="block mb-2 text-base font-bold text-black font-['Outfit']">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title for your images"
                className="w-full px-4 py-3 border-2 border-black rounded-lg font-['Outfit'] text-black focus:outline-none focus:ring-2 focus:ring-[#EF4330]"
              />
            </div>

            {/* Description */}
            <div className="p-6 bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black">
              <label className="block mb-2 text-base font-bold text-black font-['Outfit']">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your images"
                rows={4}
                className="w-full px-4 py-3 border-2 border-black rounded-lg font-['Outfit'] text-black focus:outline-none focus:ring-2 focus:ring-[#EF4330]"
              />
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
                  if (selectedImages.length === 0) {
                    setError('Please select at least one image');
                    return;
                  }
                  if (!title) {
                    setError('Please enter a title');
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
                  alert('Image upload coming soon!');
                }}
                className="px-6 py-3 bg-[#EF4330] text-white rounded-[32px] font-semibold font-['Outfit'] shadow-[2px_2px_0_0_black] outline outline-2 outline-white hover:shadow-[1px_1px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
              >
                Upload Images
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ImageUploadPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ImageUploadContent />
    </Suspense>
  );
}
