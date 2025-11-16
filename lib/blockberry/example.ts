/**
 * Example usage of Blockberry IOTA Price API
 * This file demonstrates how to use the Blockberry service
 */

import { getIotaCoinPrice, getIotaCoinMetadata } from './iotaPriceApi';

/**
 * Example 1: Get IOTA token price
 */
export async function exampleGetIotaPrice() {
  console.log('=== Example 1: Get IOTA Price ===');

  const iotaPrice = await getIotaCoinPrice('0x2::iota::IOTA');

  console.log(`IOTA Price: $${iotaPrice.toFixed(4)}`);
  console.log('');
}

/**
 * Example 2: Get full IOTA metadata
 */
export async function exampleGetIotaMetadata() {
  console.log('=== Example 2: Get IOTA Metadata ===');

  const metadata = await getIotaCoinMetadata('0x2::iota::IOTA');

  if (metadata) {
    console.log('Coin Information:');
    console.log(`  Name: ${metadata.coinName}`);
    console.log(`  Symbol: ${metadata.coinSymbol}`);
    console.log(`  Type: ${metadata.coinType}`);
    console.log(`  Decimals: ${metadata.decimals}`);
    console.log('');

    console.log('Market Data:');
    console.log(`  Total Supply: ${metadata.totalSupply.toLocaleString()}`);
    console.log(`  Circulating Supply: ${metadata.circulatingSupply.toLocaleString()}`);
    console.log(`  Market Cap: $${metadata.marketCap.toLocaleString()}`);
    console.log(`  24h Volume: $${metadata.volume.toLocaleString()}`);
    console.log('');

    // Calculate price
    const price = metadata.marketCap / metadata.circulatingSupply;
    console.log(`  Price (calculated): $${price.toFixed(4)}`);
    console.log('');

    console.log('Social Links:');
    if (metadata.socialWebsite) console.log(`  Website: ${metadata.socialWebsite}`);
    if (metadata.socialTwitter) console.log(`  Twitter: ${metadata.socialTwitter}`);
    if (metadata.socialGitHub) console.log(`  GitHub: ${metadata.socialGitHub}`);
    if (metadata.socialDiscord) console.log(`  Discord: ${metadata.socialDiscord}`);
    console.log('');

    if (metadata.description) {
      console.log('Description:');
      console.log(`  ${metadata.description}`);
      console.log('');
    }
  } else {
    console.log('Failed to fetch metadata');
  }
}

/**
 * Example 3: Compare prices for multiple tokens
 */
export async function exampleComparePrices() {
  console.log('=== Example 3: Compare Token Prices ===');

  const tokens = [
    { name: 'IOTA', type: '0x2::iota::IOTA' },
    // Add more tokens as needed
  ];

  for (const token of tokens) {
    const price = await getIotaCoinPrice(token.type);
    console.log(`${token.name}: $${price.toFixed(4)}`);
  }
  console.log('');
}

/**
 * Example 4: Client-side API usage (for reference)
 */
export async function exampleClientSideUsage() {
  console.log('=== Example 4: Client-Side API Usage ===');
  console.log('This example shows how to use the API from the browser:');
  console.log('');
  console.log('JavaScript:');
  console.log(`
    async function getIotaPrice() {
      const response = await fetch('/api/v1/iota/coin-price/0x2%3A%3Aiota%3A%3AIOTA');
      const data = await response.json();

      if (data.success) {
        console.log('IOTA Price:', data.price);
        console.log('Currency:', data.currency);
        console.log('Source:', data.source);
      } else {
        console.error('Error:', data.error);
      }
    }

    getIotaPrice();
  `);
  console.log('');
}

/**
 * Example 5: Error handling
 */
export async function exampleErrorHandling() {
  console.log('=== Example 5: Error Handling ===');

  try {
    // Try to fetch an invalid coin type
    const price = await getIotaCoinPrice('invalid-coin-type');

    if (price === 0) {
      console.log('Price returned 0 - coin not found or API error');
      console.log('Check logs for details');
    } else {
      console.log(`Price: $${price}`);
    }
  } catch (error) {
    console.error('Caught error:', error);
  }
  console.log('');
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║  Blockberry IOTA Price API - Usage Examples   ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('');

  await exampleGetIotaPrice();
  await exampleGetIotaMetadata();
  await exampleComparePrices();
  exampleClientSideUsage();
  await exampleErrorHandling();

  console.log('╔════════════════════════════════════════════════╗');
  console.log('║              Examples Complete                 ║');
  console.log('╚════════════════════════════════════════════════╝');
}

// Uncomment to run examples (for testing purposes)
// runAllExamples().catch(console.error);
