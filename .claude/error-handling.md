# Error Handling Best Practices

## Standard Pattern for All Catch Blocks

**ALWAYS** use this pattern when catching and re-throwing errors:

```typescript
try {
  // Your code here
} catch (error) {
  console.error('[Component/Module] ❌ Descriptive error message:', error);
  throw new Error(
    `High-level description: ${error instanceof Error ? error.message : 'Unknown error'}`,
    { cause: error }
  );
}
```

## Why This Pattern?

### 1. **Preserves Error Stack Trace**
Using `{ cause: error }` preserves the original error chain, making debugging easier:

```typescript
// ❌ BAD - loses stack trace
catch (error) {
  throw new Error(`Failed: ${error.message}`);
}

// ✅ GOOD - preserves full error chain
catch (error) {
  throw new Error(`Failed: ${error.message}`, { cause: error });
}
```

### 2. **Console Logging for Immediate Debug**
Always log the error BEFORE re-throwing. This ensures the error is visible in console even if caught higher up:

```typescript
catch (error) {
  console.error('[Upload] ❌ Failed to upload segment:', error);
  throw new Error(`Failed to upload segment: ${error.message}`, { cause: error });
}
```

### 3. **Contextual Error Messages**
Add context at each level of the call stack:

```typescript
// Low-level function
catch (error) {
  console.error('[Walrus SDK] ❌ Failed to register blob:', error);
  throw new Error(`Failed to register blob: ${error.message}`, { cause: error });
}

// High-level function
catch (error) {
  console.error('[Upload] ❌ Failed to upload video segment:', error);
  throw new Error(`Failed to upload video segment: ${error.message}`, { cause: error });
}

// Results in error chain:
// "Failed to upload video segment: Failed to register blob: Network timeout"
```

## Complete Examples

### Example 1: API Call with Retry

```typescript
async function uploadToWalrus(blob: Uint8Array, retries = 3): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[Walrus] Upload attempt ${attempt}/${retries}`);
      const result = await walrusClient.upload(blob);
      return result.blobId;
    } catch (error) {
      lastError = error as Error;
      console.error(`[Walrus] ❌ Upload attempt ${attempt}/${retries} failed:`, error);

      if (attempt < retries) {
        const delayMs = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`[Walrus] Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw new Error(
    `Failed to upload to Walrus after ${retries} attempts: ${lastError?.message || 'Unknown error'}`,
    { cause: lastError }
  );
}
```

### Example 2: Transaction with Validation

```typescript
async function registerBlob(blobId: string): Promise<string> {
  try {
    // Build transaction
    const tx = new Transaction();
    const registerTx = await walrusClient.registerBlobTransaction({ blobId, ... });

    // Sign and execute
    const result = await signAndExecute({ transaction: registerTx });
    console.log(`[Walrus] ✓ Register transaction: ${result.digest}`);

    // Wait for confirmation
    const txDetails = await suiClient.waitForTransaction({
      digest: result.digest,
      options: { showEffects: true, showObjectChanges: true },
    });

    // Validate success
    if (txDetails.effects?.status?.status !== 'success') {
      const errorMsg = txDetails.effects?.status?.error || 'Unknown error';
      throw new Error(`Transaction failed: ${errorMsg}`);
    }

    // Find blob object
    const blobType = await walrusClient.getBlobType();
    const blobObject = txDetails.objectChanges?.find(
      (obj: any) => obj.type === 'created' && obj.objectType === blobType
    );

    if (!blobObject) {
      console.error('[Walrus] ❌ Blob object not found:', {
        expectedType: blobType,
        actualChanges: txDetails.objectChanges,
      });
      throw new Error(`Blob object not found. Expected: ${blobType}`);
    }

    return blobObject.objectId;

  } catch (error) {
    console.error('[Walrus] ❌ Failed to register blob:', error);
    throw new Error(
      `Failed to register blob ${blobId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { cause: error }
    );
  }
}
```

### Example 3: Batch Processing with Individual Error Handling

```typescript
async function uploadMultipleBlobs(
  blobs: Array<{ identifier: string; contents: Uint8Array }>
): Promise<Array<{ identifier: string; blobId: string }>> {
  const results: Array<{ identifier: string; blobId: string }> = [];
  const errors: Array<{ identifier: string; error: Error }> = [];

  for (const blob of blobs) {
    try {
      console.log(`[Upload] Uploading ${blob.identifier}...`);
      const blobId = await uploadSingleBlob(blob.contents);
      console.log(`[Upload] ✓ ${blob.identifier}: ${blobId}`);
      results.push({ identifier: blob.identifier, blobId });
    } catch (error) {
      console.error(`[Upload] ❌ Failed to upload ${blob.identifier}:`, error);
      errors.push({
        identifier: blob.identifier,
        error: error as Error,
      });
    }
  }

  if (errors.length > 0) {
    const errorDetails = errors.map(e => `${e.identifier}: ${e.error.message}`).join(', ');
    throw new Error(
      `Failed to upload ${errors.length}/${blobs.length} blobs: ${errorDetails}`,
      { cause: errors[0].error } // First error as cause
    );
  }

  return results;
}
```

## Error Logging Format

Use consistent prefixes for different components:

- `[Upload]` - Upload orchestration
- `[Walrus SDK]` - Walrus client operations
- `[HTTP Upload]` - HTTP-based uploads
- `[TunnelConfig]` - Tunnel payment configuration
- `[Upload V2]` - Upload page component
- `[SessionManager]` - Video session management

Use emoji indicators:
- `✓` - Success
- `⏳` - Waiting/in-progress
- `❌` - Error
- `🔍` - Debug/investigation
- `📋` - Information dump
- `🧪` - Testing/dry run

## Anti-Patterns to Avoid

### ❌ Silent Errors
```typescript
catch (error) {
  // Just logging, no re-throw
  console.error('Error:', error);
  return null; // Silently failing
}
```

### ❌ Losing Error Context
```typescript
catch (error) {
  throw new Error('Something failed'); // Lost original error!
}
```

### ❌ Re-throwing Without Context
```typescript
catch (error) {
  throw error; // No additional context added
}
```

### ❌ String Concatenation of Error
```typescript
catch (error) {
  throw new Error('Failed: ' + error); // Error object becomes string
}
```

## Debugging with Error Cause Chain

When an error with `{ cause }` is logged, you can inspect the full chain:

```typescript
try {
  await someOperation();
} catch (error) {
  console.error('Top level error:', error);
  console.error('Error cause:', (error as Error).cause);
  console.error('Full chain:', {
    message: (error as Error).message,
    cause: (error as Error).cause,
    stack: (error as Error).stack,
  });
}
```

## TypeScript Types

```typescript
// Proper error typing
catch (error: unknown) {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error('[Module] ❌ Operation failed:', err);
  throw new Error(`Operation failed: ${err.message}`, { cause: err });
}
```

## Summary Checklist

For every catch block:
- [ ] Log error with `console.error` before re-throwing
- [ ] Include component/module prefix (e.g., `[Upload]`)
- [ ] Use ❌ emoji for errors
- [ ] Add contextual description
- [ ] Re-throw with `{ cause: error }`
- [ ] Use `error instanceof Error` check
- [ ] Provide meaningful high-level message

**This pattern makes debugging significantly easier by preserving the complete error chain while adding context at each level.**
