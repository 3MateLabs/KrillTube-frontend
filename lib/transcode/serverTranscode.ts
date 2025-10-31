/**
 * Server-side transcoding wrapper for API usage
 */

import { videoTranscoder } from '../transcoder';
import type { TranscodeResult } from '../types';

export interface ServerTranscodeOptions {
  outputDir: string;
  qualities?: string[];
  segmentDuration?: number;
}

/**
 * Transcode video on server using ffmpeg
 * Returns TranscodeResult compatible with Walrus upload
 */
export async function transcodeVideoServer(
  inputPath: string,
  options: ServerTranscodeOptions
): Promise<TranscodeResult> {
  const transcoder = new (videoTranscoder.constructor as any)(options.outputDir);

  const result = await transcoder.transcodeToHLS(inputPath, {
    qualities: options.qualities || ['720p'],
    segmentDuration: options.segmentDuration || 4,
  });

  return result;
}
