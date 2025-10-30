/**
 * Test script for Walrus SDK upload implementation
 *
 * This script tests:
 * 1. Client creation with correct configuration
 * 2. Cost calculation from blockchain
 * 3. Small file upload (simulates segments)
 * 4. Quilt upload with multiple files (simulates playlists)
 * 5. Retry logic handling
 *
 * Usage:
 *   npx tsx scripts/test-walrus-upload.ts
 *
 * Requirements:
 *   - Wallet with WAL tokens on mainnet
 *   - WALLET_PRIVATE_KEY or WALLET_MNEMONIC in .env
 */

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromBase64 } from '@mysten/sui/utils';
import * as walrusSdk from '../lib/client-walrus-sdk.js';

// Test configuration
const NETWORK = (process.env.NEXT_PUBLIC_WALRUS_NETWORK as 'mainnet' | 'testnet') || 'mainnet';
const TEST_EPOCHS = 5; // Short storage duration for testing (10 days)

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function generateTestData(sizeKB: number): Uint8Array {
  const bytes = new Uint8Array(sizeKB * 1024);
  // Fill with pseudo-random data (repeating pattern for compression testing)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = (i % 256);
  }
  return bytes;
}

async function setupSigner() {
  log('\n📝 Setting up test signer...', 'cyan');

  // Try to load from environment
  const privateKeyHex = process.env.WALLET_PRIVATE_KEY;
  const mnemonic = process.env.WALLET_MNEMONIC;

  let keypair: Ed25519Keypair;

  if (privateKeyHex) {
    log('  Using private key from environment', 'blue');
    const privateKeyBytes = fromBase64(privateKeyHex);
    keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);
  } else if (mnemonic) {
    log('  Using mnemonic from environment', 'blue');
    keypair = Ed25519Keypair.deriveKeypair(mnemonic);
  } else {
    log('  ⚠️  No wallet credentials in .env, generating temporary keypair', 'yellow');
    log('  Note: This keypair has no funds - tests will fail at signing', 'yellow');
    keypair = new Ed25519Keypair();
  }

  const address = keypair.toSuiAddress();
  log(`  Address: ${address}`, 'blue');

  return keypair;
}

async function test1_ClientCreation() {
  log('\n🧪 Test 1: Client Creation', 'cyan');

  try {
    const client = walrusSdk.createWalrusClient(NETWORK);
    log('  ✓ Client created successfully', 'green');

    // Check system state
    const systemState = await client.systemState();
    const totalCapacity = BigInt(systemState.total_capacity_size);
    const usedCapacity = BigInt(systemState.used_capacity_size);
    const usagePercent = (Number(usedCapacity) / Number(totalCapacity) * 100).toFixed(2);

    log(`  Network: ${NETWORK}`, 'blue');
    log(`  Total Capacity: ${(Number(totalCapacity) / 1_000_000_000_000).toFixed(2)} TB`, 'blue');
    log(`  Used Capacity: ${(Number(usedCapacity) / 1_000_000_000_000).toFixed(2)} TB (${usagePercent}%)`, 'blue');
    log(`  Storage Nodes: ${systemState.committee.members.length}`, 'blue');

    return { success: true, client };
  } catch (error) {
    log(`  ✗ Failed: ${error instanceof Error ? error.message : error}`, 'red');
    return { success: false, error };
  }
}

async function test2_CostCalculation() {
  log('\n🧪 Test 2: Cost Calculation', 'cyan');

  try {
    const testSizes = [
      { name: 'Small (10 KB)', size: 10 * 1024 },
      { name: 'Medium (1 MB)', size: 1024 * 1024 },
      { name: 'Large (10 MB)', size: 10 * 1024 * 1024 },
    ];

    for (const testCase of testSizes) {
      const cost = await walrusSdk.calculateStorageCost(testCase.size, {
        network: NETWORK,
        epochs: TEST_EPOCHS,
      });

      log(`  ${testCase.name}:`, 'blue');
      log(`    Size: ${(testCase.size / 1024).toFixed(2)} KB`, 'blue');
      log(`    Storage: ${cost.totalCostWal} WAL`, 'blue');
      log(`    Duration: ${TEST_EPOCHS} epochs (~${TEST_EPOCHS * 2} days)`, 'blue');
    }

    log('  ✓ Cost calculations working', 'green');
    return { success: true };
  } catch (error) {
    log(`  ✗ Failed: ${error instanceof Error ? error.message : error}`, 'red');
    return { success: false, error };
  }
}

