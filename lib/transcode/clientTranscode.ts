/**
 * Client-side video transcoding with ffmpeg.wasm
 * Transcodes video to HLS CMAF format in the browser
 */

'use client';

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

export interface TranscodeOptions {
  qualities: string[]; // e.g., ['720p', '480p', '360p']
  segmentDuration: number; // seconds (default 4)
  onProgress?: (progress: number) => void;
}

export interface TranscodedSegment {
  quality: string;
  type: 'init' | 'media';
  segIdx: number;
  data: Uint8Array;
  duration: number;
}

export interface TranscodeResult {
  videoId: string;
  duration: number;
  segments: TranscodedSegment[];
  poster?: Uint8Array;
}

const QUALITY_SETTINGS: Record<string, { resolution: string; bitrate: string }> = {
  '1080p': { resolution: '1920x1080', bitrate: '5000k' },
  '720p': { resolution: '1280x720', bitrate: '2800k' },
  '480p': { resolution: '854x480', bitrate: '1400k' },
  '360p': { resolution: '640x360', bitrate: '800k' },
};

/**
 * Load ffmpeg.wasm with progress tracking
 */
export async function loadFFmpeg(): Promise<FFmpeg> {
  const ffmpeg = new FFmpeg();

  // Load core and wasm files from CDN
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  return ffmpeg;
}

/**
 * Transcode video to HLS CMAF segments
 */
export async function transcodeVideo(
  file: File,
  options: TranscodeOptions
): Promise<TranscodeResult> {
  const { qualities, segmentDuration = 4, onProgress } = options;

  console.log('[Client Transcode] Starting transcoding...');
  console.log(`  File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`  Qualities: ${qualities.join(', ')}`);

  const ffmpeg = await loadFFmpeg();

  // Generate unique video ID
  const videoId = `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Write input file to ffmpeg virtual filesystem
  const inputData = new Uint8Array(await file.arrayBuffer());
  await ffmpeg.writeFile('input.mp4', inputData);

  const segments: TranscodedSegment[] = [];
  let totalDuration = 0;

  // Get video duration first
  await ffmpeg.exec(['-i', 'input.mp4', '-f', 'null', '-']);
  // Parse duration from ffmpeg output (you'll need to implement this)

  // Transcode each quality
  for (const quality of qualities) {
    const settings = QUALITY_SETTINGS[quality];
    if (!settings) {
      console.warn(`[Client Transcode] Unknown quality: ${quality}, skipping`);
      continue;
    }

    console.log(`[Client Transcode] Processing ${quality}...`);

    // FFmpeg command for HLS CMAF segmentation
    // Output: init segment + media segments
    await ffmpeg.exec([
      '-i', 'input.mp4',
      '-vf', `scale=${settings.resolution}`,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-b:v', settings.bitrate,
      '-c:a', 'aac',
      '-b:a', '128k',
      '-f', 'hls',
      '-hls_time', segmentDuration.toString(),
      '-hls_playlist_type', 'vod',
      '-hls_segment_type', 'fmp4', // CMAF format
      '-hls_segment_filename', `${quality}_seg_%d.m4s`,
      '-hls_fmp4_init_filename', `${quality}_init.mp4`,
      `${quality}.m3u8`,
    ]);

    // Read init segment
    const initData = await ffmpeg.readFile(`${quality}_init.mp4`);
    segments.push({
      quality,
      type: 'init',
      segIdx: -1,
      data: initData instanceof Uint8Array ? initData : new Uint8Array(),
      duration: 0,
    });

    // Read media segments
    let segIdx = 0;
    while (true) {
      try {
        const segData = await ffmpeg.readFile(`${quality}_seg_${segIdx}.m4s`);
        segments.push({
          quality,
          type: 'media',
          segIdx,
          data: segData instanceof Uint8Array ? segData : new Uint8Array(),
          duration: segmentDuration,
        });
        segIdx++;
      } catch {
        break; // No more segments
      }
    }

    console.log(`[Client Transcode] ✓ ${quality}: ${segIdx} segments`);

    if (onProgress) {
      const progress = ((qualities.indexOf(quality) + 1) / qualities.length) * 100;
      onProgress(progress);
    }
  }

  // Generate poster frame (first frame of video)
  await ffmpeg.exec([
    '-i', 'input.mp4',
    '-vframes', '1',
    '-f', 'image2',
    'poster.jpg',
  ]);
  const posterDataRaw = await ffmpeg.readFile('poster.jpg');
  const posterData = posterDataRaw instanceof Uint8Array ? posterDataRaw : new Uint8Array();

  // Estimate duration from segment count
  const maxSegments = Math.max(
    ...segments.filter((s) => s.type === 'media').map((s) => s.segIdx)
  );
  totalDuration = (maxSegments + 1) * segmentDuration;

  console.log(`[Client Transcode] ✓ Transcoding complete`);
  console.log(`  Total segments: ${segments.length}`);
  console.log(`  Duration: ${totalDuration}s`);

  return {
    videoId,
    duration: totalDuration,
    segments,
    poster: posterData,
  };
}
