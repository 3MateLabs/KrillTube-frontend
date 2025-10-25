/**
 * Walrus decentralized storage client using Quilts for batch uploads
 */

import fs from 'fs';
import { promisify } from 'util';
import type {
  WalrusUploadResult,
  AssetManifest,
  TranscodeResult,
  RenditionQuality,
} from './types';
import { generateAssetId, formatBytes } from './types';

const readFile = promisify(fs.readFile);

export interface WalrusConfig {
  network: 'testnet' | 'mainnet';
  aggregatorUrl?: string;
  publisherUrl?: string;
  epochs?: number;
}

interface QuiltBlob {
  identifier: string;
  quiltPatchId: string;
}

interface WalrusQuiltResponse {
  storedQuiltBlobs?: QuiltBlob[];
}

export class WalrusClient {
  private config: WalrusConfig;
  private aggregatorUrl: string;
  private publisherUrl: string;
  private epochs: number;

  constructor(config: WalrusConfig) {
    this.config = config;
    this.epochs = config.epochs || 1;

    // Default URLs for Walrus testnet
    if (config.network === 'testnet') {
      this.aggregatorUrl = config.aggregatorUrl || 'https://aggregator.walrus-testnet.walrus.space';
      this.publisherUrl = config.publisherUrl || 'https://publisher.walrus-testnet.walrus.space';
    } else {
      this.aggregatorUrl = config.aggregatorUrl || 'https://aggregator.walrus.space';
      this.publisherUrl = config.publisherUrl || 'https://publisher.walrus.space';
    }

    console.log(`[Walrus] Initialized with ${config.network}`);
    console.log(`[Walrus] Aggregator: ${this.aggregatorUrl}`);
    console.log(`[Walrus] Publisher: ${this.publisherUrl}`);
    console.log(`[Walrus] Using QUILTS for batch uploads`);
  }

