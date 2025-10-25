/**
 * Server-side video transcoder using fluent-ffmpeg
 */

import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import type {
  TranscodeOptions,
  TranscodeResult,
  TranscodedRendition,
  RenditionQuality,
  TranscodedSegment,
} from './types';
import { getRenditionConfig, generateAssetId } from './types';

const mkdir = promisify(fs.mkdir);
const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

export class VideoTranscoder {
  private outputBaseDir: string;

  constructor(outputDir: string = 'public/transcoded') {
    this.outputBaseDir = outputDir;
  }

  /**
   * Get video metadata (duration, resolution, etc.)
   */
  async getVideoInfo(inputPath: string): Promise<{
    duration: number;
    width: number;
    height: number;
    codec: string;
    bitrate: number;
  }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          reject(new Error(`Failed to probe video: ${err.message}`));
          return;
        }

        const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
        if (!videoStream) {
          reject(new Error('No video stream found'));
          return;
        }

        resolve({
          duration: metadata.format.duration || 0,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          codec: videoStream.codec_name || 'unknown',
          bitrate: metadata.format.bit_rate ? parseInt(String(metadata.format.bit_rate)) : 0,
        });
      });
    });
  }

  /**
   * Transcode video to HLS with multiple renditions
   */
  async transcodeToHLS(
    inputPath: string,
    options: Partial<TranscodeOptions> = {}
  ): Promise<TranscodeResult> {
    const opts: TranscodeOptions = {
      qualities: options.qualities || ['720p', '480p', '360p'],
      segmentDuration: options.segmentDuration || 4,
      gopSize: options.gopSize || 96, // 4s GOP at 24fps
    };

    // Get video info
    const info = await this.getVideoInfo(inputPath);
    const jobId = generateAssetId();
    const outputDir = path.join(this.outputBaseDir, jobId);

    // Create output directory
    await mkdir(outputDir, { recursive: true });

    console.log(`[Transcoder] Starting transcode job ${jobId}`);
    console.log(`[Transcoder] Input: ${inputPath}, Duration: ${info.duration}s`);

    const renditions: TranscodedRendition[] = [];

    // Transcode each quality
    for (const quality of opts.qualities) {
      console.log(`[Transcoder] Transcoding ${quality}...`);
      const rendition = await this.transcodeRendition(
        inputPath,
        outputDir,
        quality,
        opts
      );
      renditions.push(rendition);
    }

    // Generate master playlist
    const masterPlaylist = this.generateMasterPlaylist(outputDir, renditions);

    // Extract poster image
    const poster = await this.extractPoster(inputPath, outputDir);

    // Calculate total segments
    const totalSegments = renditions.reduce((sum, r) => sum + r.segments.length, 0);

    const result: TranscodeResult = {
      jobId,
      renditions,
      masterPlaylist,
      poster,
      duration: info.duration,
      totalSegments,
    };

    console.log(`[Transcoder] Job ${jobId} complete! ${totalSegments} segments created`);

    return result;
  }

  /**
   * Transcode a single rendition to HLS
   */
  private async transcodeRendition(
    inputPath: string,
    outputDir: string,
    quality: RenditionQuality,
    opts: TranscodeOptions
  ): Promise<TranscodedRendition> {
    const config = getRenditionConfig(quality);
    const renditionDir = path.join(outputDir, quality);
    await mkdir(renditionDir, { recursive: true });

    const playlistName = `${quality}.m3u8`;
    const playlistPath = path.join(renditionDir, playlistName);
    const segmentPattern = `${quality}_seg_%04d.m4s`;
    const initFilename = `${quality}_init.mp4`;

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        // Video encoding
        .videoCodec('libx264')
        .addOption('-preset', 'fast')
        .addOption('-profile:v', 'main')
        .addOption('-level', '4.1')
        .videoBitrate(Math.floor(config.bitrate / 1000))
        .addOption('-maxrate', `${Math.floor((config.bitrate / 1000) * 1.2)}k`)
        .addOption('-bufsize', `${Math.floor((config.bitrate / 1000) * 2)}k`)
        .size(`${config.width}x${config.height}`)
        // GOP structure
        .addOption('-g', opts.gopSize.toString())
        .addOption('-keyint_min', Math.floor(opts.gopSize / 2).toString())
        .addOption('-sc_threshold', '0')
        // Audio encoding
        .audioCodec('aac')
        .audioBitrate(Math.floor(config.audioBitrate / 1000))
        .audioChannels(2)
        // HLS options
        .format('hls')
        .addOption('-hls_time', opts.segmentDuration.toString())
        .addOption('-hls_playlist_type', 'vod')
        .addOption('-hls_segment_type', 'fmp4')
        .addOption('-hls_fmp4_init_filename', initFilename)
        .addOption('-hls_segment_filename', path.join(renditionDir, segmentPattern))
        .output(playlistPath)
        .on('end', async () => {
          try {
            // Read playlist
            const playlistContent = await readFile(playlistPath, 'utf-8');

            // Read segments
            const files = await readdir(renditionDir);
            const segmentFiles = files.filter((f) => f.endsWith('.m4s'));

            const segments: TranscodedSegment[] = [];
            for (const filename of segmentFiles) {
              const filepath = path.join(renditionDir, filename);
              const fileStats = await stat(filepath);
              const match = filename.match(/_seg_(\d+)\.m4s$/);
              const index = match ? parseInt(match[1]) : 0;

              segments.push({
                filename,
                filepath,
                index,
                duration: opts.segmentDuration,
                size: fileStats.size,
              });
            }

            // Sort segments by index
            segments.sort((a, b) => a.index - b.index);

            // Read init segment
            let initSegment: TranscodedSegment | undefined;
            const initPath = path.join(renditionDir, initFilename);
            if (fs.existsSync(initPath)) {
              const initStats = await stat(initPath);
              initSegment = {
                filename: initFilename,
                filepath: initPath,
                index: -1,
                duration: 0,
                size: initStats.size,
              };
            }

            resolve({
              quality,
              resolution: `${config.width}x${config.height}`,
              bitrate: config.bitrate,
              playlist: {
                filename: playlistName,
                filepath: playlistPath,
                content: playlistContent,
              },
              segments,
              initSegment,
            });
          } catch (err) {
            reject(err);
          }
        })
        .on('error', (err) => {
          reject(new Error(`Transcoding ${quality} failed: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * Generate master playlist
   */
  private generateMasterPlaylist(
    outputDir: string,
    renditions: TranscodedRendition[]
  ): TranscodeResult['masterPlaylist'] {
    let content = '#EXTM3U\n';
    content += '#EXT-X-VERSION:7\n\n';

    for (const rendition of renditions) {
      const [width, height] = rendition.resolution.split('x');
      content += `#EXT-X-STREAM-INF:BANDWIDTH=${rendition.bitrate},RESOLUTION=${width}x${height},CODECS="avc1.64001f,mp4a.40.2"\n`;
      content += `${rendition.quality}/${rendition.playlist.filename}\n`;
    }

    const filepath = path.join(outputDir, 'master.m3u8');
    fs.writeFileSync(filepath, content);

    return {
      filename: 'master.m3u8',
      filepath,
      content,
    };
  }

  /**
   * Extract poster image from video (at 5 seconds)
   */
  private async extractPoster(
    inputPath: string,
    outputDir: string
  ): Promise<TranscodeResult['poster']> {
    const posterFilename = 'poster.jpg';
    const posterPath = path.join(outputDir, posterFilename);

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .seekInput(5)
        .frames(1)
        .size('1280x720')
        .output(posterPath)
        .on('end', async () => {
          const stats = await stat(posterPath);
          resolve({
            filename: posterFilename,
            filepath: posterPath,
          });
        })
        .on('error', (err) => {
          console.warn(`[Transcoder] Failed to extract poster: ${err.message}`);
          resolve(undefined);
        })
        .run();
    });
  }

  /**
   * Clean up transcoded files
   */
  async cleanup(jobId: string): Promise<void> {
    const jobDir = path.join(this.outputBaseDir, jobId);
    if (fs.existsSync(jobDir)) {
      fs.rmSync(jobDir, { recursive: true, force: true });
      console.log(`[Transcoder] Cleaned up job ${jobId}`);
    }
  }
}

// Singleton instance
export const videoTranscoder = new VideoTranscoder();
