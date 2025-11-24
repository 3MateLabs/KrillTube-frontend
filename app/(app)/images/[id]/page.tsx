'use client';

/**
 * Image Viewing Page: Display Decrypted Images
 * Fetches and displays images stored on Walrus with client-side encryption
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';

interface ImageData {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  createdAt: string;
}

interface ImageContentData {
  id: string;
  title: string;
  description: string | null;
  creatorId: string;
  network: string;
  createdAt: string;
  images: ImageData[];
}

export default function ImageViewPage() {
  const params = useParams();
  const router = useRouter();
  const contentId = params.id as string;

  const [content, setContent] = useState<imgContentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch image content metadata
        const response = await fetch(`/api/v1/image-content/${contentId}`);
        if (!response.ok) {
          throw new Error('Failed to load image content');
        }

        const data = await response.json();
        setContent(data.content);
      } catch (err) {
        console.error('[Image View] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load images');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [contentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0668A6] via-[#0668A6] to-[#1AAACE] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg font-semibold font-['Outfit']">Loading images...</p>
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0668A6] via-[#0668A6] to-[#1AAACE]">
        <div className="pl-20 pr-12 pt-12 pb-6">
          <div className="max-w-4xl">
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-white/20 text-white rounded-[32px] font-semibold font-['Outfit'] text-sm hover:bg-white/30 transition-colors mb-4 inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Home
            </button>

            <div className="p-6 bg-[#FFEEE5] rounded-[32px] shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)] outline outline-[3px] outline-offset-[-3px] outline-black">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#EF4330] rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold font-['Outfit'] text-black mb-2">Error Loading Images</h2>
                <p className="text-base font-medium font-['Outfit'] text-black/70">{error || 'Content not found'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const selectedImage = content.images[selectedImageIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0668A6] via-[#0668A6] to-[#1AAACE]">
      <div className="pl-20 pr-12 pt-12 pb-6">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-white/20 text-white rounded-[32px] font-semibold font-['Outfit'] text-sm hover:bg-white/30 transition-colors mb-4 inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </button>

          {/* Title */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold font-['Outfit'] text-white mb-2">{content.title}</h1>
            {content.description && (
              <p className="text-white/80 text-base font-medium font-['Outfit']">{content.description}</p>
            )}
            <p className="text-white/60 text-sm font-medium font-['Outfit'] mt-2">
              {content.images.length} {content.images.length === 1 ? 'image' : 'images'} • Uploaded {new Date(content.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Image Display */}
            <div className="lg:col-span-2">
              <div className="p-4 bg-[#FFEEE5] rounded-[32px] shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)] outline outline-[3px] outline-offset-[-3px] outline-black">
                <div className="relative w-full bg-black rounded-2xl overflow-hidden shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black" style={{ aspectRatio: '16/9' }}>
                  <img
                    src={`/api/v1/images/${selectedImage.id}`}
                    alt={selectedImage.filename}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Image Info */}
                <div className="mt-4 p-4 bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-base font-bold font-['Outfit'] text-black">{selectedImage.filename}</p>
                      <p className="text-sm font-medium font-['Outfit'] text-black/70 mt-1">
                        {(selectedImage.size / 1024).toFixed(1)} KB • {selectedImage.mimeType}
                      </p>
                    </div>
                    <a
                      href={`/api/v1/images/${selectedImage.id}`}
                      download={selectedImage.filename}
                      className="px-4 py-2 bg-[#EF4330] text-white rounded-2xl font-semibold font-['Outfit'] text-sm shadow-[2px_2px_0_0_black] outline outline-2 outline-offset-[-2px] outline-black hover:shadow-[1px_1px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                    >
                      Download
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Thumbnail Grid */}
            <div className="lg:col-span-1">
              <div className="p-4 bg-[#FFEEE5] rounded-[32px] shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)] outline outline-[3px] outline-offset-[-3px] outline-black">
                <h3 className="text-lg font-bold font-['Outfit'] text-black mb-4">All Images</h3>
                <div className="grid grid-cols-2 gap-3 max-h-[600px] overflow-y-auto">
                  {content.images.map((img, index) => (
                    <button
                      key={img.id}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`relative aspect-square rounded-xl overflow-hidden outline outline-2 outline-offset-[-2px] transition-all ${
                        selectedImageIndex === index
                          ? 'outline-[#EF4330] outline-[3px] shadow-[3px_3px_0px_0px_rgba(239,67,48,1.00)]'
                          : 'outline-black hover:outline-[#EF4330] shadow-[2px_2px_0px_0px_rgba(0,0,0,1.00)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)]'
                      }`}
                    >
                      <img
                        src={`/api/v1/images/${img.id}`}
                        alt={img.filename}
                        className="w-full h-full object-cover"
                      />
                      {selectedImageIndex === index && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-[#EF4330] rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Creator Info */}
          <div className="mt-6 p-4 bg-[#FFEEE5] rounded-[32px] shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)] outline outline-[3px] outline-offset-[-3px] outline-black">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-black rounded-full shadow-[3px_3px_0_0_black] outline outline-2 outline-white flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium font-['Outfit'] text-black/70">Created by</p>
                <p className="text-base font-bold font-['Outfit'] text-black">{content.creatorId.slice(0, 10)}...{content.creatorId.slice(-8)}</p>
              </div>
              <div className="ml-auto">
                <span className="px-3 py-1 bg-[#1AAACE] text-white rounded-full text-xs font-bold font-['Outfit'] shadow-[2px_2px_0_0_black] outline outline-2 outline-black">
                  {content.network === 'mainnet' ? 'Mainnet' : 'Testnet'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