async function test3_SingleBlobUpload(signer: Ed25519Keypair) {
  log('\n🧪 Test 3: Single Blob Upload (10 KB)', 'cyan');

  try {
    const testData = generateTestData(10); // 10 KB

    log('  Calculating cost...', 'blue');
    const cost = await walrusSdk.calculateStorageCost(testData.length, {
      network: NETWORK,
      epochs: TEST_EPOCHS,
    });
    log(`  Cost: ${cost.totalCostWal} WAL`, 'blue');

    log('  Uploading blob (you will need to sign transaction)...', 'yellow');
    const result = await walrusSdk.uploadBlobWithSigner(testData, signer, {
      network: NETWORK,
      epochs: TEST_EPOCHS,
      deletable: true,
    });

    log('  ✓ Upload successful!', 'green');
    log(`    Blob ID: ${result.blobId}`, 'blue');
    log(`    Object ID: ${result.blobObject.id.id}`, 'blue');
    log(`    Cost: ${(Number(result.cost.totalCost) / 1_000_000_000).toFixed(6)} WAL`, 'blue');

    return { success: true, result };
  } catch (error) {
    log(`  ✗ Failed: ${error instanceof Error ? error.message : error}`, 'red');
    return { success: false, error };
  }
}

async function test4_QuiltUpload(signer: Ed25519Keypair) {
  log('\n🧪 Test 4: Quilt Upload (Multiple Files)', 'cyan');

  try {
    // Simulate video segments scenario
    const files = [
      { identifier: 'segment_0', size: 5 },
      { identifier: 'segment_1', size: 5 },
      { identifier: 'segment_2', size: 5 },
      { identifier: 'poster', size: 2 },
    ];

    const blobs = files.map(file => ({
      contents: generateTestData(file.size),
      identifier: file.identifier,
      tags: { type: file.identifier.includes('poster') ? 'image' : 'video' },
    }));

    const totalSize = blobs.reduce((sum, blob) => sum + blob.contents.length, 0);

    log(`  Preparing ${files.length} files (${(totalSize / 1024).toFixed(2)} KB total)`, 'blue');

    const cost = await walrusSdk.calculateStorageCost(totalSize, {
      network: NETWORK,
      epochs: TEST_EPOCHS,
    });
    log(`  Cost: ${cost.totalCostWal} WAL`, 'blue');

    log('  Uploading quilt (you will need to sign transaction)...', 'yellow');
    const result = await walrusSdk.uploadQuiltWithSigner(blobs, signer, {
      network: NETWORK,
      epochs: TEST_EPOCHS,
      deletable: true,
    });

    log('  ✓ Quilt upload successful!', 'green');
    log(`    Blob ID: ${result.blobId}`, 'blue');
    log(`    Patches: ${result.index.patches.length}`, 'blue');
    log(`    Cost: ${(Number(result.cost.totalCost) / 1_000_000_000).toFixed(6)} WAL`, 'blue');

    result.index.patches.forEach((patch, i) => {
      log(`      [${i}] ${patch.identifier} → ${patch.patchId}`, 'blue');
    });

    return { success: true, result };
  } catch (error) {
    log(`  ✗ Failed: ${error instanceof Error ? error.message : error}`, 'red');
    return { success: false, error };
  }
}

