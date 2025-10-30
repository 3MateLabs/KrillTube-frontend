/**
 * Quick test script for Walrus configuration (no wallet needed)
 *
 * Tests:
 * - Client creation
 * - Network connectivity
 * - Cost calculation API
 * - Retry logic implementation
 *
 * Usage: npx tsx scripts/test-walrus-config.ts
 */

import * as walrusSdk from '../lib/client-walrus-sdk.js';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(msg: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

async function main() {
  log('\n╔════════════════════════════════════════════╗', 'cyan');
  log('║  Walrus Configuration Test (No Wallet)    ║', 'cyan');
  log('╚════════════════════════════════════════════╝', 'cyan');

  let passed = 0;
  let failed = 0;

  // Test 1: Client Creation
  log('\n✓ Test 1: Client Creation', 'cyan');
  try {
    const client = walrusSdk.createWalrusClient('mainnet');
    const systemState = await client.systemState();

    const totalCapacity = BigInt(systemState.total_capacity_size);
    const usedCapacity = BigInt(systemState.used_capacity_size);
    const usage = (Number(usedCapacity) / Number(totalCapacity) * 100).toFixed(2);

    log(`  Network: mainnet`, 'green');
    log(`  Capacity: ${(Number(totalCapacity) / 1e12).toFixed(2)} TB (${usage}% used)`, 'green');
    log(`  Storage Nodes: ${systemState.committee.members.length}`, 'green');
    log(`  ✓ PASS\n`, 'green');
    passed++;
  } catch (error) {
    log(`  ✗ FAIL: ${error}`, 'red');
    failed++;
  }

  // Test 2: Cost Calculation
  log('✓ Test 2: Cost Calculation', 'cyan');
  try {
    const testSizes = [
      { name: '1 MB', bytes: 1024 * 1024 },
      { name: '10 MB', bytes: 10 * 1024 * 1024 },
      { name: '100 MB', bytes: 100 * 1024 * 1024 },
    ];

    for (const size of testSizes) {
      const cost = await walrusSdk.calculateStorageCost(size.bytes, {
        network: 'mainnet',
        epochs: 50,
      });
      log(`  ${size.name}: ${cost.totalCostWal} WAL (50 epochs)`, 'green');
    }
    log(`  ✓ PASS\n`, 'green');
    passed++;
  } catch (error) {
    log(`  ✗ FAIL: ${error}`, 'red');
    failed++;
  }

  // Test 3: Retry Logic Check
  log('✓ Test 3: Retry Logic Implementation', 'cyan');
  try {
    const fs = await import('fs');
    const content = fs.readFileSync('./app/upload/page.tsx', 'utf-8');

    const checks = [
      { name: 'Segment retry', pattern: /segmentRetries[\s\S]*while[\s\S]*segmentRetries > 0/ },
      { name: 'Playlist retry', pattern: /while \(retries > 0\)[\s\S]*playlistQuilt/ },
      { name: 'Master retry', pattern: /masterRetries[\s\S]*while[\s\S]*masterRetries > 0/ },
      { name: '2s delay', pattern: /setTimeout.*2000/g },
    ];

    let allPassed = true;
    for (const check of checks) {
      const found = check.pattern.test(content);
      if (found) {
        log(`  ${check.name}: ✓`, 'green');
      } else {
        log(`  ${check.name}: ✗`, 'red');
        allPassed = false;
      }
    }

    if (allPassed) {
      log(`  ✓ PASS\n`, 'green');
      passed++;
    } else {
      log(`  ✗ FAIL: Missing retry patterns`, 'red');
      failed++;
    }
  } catch (error) {
    log(`  ✗ FAIL: ${error}`, 'red');
    failed++;
  }

  // Test 4: SDK Configuration Check
  log('✓ Test 4: SDK Configuration', 'cyan');
  try {
    const fs = await import('fs');
    const sdkContent = fs.readFileSync('./lib/client-walrus-sdk.ts', 'utf-8');

    const hasDirectUpload = !sdkContent.includes('uploadRelay:') || sdkContent.includes('// Direct node uploads');
    const hasTimeout = sdkContent.includes('timeout:');
    const hasRetryComment = sdkContent.includes('retry') || sdkContent.includes('DIRECT');

    log(`  Direct node upload: ${hasDirectUpload ? '✓' : '✗'}`, hasDirectUpload ? 'green' : 'red');
    log(`  Timeout configured: ${hasTimeout ? '✓' : '✗'}`, hasTimeout ? 'green' : 'red');
    log(`  No upload relay bug: ${hasDirectUpload ? '✓' : '✗'}`, hasDirectUpload ? 'green' : 'red');

    if (hasDirectUpload && hasTimeout) {
      log(`  ✓ PASS\n`, 'green');
      passed++;
    } else {
      log(`  ✗ FAIL: Configuration issues`, 'red');
      failed++;
    }
  } catch (error) {
    log(`  ✗ FAIL: ${error}`, 'red');
    failed++;
  }

  // Summary
  log('╔════════════════════════════════════════════╗', 'cyan');
  log('║  Summary                                   ║', 'cyan');
  log('╚════════════════════════════════════════════╝', 'cyan');
  log(`  Passed: ${passed}`, 'green');
  log(`  Failed: ${failed}`, failed > 0 ? 'red' : 'green');

  if (failed === 0) {
    log('\n🎉 All configuration tests passed!', 'green');
    log('Your Walrus SDK is properly configured.', 'green');
    log('\nNext step: Test actual upload in browser with wallet', 'cyan');
  } else {
    log('\n⚠️  Some tests failed. Check configuration.', 'yellow');
  }
}

main().catch(console.error);
