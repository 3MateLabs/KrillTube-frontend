/**
 * Client-side video transcoding with ffmpeg.wasm
 * Transcodes video to HLS CMAF format in the browser
 */

'use client';

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

export interface TranscodeProgress {
  overall: number; // 0-100: Overall progress across all qualities
  currentQuality: string; // e.g., "720p"
  currentQualityIndex: number; // e.g., 1 of 3
  totalQualities: number; // e.g., 3
  qualityProgress: number; // 0-100: Progress of current quality
  stage: 'loading' | 'transcoding' | 'reading-segments' | 'generating-poster' | 'complete';
  message: string; // Human-readable message
  estimatedTimeRemaining?: number; // seconds (if available)
}

export interface TranscodeOptions {
  qualities: string[]; // e.g., ['720p', '480p', '360p']
  segmentDuration: number; // seconds (default 4)
  onProgress?: (progress: TranscodeProgress) => void;
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
 *
 * PERFORMANCE NOTES:
 * - Currently using single-threaded build (faster to load)
 * - Multi-threaded build available but requires:
 *   1. SharedArrayBuffer support
 *   2. Cross-Origin-Opener-Policy: same-origin
 *   3. Cross-Origin-Embedder-Policy: require-corp
 *   4. Using @ffmpeg/core-mt instead of @ffmpeg/core
 * - For production, consider multi-threaded build for 2-4x speedup
 */
export async function loadFFmpeg(onProgress?: (progress: TranscodeProgress) => void): Promise<FFmpeg> {
  const ffmpeg = new FFmpeg();

  // Load core and wasm files from CDN
  // For multi-threading: use 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/umd'
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

  if (onProgress) {
    onProgress({
      overall: 0,
      currentQuality: '',
      currentQualityIndex: 0,
      totalQualities: 0,
      qualityProgress: 0,
      stage: 'loading',
      message: 'Loading FFmpeg.wasm...',
    });
  }

  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  console.log('[FFmpeg] Loaded successfully');

  return ffmpeg;
}

/**
 * Generate poster image from video using browser's video element
 * This avoids FFmpeg.wasm memory issues
 */
async function generatePosterFromVideo(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      // Seek to 1 second or 10% of video duration
      video.currentTime = Math.min(1, video.duration * 0.1);
    };

