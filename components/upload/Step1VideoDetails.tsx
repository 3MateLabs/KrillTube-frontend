/**
 * Step 1: Video Details
 * File selection, title, and quality configuration
 */

'use client';

import { ChangeEvent } from 'react';

type RenditionQuality = '1080p' | '720p' | '480p' | '360p';

interface Step1VideoDetailsProps {
  selectedFile: File | null;
  title: string;
  selectedQualities: RenditionQuality[];
  onFileSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  onTitleChange: (value: string) => void;
  onQualityToggle: (quality: RenditionQuality) => void;
}

const QUALITY_OPTIONS: RenditionQuality[] = ['1080p', '720p', '480p', '360p'];

export function Step1VideoDetails({
  selectedFile,
  title,
  selectedQualities,
  onFileSelect,
  onTitleChange,
  onQualityToggle,
}: Step1VideoDetailsProps) {
  return (
    <div className="space-y-6">
      {/* File Upload */}
      <div className="p-6 bg-background-elevated border-2 border-dashed border-border rounded-lg hover:border-walrus-mint transition-colors">
        <label className="block cursor-pointer">
          <input
            type="file"
            accept="video/*"
            onChange={onFileSelect}
            className="hidden"
          />
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-text-muted"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="mt-2 text-sm text-foreground font-medium">
              {selectedFile ? selectedFile.name : 'Click to select video'}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              {selectedFile
                ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                : 'MP4, WebM, or other video formats'}
            </p>
          </div>
        </label>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-text-muted mb-2">
          Video Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Enter a descriptive title"
          className="w-full px-4 py-3 bg-background border border-border rounded-lg
            text-foreground placeholder-text-muted/50
            focus:outline-none focus:ring-2 focus:ring-walrus-mint"
        />
      </div>

      {/* Quality Selection */}
      <div>
        <label className="block text-sm font-medium text-text-muted mb-2">
          Video Quality
        </label>
        <p className="text-xs text-text-muted mb-3">
          Select quality levels to generate (higher quality = larger file size)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUALITY_OPTIONS.map((quality) => (
            <button
              key={quality}
              type="button"
              onClick={() => onQualityToggle(quality)}
              className={`px-4 py-3 rounded-lg border-2 transition-all font-medium text-sm ${
                selectedQualities.includes(quality)
                  ? 'bg-walrus-mint/10 border-walrus-mint text-walrus-mint'
                  : 'bg-background border-border text-text-muted hover:border-walrus-mint/50'
              }`}
            >
              {quality}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
