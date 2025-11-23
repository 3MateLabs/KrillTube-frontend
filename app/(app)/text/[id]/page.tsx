'use client';

/**
 * Text Viewing Page: Display Decrypted Text Documents
 * Fetches and displays text documents stored on Walrus with client-side encryption
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface TextDocumentData {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  charCount: number | null;
  wordCount: number | null;
  createdAt: string;
}

interface TextContentData {
  id: string;
  title: string;
  description: string | null;
  creatorId: string;
  network: string;
  createdAt: string;
  document: TextDocumentData | null;
}

export default function TextViewPage() {
  const params = useParams();
  const router = useRouter();
  const contentId = params.id as string;

  const [content, setContent] = useState<TextContentData | null>(null);
  const [textContent, setTextContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch text content metadata
        const metadataResponse = await fetch(`/api/v1/text-content/${contentId}`);
        if (!metadataResponse.ok) {
          throw new Error('Failed to load text content metadata');
        }

        const metadataData = await metadataResponse.json();
        setContent(metadataData.content);

        if (!metadataData.content.document) {
          throw new Error('No document found');
        }

        // Fetch decrypted text
        const textResponse = await fetch(`/api/v1/text/${metadataData.content.document.id}`);
        if (!textResponse.ok) {
          throw new Error('Failed to load text content');
        }

        const text = await textResponse.text();
        setTextContent(text);
      } catch (err) {
        console.error('[Text View] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load text');
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
          <p className="text-white text-lg font-semibold font-['Outfit']">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error || !content || !content.document) {
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
                <h2 className="text-2xl font-bold font-['Outfit'] text-black mb-2">Error Loading Document</h2>
                <p className="text-base font-medium font-['Outfit'] text-black/70">{error || 'Content not found'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const doc = content.document;
  const readingTime = doc.wordCount ? Math.ceil(doc.wordCount / 200) : 0; // 200 words per minute

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0668A6] via-[#0668A6] to-[#1AAACE]">
      <div className="pl-20 pr-12 pt-12 pb-6">
        <div className="max-w-4xl mx-auto">
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
            <div className="flex items-center gap-4 mt-2 text-white/60 text-sm font-medium font-['Outfit']">
              <span>{doc.charCount?.toLocaleString()} characters</span>
              <span>•</span>
              <span>{doc.wordCount?.toLocaleString()} words</span>
              {readingTime > 0 && (
                <>
                  <span>•</span>
                  <span>{readingTime} min read</span>
                </>
              )}
              <span>•</span>
              <span>Uploaded {new Date(content.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Main Document */}
          <div className="p-8 bg-[#FFEEE5] rounded-[32px] shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)] outline outline-[3px] outline-offset-[-3px] outline-black">
            <div className="prose prose-lg max-w-none">
              <pre className="whitespace-pre-wrap break-words text-black text-base font-['Outfit'] leading-relaxed">
                {textContent}
              </pre>
            </div>

            {/* Document Info */}
            <div className="mt-6 pt-6 border-t-2 border-black">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium font-['Outfit'] text-black/70">Filename</p>
                  <p className="text-base font-bold font-['Outfit'] text-black">{doc.filename}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium font-['Outfit'] text-black/70">Size</p>
                    <p className="text-base font-bold font-['Outfit'] text-black">
                      {(doc.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <a
                    href={`/api/v1/text/${doc.id}`}
                    download={doc.filename}
                    className="px-4 py-2 bg-[#EF4330] text-white rounded-2xl font-semibold font-['Outfit'] text-sm shadow-[2px_2px_0_0_black] outline outline-2 outline-offset-[-2px] outline-black hover:shadow-[1px_1px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                  >
                    Download
                  </a>
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
