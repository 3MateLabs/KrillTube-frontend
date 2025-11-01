/**
 * Shared TypeScript types for KrillTube V1
 */

export type RenditionQuality = '1080p' | '720p' | '480p' | '360p';

export interface RenditionConfig {
  quality: RenditionQuality;
  width: number;
  height: number;
  bitrate: number; // in bps
  audioBitrate: number; // in bps
}

export interface TranscodeOptions {
  qualities: RenditionQuality[];
  segmentDuration: number; // in seconds
  gopSize: number; // keyframe interval
}

export interface TranscodedSegment {
  filename: string;
  filepath: string;
  index: number;
  duration: number;
  size: number; // bytes
}

export interface TranscodedRendition {
  quality: RenditionQuality;
  resolution: string;
  bitrate: number;
  playlist: {
    filename: string;
    filepath: string;
    content: string;
  };
  segments: TranscodedSegment[];
  initSegment?: TranscodedSegment; // fMP4 init file
}

export interface TranscodeResult {
  jobId: string;
  renditions: TranscodedRendition[];
  masterPlaylist: {
    filename: string;
    filepath: string;
    content: string;
  };
  poster?: {
    filename: string;
    filepath: string;
  };
  duration: number; // video duration in seconds
  totalSegments: number;
}

export interface WalrusBlob {
  blobId: string;
  size: number;
  epoch: number;
}

export interface WalrusUploadResult {
  blobId: string;
  url: string; // Walrus URL to fetch the blob
  size: number;
  content?: string; // Optional: temporary content storage during quilt upload
}

export interface AssetManifest {
  assetId: string;
  title: string;
  description?: string;
  duration: number;
  uploadedAt: string;
  uploadedBy: string; // Sui wallet address
  renditions: {
    quality: RenditionQuality;
    resolution: string;
    bitrate: number;
    playlist: WalrusUploadResult;
    segments: WalrusUploadResult[];
    initSegment?: WalrusUploadResult;
  }[];
  masterPlaylist: WalrusUploadResult;
  poster?: WalrusUploadResult;
  totalSize: number; // total bytes uploaded to Walrus
}

export interface UploadProgress {
  stage: 'uploading' | 'transcoding' | 'storing' | 'complete' | 'error';
  percent: number;
  message: string;
  currentFile?: string;
  filesUploaded?: number;
  totalFiles?: number;
}

// Rendition configurations
export const RENDITION_CONFIGS: Record<RenditionQuality, RenditionConfig> = {
  '1080p': {
    quality: '1080p',
    width: 1920,
    height: 1080,
    bitrate: 5000000, // 5 Mbps
    audioBitrate: 192000, // 192 kbps
  },
  '720p': {
    quality: '720p',
    width: 1280,
    height: 720,
    bitrate: 2800000, // 2.8 Mbps
    audioBitrate: 128000, // 128 kbps
  },
  '480p': {
    quality: '480p',
    width: 854,
    height: 480,
    bitrate: 1400000, // 1.4 Mbps
    audioBitrate: 128000, // 128 kbps
  },
  '360p': {
    quality: '360p',
    width: 640,
    height: 360,
    bitrate: 800000, // 800 kbps
    audioBitrate: 96000, // 96 kbps
  },
};

// Utility functions
export function getRenditionConfig(quality: RenditionQuality): RenditionConfig {
  return RENDITION_CONFIGS[quality];
}

export function generateAssetId(): string {
  return `asset_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function generateRevisionId(): string {
  return `rev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}
