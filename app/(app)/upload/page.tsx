'use client';

/**
 * Upload Landing Page
 * Choose what type of content to upload: Video, Images, or Text
 */

import { useRouter } from 'next/navigation';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { ChainSelector } from '@/components/wallet/ChainSelector';

export default function UploadLandingPage() {
  const router = useRouter();
  const account = useCurrentAccount();

  const uploadOptions = [
    {
      type: 'video',
      title: 'Upload Video',
      description: 'Share your video content with the world',
      icon: (
        <svg className="w-16 h-16 text-black" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
        </svg>
      ),
      path: '/upload/video',
    },
    {
      type: 'image',
      title: 'Upload Images',
      description: 'Share your photos and artwork',
      icon: (
        <svg className="w-16 h-16 text-black" fill="currentColor" viewBox="0 0 24 24">
          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
        </svg>
      ),
      path: '/upload/image',
    },
    {
      type: 'text',
      title: 'Upload Text',
      description: 'Share articles and markdown content',
      icon: (
        <svg className="w-16 h-16 text-black" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
        </svg>
      ),
      path: '/upload/text',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0668A6] via-[#0668A6] to-[#1AAACE] pl-20 pr-12 pt-12 pb-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-3 font-['Outfit']">
            Upload Content
          </h1>
          <p className="text-xl text-white/80 font-medium font-['Outfit']">
            {account?.address
              ? 'Choose the type of content you want to upload'
              : 'Connect your wallet to start uploading'}
          </p>
        </div>

        {account?.address ? (
          <>
            {/* Upload Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {uploadOptions.map((option) => (
                <button
                  key={option.type}
                  onClick={() => router.push(option.path)}
                  className="p-8 bg-white rounded-[32px]
                    shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)]
                    outline outline-[3px] outline-offset-[-3px] outline-black
                    hover:shadow-[3px_3px_0_0_black]
                    hover:translate-x-[2px]
                    hover:translate-y-[2px]
                    hover:bg-[#FFEEE5]
                    transition-all
                    flex flex-col items-center gap-6
                    cursor-pointer"
                >
                  {/* Icon */}
                  <div className="w-24 h-24 bg-[#FFEEE5] rounded-full
                    border-[3px] border-black
                    shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)]
                    flex items-center justify-center">
                    {option.icon}
                  </div>

                  {/* Content */}
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-black mb-2 font-['Outfit']">
                      {option.title}
                    </h3>
                    <p className="text-base text-black/70 font-medium font-['Outfit']">
                      {option.description}
                    </p>
                  </div>

                  {/* Arrow Icon */}
                  <div className="mt-2">
                    <svg className="w-8 h-8 text-[#EF4330]" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>

            {/* Additional Info */}
            <div className="mt-12 p-6 bg-white/10 rounded-2xl border-2 border-white/30">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-[#0668A6]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-white mb-2 font-['Outfit']">
                    All content types support monetization
                  </h4>
                  <p className="text-base text-white/80 font-medium font-['Outfit']">
                    Set your pricing, enable subscriptions, and configure fee sharing for any content you upload.
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          // Wallet connection required message
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-32 h-32 bg-white/20 rounded-full border-[3px] border-white flex items-center justify-center mb-8">
              <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4 font-['Outfit']">
              Wallet Connection Required
            </h2>
            <p className="text-lg text-white/80 mb-8 text-center max-w-md font-medium font-['Outfit']">
              Please connect your wallet to upload content to KrillTube
            </p>
            <ChainSelector />
          </div>
        )}
      </div>
    </div>
  );
}
