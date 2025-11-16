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
      <div className="p-6 bg-white border-2 border-dashed border-black/20 rounded-2xl hover:border-krill-orange shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black transition-colors">
        <label className="block cursor-pointer">
          <input
            type="file"
            accept="video/*"
            onChange={onFileSelect}
            className="hidden"
          />
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-black/40"
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
            <p className="mt-2 text-sm text-black font-semibold font-['Outfit']">
              {selectedFile ? selectedFile.name : 'Click to select video'}
            </p>
            <p className="mt-1 text-xs text-black/70 font-medium font-['Outfit']">
              {selectedFile
                ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                : 'MP4, WebM, or other video formats'}
            </p>
          </div>
        </label>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-semibold font-['Outfit'] text-black/70 mb-2">
          Video Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Enter a descriptive title"
          className="w-full px-4 py-3 bg-white rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1.00)] outline outline-1 outline-black
            text-black placeholder-black/40 font-medium font-['Outfit']
            focus:outline-krill-orange focus:outline-2 transition-all"
        />
      </div>

      {/* Quality Selection */}
      <div>
        <label className="block text-sm font-semibold font-['Outfit'] text-black/70 mb-2">
          Video Quality
        </label>
        <p className="text-xs text-black/70 font-medium font-['Outfit'] mb-3">
          Select quality levels to generate (higher quality = larger file size)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUALITY_OPTIONS.map((quality) => (
            <button
              key={quality}
              type="button"
              onClick={() => onQualityToggle(quality)}
              className={`px-4 py-3 rounded-xl transition-all font-bold font-['Outfit'] text-sm shadow-[2px_2px_0_0_black] outline outline-1 outline-black hover:shadow-[1px_1px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] ${
                selectedQualities.includes(quality)
                  ? 'bg-krill-orange text-white'
                  : 'bg-krill-peach text-black'
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