async function test5_RetryLogic() {
  log('\n🧪 Test 5: Retry Logic Verification', 'cyan');

  try {
    log('  Checking retry implementation in upload page...', 'blue');

    const uploadPagePath = './app/upload/page.tsx';
    const fs = await import('fs');
    const content = fs.readFileSync(uploadPagePath, 'utf-8');

    // Check for retry patterns
    const hasSegmentRetry = content.includes('segmentRetries') && content.includes('while (segmentRetries > 0)');
    const hasPlaylistRetry = content.includes('while (retries > 0)') && content.includes('playlistQuilt');
    const hasMasterRetry = content.includes('masterRetries') && content.includes('while (masterRetries > 0)');
    const hasDelays = (content.match(/setTimeout.*2000/g) || []).length >= 3;

    log(`    Segment upload retry: ${hasSegmentRetry ? '✓' : '✗'}`, hasSegmentRetry ? 'green' : 'red');
    log(`    Playlist upload retry: ${hasPlaylistRetry ? '✓' : '✗'}`, hasPlaylistRetry ? 'green' : 'red');
    log(`    Master upload retry: ${hasMasterRetry ? '✓' : '✗'}`, hasMasterRetry ? 'green' : 'red');
    log(`    2-second delays: ${hasDelays ? '✓' : '✗'}`, hasDelays ? 'green' : 'red');

    const allChecks = hasSegmentRetry && hasPlaylistRetry && hasMasterRetry && hasDelays;

    if (allChecks) {
      log('  ✓ Retry logic correctly implemented', 'green');
    } else {
      log('  ✗ Some retry logic missing', 'red');
    }

    return { success: allChecks };
  } catch (error) {
    log(`  ✗ Failed: ${error instanceof Error ? error.message : error}`, 'red');
    return { success: false, error };
  }
}

async function main() {
  log('╔═══════════════════════════════════════════════════════╗', 'cyan');
  log('║   Walrus SDK Upload Implementation Test Suite        ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════╝', 'cyan');

  const results: { name: string; success: boolean }[] = [];

  // Test 1: Client Creation
  const test1 = await test1_ClientCreation();
  results.push({ name: 'Client Creation', success: test1.success });

  // Test 2: Cost Calculation
  const test2 = await test2_CostCalculation();
  results.push({ name: 'Cost Calculation', success: test2.success });

  // Only run upload tests if we have a signer
  try {
    const signer = await setupSigner();

    // Test 3: Single Blob Upload
    log('\n⚠️  Next test requires wallet signature and WAL tokens', 'yellow');
    log('Press Ctrl+C to skip upload tests, or continue...', 'yellow');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const test3 = await test3_SingleBlobUpload(signer);
    results.push({ name: 'Single Blob Upload', success: test3.success });

    // Test 4: Quilt Upload
    if (test3.success) {
      const test4 = await test4_QuiltUpload(signer);
      results.push({ name: 'Quilt Upload', success: test4.success });
    } else {
      log('\n⏭️  Skipping quilt upload test (single blob failed)', 'yellow');
      results.push({ name: 'Quilt Upload', success: false });
    }
  } catch (error) {
    log('\n⏭️  Skipping upload tests (no wallet or interrupted)', 'yellow');
    results.push({ name: 'Single Blob Upload', success: false });
    results.push({ name: 'Quilt Upload', success: false });
  }

  // Test 5: Retry Logic
  const test5 = await test5_RetryLogic();
  results.push({ name: 'Retry Logic', success: test5.success });

  // Summary
  log('\n╔═══════════════════════════════════════════════════════╗', 'cyan');
  log('║   Test Results Summary                                ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════╝', 'cyan');

  results.forEach((result, i) => {
    const status = result.success ? '✓ PASS' : '✗ FAIL';
    const color = result.success ? 'green' : 'red';
    log(`  ${i + 1}. ${result.name.padEnd(30)} ${status}`, color);
  });

  const passed = results.filter(r => r.success).length;
  const total = results.length;

  log(`\n  Total: ${passed}/${total} tests passed`, passed === total ? 'green' : 'yellow');

  if (passed === total) {
    log('\n🎉 All tests passed! Implementation is working correctly.', 'green');
  } else {
    log('\n⚠️  Some tests failed. Check the output above for details.', 'yellow');
  }
}

main().catch(error => {
  log(`\n💥 Fatal error: ${error instanceof Error ? error.message : error}`, 'red');
  process.exit(1);
});
