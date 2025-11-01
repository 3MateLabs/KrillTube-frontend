/**
 * Walrus HTTP API for Testnet (no wallet required)
 * Uses public publisher for free uploads
 */

export interface HttpUploadResult {
  blobId: string;
  blobObjectId: string;
  size: number;
  cost: number;
}

/**
 * Upload blob via HTTP API (Testnet only - free)
 */
export async function uploadBlobHttp(
  blob: Uint8Array,
  publisherUrl: string,
  options?: {
    epochs?: number;
    deletable?: boolean;
  }
): Promise<HttpUploadResult> {
  const { epochs = 1, deletable = true } = options || {};

  const queryParams = new URLSearchParams({
    epochs: epochs.toString(),
    ...(deletable ? { deletable: 'true' } : { permanent: 'true' }),
  });

  const response = await fetch(`${publisherUrl}/v1/blobs?${queryParams}`, {
    method: 'PUT',
    body: blob,
    headers: {
      'Content-Type': 'application/octet-stream',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP upload failed: ${response.status} ${error}`);
  }

  const result = await response.json();

  if (result.newlyCreated) {
    return {
      blobId: result.newlyCreated.blobObject.blobId,
      blobObjectId: result.newlyCreated.blobObject.id,
      size: result.newlyCreated.blobObject.size,
      cost: result.newlyCreated.cost || 0,
    };
  } else if (result.alreadyCertified) {
    return {
      blobId: result.alreadyCertified.blobId,
      blobObjectId: result.alreadyCertified.blobId, // Use blobId as fallback
      size: 0,
      cost: 0,
    };
  }

  throw new Error('Unexpected response format from publisher');
}

/**
 * Upload multiple blobs via HTTP API (Testnet only)
 */
export async function uploadMultipleBlobsHttp(
  blobs: Array<{ contents: Uint8Array; identifier: string }>,
  publisherUrl: string,
  options?: {
    epochs?: number;
    deletable?: boolean;
    onProgress?: (uploaded: number, total: number) => void;
  }
): Promise<Array<{ identifier: string; blobId: string; blobObjectId: string }>> {
  const { epochs = 1, deletable = true, onProgress } = options || {};
  const results: Array<{ identifier: string; blobId: string; blobObjectId: string }> = [];

  for (let i = 0; i < blobs.length; i++) {
    const blob = blobs[i];

    try {
      const result = await uploadBlobHttp(blob.contents, publisherUrl, {
        epochs,
        deletable,
      });

      results.push({
        identifier: blob.identifier,
        blobId: result.blobId,
        blobObjectId: result.blobObjectId,
      });

      onProgress?.(i + 1, blobs.length);
    } catch (error) {
      throw new Error(
        `Failed to upload ${blob.identifier}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  return results;
}

/**
 * Upload quilt via HTTP API (Testnet only)
 */
export async function uploadQuiltHttp(
  blobs: Array<{ contents: Uint8Array; identifier: string }>,
  publisherUrl: string,
  options?: {
    epochs?: number;
    deletable?: boolean;
  }
): Promise<{
  blobId: string;
  blobObjectId: string;
  patches: Array<{
    patchId: string;
    identifier: string;
  }>;
}> {
  const { epochs = 1, deletable = true } = options || {};

  const formData = new FormData();

  // Add each blob to form data
  blobs.forEach((blob) => {
    formData.append(
      blob.identifier,
      new Blob([blob.contents], { type: 'application/octet-stream' }),
      blob.identifier
    );
  });

  const queryParams = new URLSearchParams({
    epochs: epochs.toString(),
    ...(deletable ? { deletable: 'true' } : { permanent: 'true' }),
  });

  const response = await fetch(`${publisherUrl}/v1/quilts?${queryParams}`, {
    method: 'PUT',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP quilt upload failed: ${response.status} ${error}`);
  }

  const result = await response.json();

  if (!result.blobStoreResult?.newlyCreated && !result.blobStoreResult?.alreadyCertified) {
    throw new Error('Unexpected quilt response format');
  }

  const blobObject = result.blobStoreResult.newlyCreated?.blobObject ||
                     result.blobStoreResult.alreadyCertified;

  const patches = (result.storedQuiltBlobs || []).map((patch: any) => ({
    patchId: patch.quiltPatchId,
    identifier: patch.identifier,
  }));

  return {
    blobId: blobObject.blobId,
    blobObjectId: blobObject.id || blobObject.blobId,
    patches,
  };
}
