/**
 * Check Walrus mainnet configuration
 * Query the actual max_epochs_ahead from blockchain
 */

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

async function checkWalrusConfig() {
  const client = new SuiClient({ url: getFullnodeUrl('mainnet') });

  // Walrus system object ID on mainnet
  const systemObjectId = '0xfd9e5b1557fe292c7bcd29479b41dabdca93e840b69a3cec6a20327c4d5f36f5';

  try {
    console.log('Fetching Walrus system state from mainnet...\n');

    const systemObject = await client.getObject({
      id: systemObjectId,
      options: {
        showContent: true,
        showType: true,
      },
    });

    if (systemObject.data?.content?.dataType === 'moveObject') {
      const fields = systemObject.data.content.fields as any;

      console.log('Walrus System Configuration:');
      console.log('================================');
      console.log('DEBUG: fields.inner exists?', !!fields.inner);

      // Get inner state
      if (fields.inner?.fields) {
        const inner = fields.inner.fields;

        const totalCapacity = BigInt(inner.total_capacity_size);
        const usedCapacity = BigInt(inner.used_capacity_size);
        const usagePercent = (Number(usedCapacity) / Number(totalCapacity) * 100).toFixed(2);

        console.log('Total Capacity:', (Number(totalCapacity) / 1_000_000_000_000).toFixed(2), 'TB');
        console.log('Used Capacity:', (Number(usedCapacity) / 1_000_000_000_000).toFixed(2), 'TB');
        console.log('Usage:', `${usagePercent}%`);
        console.log('Storage Price per Unit:', inner.storage_price_per_unit_size);
        console.log('Write Price per Unit:', inner.write_price_per_unit_size);

        // Check future accounting ring buffer
        if (inner.future_accounting?.fields) {
          const accounting = inner.future_accounting.fields;
          console.log('\n🔍 Max Epochs Ahead:', accounting.max_epochs_ahead || 'Not found');
          console.log('Current Index:', accounting.current_index);
          console.log('Ring Buffer Length:', accounting.length);
        }

        // Check committee
        if (inner.committee?.fields) {
          const committee = inner.committee.fields;
          console.log('\nCommittee Epoch:', committee.epoch);
          console.log('Number of Shards:', committee.n_shards);
        }
      }
    }

    console.log('\n✅ Configuration retrieved successfully');
  } catch (error) {
    console.error('❌ Error fetching Walrus configuration:', error);
  }
}

checkWalrusConfig();
