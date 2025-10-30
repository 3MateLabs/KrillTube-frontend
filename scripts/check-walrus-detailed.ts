/**
 * Detailed Walrus network inspection
 */

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

async function checkWalrus() {
  const client = new SuiClient({ url: getFullnodeUrl('mainnet') });
  const systemObjectId = '0xfd9e5b1557fe292c7bcd29479b41dabdca93e840b69a3cec6a20327c4d5f36f5';

  try {
    const systemObject = await client.getObject({
      id: systemObjectId,
      options: { showContent: true, showType: true },
    });

    console.log('=== RAW SYSTEM OBJECT ===');
    console.log(JSON.stringify(systemObject, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}

checkWalrus();
