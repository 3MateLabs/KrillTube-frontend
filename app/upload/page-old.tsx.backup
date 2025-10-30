'use client';

/**
 * Upload page - Minimalistic modern design
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentAccount } from '@mysten/dapp-kit';
import type { RenditionQuality } from '@/lib/types';

export default function UploadPage() {
  const router = useRouter();
  const account = useCurrentAccount();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedQualities, setSelectedQualities] = useState<RenditionQuality[]>([
    '720p',
    '480p',
    '360p',
  ]);

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState({ stage: '', percent: 0, message: '' });
  const [error, setError] = useState<string | null>(null);

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
      prev.includes(quality)
        ? prev.filter((q) => q !== quality)
        : [...prev, quality].sort()
    );
  };

  const handleUpload = async () => {
    if (!selectedFile || !account || !title) return;

    setIsUploading(true);
    setError(null);

    try {
      // Step 1: Transcode and encrypt video
      setProgress({ stage: 'transcoding', percent: 10, message: 'Uploading to server...' });

      const formData = new FormData();
      formData.append('video', selectedFile);
      formData.append('qualities', JSON.stringify(selectedQualities));
      formData.append('segmentDuration', '4');

      const transcodeResponse = await fetch('/api/transcode', {
        method: 'POST',
        body: formData,
      });

      if (!transcodeResponse.ok) {
        const errorData = await transcodeResponse.json();
        throw new Error(errorData.error || 'Transcoding failed');
      }

      const transcodeData = await transcodeResponse.json();
      const { videoId, transcodeResult } = transcodeData;

      setProgress({
        stage: 'transcoding',
        percent: 50,
        message: `Transcoded and encrypted ${transcodeResult.totalSegments} segments`,
      });

      console.log(`[Upload] Encrypted video ID: ${videoId}`);

      // Step 2: Upload encrypted segments to Walrus and register in database
      setProgress({
        stage: 'storing',
        percent: 60,
        message: 'Uploading encrypted video to Walrus...',
      });

      const videoResponse = await fetch('/api/v1/videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId,
          title,
          creatorId: account.address,
        }),
      });

      if (!videoResponse.ok) {
        const errorData = await videoResponse.json();
        throw new Error(errorData.error || 'Video upload failed');
      }

      const { video } = await videoResponse.json();

      setProgress({ stage: 'complete', percent: 100, message: 'Upload complete!' });

      console.log(`[Upload] Video uploaded: ${video.id}`);

      // Redirect to watch page
      setTimeout(() => {
        router.push(`/watch/${video.id}`);
      }, 1000);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="max-w-2xl">
        {/* Upload Form */}
        <div className="space-y-6">
          {/* File Upload */}
          <div>
            <label htmlFor="video-file" className="block text-sm font-medium text-foreground mb-2">
              Video File
            </label>
            <div className="relative">
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
                  disabled:opacity-50 disabled:cursor-not-allowed
                  cursor-pointer"
              />
            </div>
            {selectedFile && (
              <div className="mt-3 p-4 bg-background-elevated border border-border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-walrus-mint flex-shrink-0 ml-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
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
              className="w-full px-4 py-3
                bg-background-elevated border border-border
                rounded-lg text-foreground text-base placeholder-text-muted/60
                focus:outline-none focus:border-walrus-mint focus:ring-1 focus:ring-walrus-mint
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
              Description <span className="text-text-muted/70 font-normal text-xs">(optional)</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isUploading}
              placeholder="Tell viewers about your video..."
              rows={4}
              className="w-full px-4 py-3
                bg-background-elevated border border-border
                rounded-lg text-foreground text-base placeholder-text-muted/60
                focus:outline-none focus:border-walrus-mint focus:ring-1 focus:ring-walrus-mint
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all resize-none"
            />
          </div>

          {/* Quality Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Quality
            </label>
            <div className="grid grid-cols-4 gap-3">
              {(['1080p', '720p', '480p', '360p'] as RenditionQuality[]).map((quality) => (
                <label
                  key={quality}
                  className={`
                    flex items-center justify-center py-3.5 px-4
                    rounded-lg border-2 cursor-pointer transition-all text-sm font-semibold
                    ${selectedQualities.includes(quality)
                      ? 'bg-walrus-mint text-walrus-black border-walrus-mint shadow-sm'
                      : 'bg-background-elevated text-foreground border-border hover:border-walrus-mint/50 hover:bg-background-hover'
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
            <p className="text-xs text-text-muted/70 mt-2">
              Select one or more quality options for transcoding
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 border-2 border-red-500/30 bg-red-500/10 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-300 font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Progress */}
          {isUploading && (
            <div className="p-5 bg-background-elevated border-2 border-walrus-mint/20 rounded-lg">
              <div className="flex justify-between items-center text-sm mb-3">
                <span className="text-foreground font-medium">{progress.message}</span>
                <span className="text-walrus-mint font-bold text-base">{progress.percent}%</span>
              </div>
              <div className="w-full bg-background-hover rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-walrus-mint h-2.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!selectedFile || !account || !title || isUploading || selectedQualities.length === 0}
            className="w-full bg-walrus-mint text-walrus-black py-4 px-6
              rounded-lg text-base font-semibold
              hover:bg-mint-800 hover:shadow-lg hover:shadow-walrus-mint/20
              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none
              transition-all duration-200
              flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Uploading...</span>
              </>
            ) : !account ? (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                </svg>
                <span>Connect Wallet to Upload</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 16A8 8 0 108 0a8 8 0 000 16zm.707-11.707a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L7 7.414V11a1 1 0 102 0V7.414l.293.293a1 1 0 001.414-1.414l-2-2z" />
                </svg>
                <span>Upload to Walrus</span>
              </>
            )}
          </button>

          {!account && (
            <div className="text-center">
              <p className="text-sm text-text-muted/70">
                Connect your Sui wallet to start uploading
              </p>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