    video.onseeked = async () => {
      try {
        // Set canvas size to video dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to JPEG blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create poster blob'));
              return;
            }

            // Convert blob to Uint8Array
            blob.arrayBuffer().then((buffer) => {
              resolve(new Uint8Array(buffer));

              // Cleanup
              URL.revokeObjectURL(video.src);
            });
          },
          'image/jpeg',
          0.9 // Quality 90%
        );
      } catch (err) {
        reject(err);
        URL.revokeObjectURL(video.src);
      }
    };

    video.onerror = () => {
      reject(new Error('Failed to load video'));
      URL.revokeObjectURL(video.src);
    };
  });
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

  const ffmpeg = await loadFFmpeg(onProgress);

  // Set up FFmpeg progress listener for real-time updates
  let videoDuration = 0;
  ffmpeg.on('log', ({ message }) => {
    // Parse duration from ffmpeg output
    // Example: "Duration: 00:02:30.45"
    const durationMatch = message.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
    if (durationMatch) {
      const hours = parseInt(durationMatch[1]);
      const minutes = parseInt(durationMatch[2]);
      const seconds = parseFloat(durationMatch[3]);
      videoDuration = hours * 3600 + minutes * 60 + seconds;
      console.log(`[FFmpeg] Detected video duration: ${videoDuration}s`);
    }
  });

  // Generate unique video ID
  const videoId = `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  if (onProgress) {
    onProgress({
      overall: 5,
      currentQuality: '',
      currentQualityIndex: 0,
      totalQualities: qualities.length,
      qualityProgress: 0,
      stage: 'loading',
      message: `Loading video file (${(file.size / 1024 / 1024).toFixed(1)} MB)...`,
    });
  }

  // Write input file to ffmpeg virtual filesystem
  const inputData = new Uint8Array(await file.arrayBuffer());
  await ffmpeg.writeFile('input.mp4', inputData);

  const segments: TranscodedSegment[] = [];
  let totalDuration = 0;

  // Get video duration first
  if (onProgress) {
    onProgress({
      overall: 10,
      currentQuality: '',
      currentQualityIndex: 0,
      totalQualities: qualities.length,
      qualityProgress: 0,
      stage: 'loading',
      message: 'Analyzing video...',
    });
  }

  await ffmpeg.exec(['-i', 'input.mp4', '-f', 'null', '-']);

  // Use parsed duration or estimate from file
  if (!videoDuration && file.size > 0) {
    // Rough estimate: ~1MB per second of HD video
    videoDuration = Math.max(10, file.size / 1024 / 1024);
  }

  // Generate poster using browser's video element (avoid FFmpeg memory issues)
  console.log('Generating poster...');

  if (onProgress) {
    onProgress({
      overall: 12,
      currentQuality: '',
      currentQualityIndex: 0,
      totalQualities: qualities.length,
      qualityProgress: 0,
      stage: 'loading',
      message: 'Generating thumbnail...',
    });
  }

  const posterData = await generatePosterFromVideo(file);
  console.log(`Poster generated: ${(posterData.length / 1024).toFixed(2)} KB`);

  // Transcode each quality
  const startTime = Date.now();
  const qualityWeight = 80 / qualities.length; // 80% of progress is transcoding

  // Track time per quality for better estimation
  const qualityTimes: number[] = [];
  let totalTranscodedQualities = 0;

  for (let qIdx = 0; qIdx < qualities.length; qIdx++) {
    const quality = qualities[qIdx];
    const settings = QUALITY_SETTINGS[quality];
    if (!settings) {
      console.warn(`[Client Transcode] Unknown quality: ${quality}, skipping`);
      continue;
    }

    console.log(`[Client Transcode] Processing ${quality}...`);

    const qualityStartProgress = 10 + qIdx * qualityWeight;

    // Set up progress tracking for this quality
    let lastProgressUpdate = Date.now();
    const qualityStartTime = Date.now();
    let lastProgress = 0;

    // Advanced time estimation with exponential smoothing
    const progressSamples: Array<{ progress: number; elapsed: number; timestamp: number }> = [];
    const maxSamples = 10; // More samples for better accuracy
    let smoothedTimeEstimate = 0; // Exponentially smoothed estimate
    const smoothingFactor = 0.3; // 0-1: higher = more responsive, lower = more stable

    ffmpeg.on('progress', ({ progress, time }) => {
      // progress is 0-1, time is in microseconds
      const now = Date.now();

      // Update more frequently (every 200ms instead of 500ms) for smoother display
      if (now - lastProgressUpdate > 200 && progress > 0 && progress > lastProgress) {
        const qualityProgress = Math.min(99, progress * 100);
        const overallProgress = qualityStartProgress + (qualityProgress / 100) * qualityWeight;

        // Track progress samples with timestamp for velocity calculation
        const elapsedMs = now - qualityStartTime;
        progressSamples.push({ progress, elapsed: elapsedMs, timestamp: now });

        // Keep recent samples for trend analysis
        if (progressSamples.length > maxSamples) {
          progressSamples.shift();
        }

        // Calculate time remaining with improved accuracy
        let estimatedRemainingSeconds = 0;

        if (progressSamples.length >= 3) {
          // Method 1: Linear regression on recent samples for current quality
          let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
          const n = progressSamples.length;

          progressSamples.forEach((sample) => {
            const x = sample.elapsed / 1000; // seconds elapsed
            const y = sample.progress; // progress 0-1
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumX2 += x * x;
          });

          // Calculate slope (progress per second)
          const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

          if (slope > 0.0001) { // Avoid division by near-zero
            // Remaining progress for current quality
            const remainingProgress = 1 - progress;
            const remainingForCurrentQuality = remainingProgress / slope;

            // Method 2: Use velocity from most recent samples (short-term trend)
            if (progressSamples.length >= 5) {
              const recentSamples = progressSamples.slice(-5);
              const firstRecent = recentSamples[0];
              const lastRecent = recentSamples[recentSamples.length - 1];
              const recentProgressDelta = lastRecent.progress - firstRecent.progress;
              const recentTimeDelta = (lastRecent.elapsed - firstRecent.elapsed) / 1000;

              if (recentProgressDelta > 0) {
                const recentVelocity = recentProgressDelta / recentTimeDelta;
                const velocityBasedEstimate = remainingProgress / recentVelocity;

                // Blend linear regression with velocity-based estimate
                const blendedEstimate = (remainingForCurrentQuality * 0.6) + (velocityBasedEstimate * 0.4);

                // Apply exponential smoothing to reduce jitter
                if (smoothedTimeEstimate === 0) {
                  smoothedTimeEstimate = blendedEstimate;
                } else {
                  smoothedTimeEstimate = (smoothingFactor * blendedEstimate) + ((1 - smoothingFactor) * smoothedTimeEstimate);
                }
              }
            } else {
              smoothedTimeEstimate = remainingForCurrentQuality;
            }

            // Estimate time for remaining qualities
            let avgTimePerQuality = 0;
            if (qualityTimes.length > 0) {
              // Use actual average from completed qualities
              const totalPreviousTime = qualityTimes.reduce((sum, t) => sum + t, 0);
              avgTimePerQuality = totalPreviousTime / qualityTimes.length;

              // Adjust based on current quality's estimated total
              const estimatedCurrentTotal = elapsedMs / 1000 / Math.max(0.01, progress);
              // Weighted average: 70% historical, 30% current estimate
              avgTimePerQuality = (avgTimePerQuality * 0.7) + (estimatedCurrentTotal * 0.3);
            } else {
              // First quality: estimate based on current progress
              avgTimePerQuality = (elapsedMs / 1000) / Math.max(0.01, progress);
            }

            const remainingQualities = qualities.length - (qIdx + 1);
            const remainingForOtherQualities = remainingQualities * avgTimePerQuality;

            estimatedRemainingSeconds = smoothedTimeEstimate + remainingForOtherQualities;

            // Debug logging with detailed breakdown
            if (progressSamples.length % 5 === 0) { // Log every 5 updates
              // console.log(`[Time Est] ${quality} @ ${(progress * 100).toFixed(1)}%: current=${smoothedTimeEstimate.toFixed(1)}s, others=${remainingForOtherQualities.toFixed(1)}s, total=${estimatedRemainingSeconds.toFixed(1)}s, velocity=${(slope * 100).toFixed(3)}%/s`);
            }
          }
        }

        if (onProgress) {
          onProgress({
            overall: Math.min(90, overallProgress),
            currentQuality: quality,
            currentQualityIndex: qIdx + 1,
            totalQualities: qualities.length,
            qualityProgress,
            stage: 'transcoding',
            message: `Transcoding ${quality} (${qIdx + 1}/${qualities.length}) - ${qualityProgress.toFixed(0)}%`,
            estimatedTimeRemaining: Math.max(0, Math.round(estimatedRemainingSeconds)),
          });
        }
        lastProgressUpdate = now;
        lastProgress = progress;
      }
    });

    // FFmpeg command for HLS CMAF segmentation
    // Output: init segment + media segments
    // Using ultrafast preset for 2-3x faster encoding (good enough for streaming)
    await ffmpeg.exec([
      '-i', 'input.mp4',
      '-vf', `scale=${settings.resolution}`,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',     // 2-3x faster than 'fast' preset
      '-tune', 'zerolatency',      // Further speed optimization
      '-b:v', settings.bitrate,
      '-maxrate', settings.bitrate,
      '-bufsize', `${parseInt(settings.bitrate) * 2}`, // 2x bitrate for buffer
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

    if (onProgress) {
      onProgress({
        overall: qualityStartProgress + qualityWeight,
        currentQuality: quality,
        currentQualityIndex: qIdx + 1,
        totalQualities: qualities.length,
        qualityProgress: 100,
        stage: 'reading-segments',
        message: `Reading ${quality} segments...`,
      });
    }

    // Read init segment
    const initData = await ffmpeg.readFile(`${quality}_init.mp4`);
    const initDataArray = initData instanceof Uint8Array ? initData : new Uint8Array();

    segments.push({
      quality,
      type: 'init',
      segIdx: -1,
      data: initDataArray,
      duration: 0,
    });

    console.log(`[Client Transcode] ✓ Init segment: ${(initDataArray.length / 1024).toFixed(2)} KB`);

    // Delete from FFmpeg to free memory
    try {
      await ffmpeg.deleteFile(`${quality}_init.mp4`);
    } catch (e) {
      // Ignore delete errors
    }

    // Read media segments
    let segIdx = 0;
    while (true) {
      try {
        const segData = await ffmpeg.readFile(`${quality}_seg_${segIdx}.m4s`);
        const segDataArray = segData instanceof Uint8Array ? segData : new Uint8Array();

        segments.push({
          quality,
          type: 'media',
          segIdx,
          data: segDataArray,
          duration: segmentDuration,
        });

        console.log(`[Client Transcode] ✓ Segment ${segIdx}: ${(segDataArray.length / 1024).toFixed(2)} KB`);

        // Delete from FFmpeg virtual filesystem immediately to free memory
        try {
          await ffmpeg.deleteFile(`${quality}_seg_${segIdx}.m4s`);
        } catch (e) {
          // Ignore delete errors
        }

        segIdx++;
      } catch {
        break; // No more segments
      }
    }

    console.log(`[Client Transcode] ✓ ${quality}: ${segIdx} segments read`);

    // Record time taken for this quality
    const qualityDuration = (Date.now() - qualityStartTime) / 1000;
    qualityTimes.push(qualityDuration);
    totalTranscodedQualities++;
    console.log(`[Client Transcode] ${quality} took ${qualityDuration.toFixed(1)}s`);

    // Clean up FFmpeg filesystem to free memory
    try {
      await ffmpeg.deleteFile(`${quality}_init.mp4`);
      await ffmpeg.deleteFile(`${quality}.m3u8`);
    } catch (e) {
      // Ignore cleanup errors
    }

    // Force garbage collection hint (if available)
    if (global.gc) {
      global.gc();
    }
  }
  console.log('FFmpeg exec complete');

  // Generate poster frame (first frame of video)
  if (onProgress) {
    onProgress({
      overall: 92,
      currentQuality: '',
      currentQualityIndex: qualities.length,
      totalQualities: qualities.length,
      qualityProgress: 0,
      stage: 'generating-poster',
      message: 'Generating thumbnail (extracting first frame)...',
    });
  }


  // Add progress tracking for poster generation
  ffmpeg.on('progress', ({ progress }) => {
    if (onProgress && progress > 0) {
      onProgress({
        overall: 92 + (progress * 6), // 92-98%
        currentQuality: '',
        currentQualityIndex: qualities.length,
        totalQualities: qualities.length,
        qualityProgress: progress * 100,
        stage: 'generating-poster',
        message: `Generating thumbnail... ${(progress * 100).toFixed(0)}%`,
      });
    }
  });

  // Clean up FFmpeg filesystem
  try {
    await ffmpeg.deleteFile('input.mp4');
  } catch (e) {
    // Ignore cleanup errors
  }

  console.log('FFmpeg filesystem cleaned up');

  // Estimate duration from segment count
  const maxSegments = Math.max(
    ...segments.filter((s) => s.type === 'media').map((s) => s.segIdx)
  );
  totalDuration = videoDuration > 0 ? videoDuration : (maxSegments + 1) * segmentDuration;

  const elapsedSeconds = (Date.now() - startTime) / 1000;
  console.log(`[Client Transcode] ✓ Transcoding complete in ${elapsedSeconds.toFixed(1)}s`);
  console.log(`  Total segments: ${segments.length}`);
  console.log(`  Duration: ${totalDuration.toFixed(1)}s`);
  console.log(`  Segments stored in IndexedDB (videoId: ${videoId})`);

  if (onProgress) {
    onProgress({
      overall: 100,
      currentQuality: '',
      currentQualityIndex: qualities.length,
      totalQualities: qualities.length,
      qualityProgress: 100,
      stage: 'complete',
      message: `Complete! Transcoded ${segments.length} segments in ${elapsedSeconds.toFixed(0)}s`,
    });
  }

  console.log(`[Client Transcode] ✓ Transcoding complete`);
  console.log(`  Total segments: ${segments.length}`);
  console.log(`  Total duration: ${totalDuration.toFixed(2)}s`);

  return {
    videoId,
    duration: totalDuration,
    segments,
    poster: posterData,
  };
}