  /**
   * Upload a single blob to Walrus
   */
  async uploadBlob(data: Buffer | Uint8Array, filename: string): Promise<WalrusUploadResult> {
    try {
      console.log(`[Walrus] Uploading ${filename} (${formatBytes(data.length)})...`);

      const response = await fetch(`${this.publisherUrl}/v1/blobs`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: data as BodyInit,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Walrus upload failed: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();

      // Extract blob ID from response
      const blobId = result.newlyCreated?.blobObject?.blobId ||
                     result.alreadyCertified?.blobId;

      if (!blobId) {
        throw new Error('No blob ID in Walrus response');
      }

      const walrusUrl = `${this.aggregatorUrl}/v1/blobs/${blobId}`;

      console.log(`[Walrus] ✓ Uploaded ${filename} → ${blobId.substring(0, 12)}...`);

      return {
        blobId,
        url: walrusUrl,
        size: data.length,
      };
    } catch (error) {
      console.error(`[Walrus] Upload error for ${filename}:`, error);
      throw new Error(`Failed to upload ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload a file from filesystem to Walrus
   */
  async uploadFile(filepath: string, filename?: string): Promise<WalrusUploadResult> {
    const data = await readFile(filepath);
    const name = filename || filepath.split('/').pop() || 'file';
    return this.uploadBlob(data, name);
  }

  /**
   * Upload an entire transcoded asset to Walrus using Quilts (batch upload)
   */
  async uploadAsset(
    transcodeResult: TranscodeResult,
    metadata: {
      title: string;
      description?: string;
      uploadedBy: string;
    }
  ): Promise<AssetManifest> {
    const assetId = transcodeResult.jobId;
    console.log(`[Walrus] Starting QUILT upload for asset ${assetId}`);

    let totalSize = 0;
    const uploadedRenditions: AssetManifest['renditions'] = [];

    // Step 1: Collect all media files (segments + init files) for batch upload
    const formData = new FormData();
    const fileMap = new Map<string, { rendition: RenditionQuality; type: 'init' | 'segment'; index?: number }>();

    for (const rendition of transcodeResult.renditions) {
      console.log(`[Walrus] Preparing ${rendition.quality} files for quilt...`);

      // Add init segment
      if (rendition.initSegment) {
        const initData = await readFile(rendition.initSegment.filepath);
        const identifier = `${rendition.quality}_init`;
        formData.append(identifier, new Blob([initData]));
        fileMap.set(identifier, { rendition: rendition.quality, type: 'init' });
        totalSize += initData.length;
      }

      // Add all media segments
      for (let i = 0; i < rendition.segments.length; i++) {
        const segment = rendition.segments[i];
        const segData = await readFile(segment.filepath);
        const identifier = `${rendition.quality}_seg_${i}`;
        formData.append(identifier, new Blob([segData]));
        fileMap.set(identifier, { rendition: rendition.quality, type: 'segment', index: i });
        totalSize += segData.length;
      }
    }

    // Add poster if exists
    let posterIdentifier: string | undefined;
    if (transcodeResult.poster) {
      const posterData = await readFile(transcodeResult.poster.filepath);
      posterIdentifier = 'poster';
      formData.append(posterIdentifier, new Blob([posterData]));
      totalSize += posterData.length;
    }

    // Step 2: Upload all media files as a quilt
    console.log(`[Walrus] Uploading ${fileMap.size + (posterIdentifier ? 1 : 0)} files as quilt...`);
    const quiltResponse = await fetch(
      `${this.publisherUrl}/v1/quilts?epochs=${this.epochs}`,
      {
        method: 'PUT',
        body: formData,
      }
    );

    if (!quiltResponse.ok) {
      const errorText = await quiltResponse.text();
      throw new Error(`Walrus quilt upload failed: ${quiltResponse.status} - ${errorText}`);
    }

    const quiltResult = (await quiltResponse.json()) as WalrusQuiltResponse;
    if (!quiltResult.storedQuiltBlobs) {
      throw new Error('No quilt blobs in response');
    }

    console.log(`[Walrus] ✓ Quilt uploaded successfully with ${quiltResult.storedQuiltBlobs.length} files`);

    // Step 3: Map quilt patch IDs to files
    const patchIdMap = new Map<string, string>();
    for (const blob of quiltResult.storedQuiltBlobs) {
      patchIdMap.set(blob.identifier, blob.quiltPatchId);
    }

    // Step 4: Build renditions with quilt URLs
    for (const rendition of transcodeResult.renditions) {
      const initPatchId = patchIdMap.get(`${rendition.quality}_init`);
      const initSegmentResult: WalrusUploadResult | undefined = initPatchId
        ? {
            blobId: initPatchId,
            url: `${this.aggregatorUrl}/v1/blobs/by-quilt-patch-id/${initPatchId}`,
            size: rendition.initSegment!.size,
          }
        : undefined;

      const segmentResults: WalrusUploadResult[] = [];
      for (let i = 0; i < rendition.segments.length; i++) {
        const patchId = patchIdMap.get(`${rendition.quality}_seg_${i}`);
        if (!patchId) throw new Error(`Missing patch ID for ${rendition.quality}_seg_${i}`);

        segmentResults.push({
          blobId: patchId,
          url: `${this.aggregatorUrl}/v1/blobs/by-quilt-patch-id/${patchId}`,
          size: rendition.segments[i].size,
        });
      }

      // Generate playlist with quilt URLs
      let playlistContent = '#EXTM3U\n';
      playlistContent += '#EXT-X-VERSION:7\n';
      playlistContent += '#EXT-X-TARGETDURATION:4\n';
      playlistContent += '#EXT-X-PLAYLIST-TYPE:VOD\n';
      playlistContent += '#EXT-X-MEDIA-SEQUENCE:0\n';

      if (initSegmentResult) {
        playlistContent += `#EXT-X-MAP:URI="${initSegmentResult.url}"\n`;
      }

      for (const segResult of segmentResults) {
        playlistContent += `#EXTINF:4.0,\n`;
        playlistContent += `${segResult.url}\n`;
      }

      playlistContent += '#EXT-X-ENDLIST\n';

      uploadedRenditions.push({
        quality: rendition.quality,
        resolution: rendition.resolution,
        bitrate: rendition.bitrate,
        playlist: { blobId: '', url: '', size: 0, content: playlistContent }, // Will be updated after upload
        segments: segmentResults,
        initSegment: initSegmentResult,
      });
    }

    // Step 5: Upload rendition playlists as first quilt batch
    const playlistFormData = new FormData();
    for (const rendition of uploadedRenditions) {
      const identifier = `${rendition.quality}_playlist`;
      playlistFormData.append(identifier, new Blob([rendition.playlist.content!]));
    }

    console.log(`[Walrus] Uploading ${uploadedRenditions.length} rendition playlists as quilt...`);
    const playlistQuiltResponse = await fetch(
      `${this.publisherUrl}/v1/quilts?epochs=${this.epochs}`,
      {
        method: 'PUT',
        body: playlistFormData,
      }
    );

    if (!playlistQuiltResponse.ok) {
      const errorText = await playlistQuiltResponse.text();
      throw new Error(`Playlist quilt upload failed: ${playlistQuiltResponse.status} - ${errorText}`);
    }

    const playlistQuiltResult = (await playlistQuiltResponse.json()) as WalrusQuiltResponse;
    if (!playlistQuiltResult.storedQuiltBlobs) {
      throw new Error('No playlist quilt blobs in response');
    }

    console.log(`[Walrus] ✓ Playlist quilt uploaded with ${playlistQuiltResult.storedQuiltBlobs.length} files`);

    // Step 6: Update renditions with playlist URLs
    for (const rendition of uploadedRenditions) {
      const playlistBlob = playlistQuiltResult.storedQuiltBlobs!.find(
        (b) => b.identifier === `${rendition.quality}_playlist`
      );
      if (!playlistBlob) throw new Error(`Missing playlist for ${rendition.quality}`);

      rendition.playlist = {
        blobId: playlistBlob.quiltPatchId,
        url: `${this.aggregatorUrl}/v1/blobs/by-quilt-patch-id/${playlistBlob.quiltPatchId}`,
        size: rendition.playlist.content!.length,
      };
      delete rendition.playlist.content; // Remove temporary content
    }

    // Step 7: Generate master playlist content with real playlist URLs
    let finalMasterContent = '#EXTM3U\n';
    finalMasterContent += '#EXT-X-VERSION:7\n\n';
    for (const rendition of uploadedRenditions) {
      const [width, height] = rendition.resolution.split('x');
      finalMasterContent += `#EXT-X-STREAM-INF:BANDWIDTH=${rendition.bitrate},RESOLUTION=${width}x${height},CODECS="avc1.64001f,mp4a.40.2"\n`;
      finalMasterContent += `${rendition.playlist.url}\n`;
    }

    // Step 8: Upload master playlist as a second quilt (single file)
    console.log(`[Walrus] Uploading master playlist as quilt...`);
    const masterFormData = new FormData();
    masterFormData.append('master_playlist', new Blob([finalMasterContent]));

    const masterQuiltResponse = await fetch(
      `${this.publisherUrl}/v1/quilts?epochs=${this.epochs}`,
      {
        method: 'PUT',
        body: masterFormData,
      }
    );

    if (!masterQuiltResponse.ok) {
      const errorText = await masterQuiltResponse.text();
      throw new Error(`Master playlist quilt upload failed: ${masterQuiltResponse.status} - ${errorText}`);
    }

    const masterQuiltResult = (await masterQuiltResponse.json()) as WalrusQuiltResponse;
    if (!masterQuiltResult.storedQuiltBlobs || masterQuiltResult.storedQuiltBlobs.length === 0) {
      throw new Error('No master playlist quilt blob in response');
    }

    const masterPlaylistResult: WalrusUploadResult = {
      blobId: masterQuiltResult.storedQuiltBlobs[0].quiltPatchId,
      url: `${this.aggregatorUrl}/v1/blobs/by-quilt-patch-id/${masterQuiltResult.storedQuiltBlobs[0].quiltPatchId}`,
      size: finalMasterContent.length,
    };

    // Get poster result
    let posterResult: WalrusUploadResult | undefined;
    if (posterIdentifier) {
      const posterBlob = quiltResult.storedQuiltBlobs!.find((b) => b.identifier === posterIdentifier);
      if (posterBlob) {
        posterResult = {
          blobId: posterBlob.quiltPatchId,
          url: `${this.aggregatorUrl}/v1/blobs/by-quilt-patch-id/${posterBlob.quiltPatchId}`,
          size: transcodeResult.poster!.filepath.length,
        };
      }
    }

    const manifest: AssetManifest = {
      assetId,
      title: metadata.title,
      description: metadata.description,
      duration: transcodeResult.duration,
      uploadedAt: new Date().toISOString(),
      uploadedBy: metadata.uploadedBy,
      renditions: uploadedRenditions,
      masterPlaylist: masterPlaylistResult,
      poster: posterResult,
      totalSize,
    };

    console.log(`[Walrus] ✓ Asset ${assetId} uploaded via QUILTS!`);
    console.log(`[Walrus] Total size: ${formatBytes(totalSize)}`);
    console.log(`[Walrus] Total files: ${quiltResult.storedQuiltBlobs.length + playlistQuiltResult.storedQuiltBlobs.length}`);

    return manifest;
  }

  /**
   * Fetch a blob from Walrus
   */
  async fetchBlob(blobId: string): Promise<Buffer> {
    const url = `${this.aggregatorUrl}/v1/blobs/${blobId}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch blob ${blobId}: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Generate a Walrus URL for a blob ID
   */
  getBlobUrl(blobId: string): string {
    return `${this.aggregatorUrl}/v1/blobs/${blobId}`;
  }
}

// Singleton instance for server-side use
export const walrusClient = new WalrusClient({ network: 'testnet' });
