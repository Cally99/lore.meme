// manual-flow-test.js
const DIRECTUS_URL = 'http://localhost:8055';
const ADMIN_TOKEN = 'tZysSCeE3RsghJ1sX0Gr4idOrBgDGDG-';

async function makeDirectusRequest(endpoint, options = {}) {
  const response = await fetch(`${DIRECTUS_URL}/${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status}: ${text}`);
  if (!text) return { data: null };
  return JSON.parse(text);
}

async function manualFlowTest() {
  console.log('🔍 Manual flow test...');
  
  // 1. Manually create what the flow should create
  console.log('Creating meme_token manually for submission 12...');
  
  const submission12 = await makeDirectusRequest('items/lore_submissions/12');
  const sub = submission12.data;
  
  try {
    const manualToken = await makeDirectusRequest('items/meme_tokens', {
      method: 'POST',
      body: JSON.stringify({
        "name": sub.token,
        "symbol": sub.token_symbol,
        "token_address": sub.token_address,
        "lore_content": sub.lore_content,
        "coingecko_id": sub.token_address,
        "verified": sub.verified,
        "lore_count": 0,
        "lore_submitted_by": sub.submitted_by,
        "lore_submission_date": new Date().toISOString(),
        "lore_verification_status": "approved",
        "twitter_handle": sub.x_url,
        "telegram_handle": sub.telegram,
        "likes_count": 0,
        "view_count": 0,
        "added_by": sub.submitted_by,
        "added_date": new Date().toISOString(),
        "featured": sub.fast_tracked
      })
    });
    
    console.log('✅ Manual creation SUCCESS! Token ID:', manualToken.data.id);
    
    // Clean up
    await makeDirectusRequest(`items/meme_tokens/${manualToken.data.id}`, { method: 'DELETE' });
    
  } catch (error) {
    console.log('❌ Manual creation FAILED:', error.message);
    console.log('This proves there are permission/field issues');
    return;
  }
  
  // 2. Check if flows exist and are active
  const flows = await makeDirectusRequest('flows');
  const loreFlows = flows.data.filter(f => 
    f.name.toLowerCase().includes('lore') || 
    f.name.toLowerCase().includes('publish')
  );
  
  console.log('\n📊 Current flows:');
  loreFlows.forEach(flow => {
    console.log(`   ${flow.name}: ${flow.status} (${flow.id})`);
  });
  
  if (loreFlows.length === 0) {
    console.log('❌ NO LORE FLOWS FOUND!');
    return;
  }
  
  // 3. Test flow trigger by forcing an update
  console.log('\n🧪 Testing flow trigger...');
  
  await makeDirectusRequest('items/lore_submissions/12', {
    method: 'PATCH',
    body: JSON.stringify({
      description_about_token: "Manual test trigger " + Date.now()
    })
  });
  
  console.log('Updated submission 12');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Check if token was created
  const tokens = await makeDirectusRequest('items/meme_tokens?filter[name][_eq]=' + sub.token);
  if (tokens.data?.length > 0) {
    console.log('🎉 Flow worked! Token created:', tokens.data[0].id);
  } else {
    console.log('❌ Flow did NOT trigger');
    
    // Check if there's any activity/logs
    try {
      const activity = await makeDirectusRequest('activity?filter[collection][_eq]=meme_tokens&limit=3&sort=-timestamp');
      if (activity.data?.length > 0) {
        console.log('Recent meme_tokens activity:');
        activity.data.forEach(act => {
          console.log(`   ${act.timestamp}: ${act.action}`);
        });
      } else {
        console.log('No recent meme_tokens activity at all');
      }
    } catch (e) {
      console.log('Could not check activity');
    }
  }
}

manualFlowTest().catch(console.error);
