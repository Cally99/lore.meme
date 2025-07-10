/* eslint-disable padding-line-between-statements, newline-before-return */
import axios from 'axios';
import { config as dotenvConfig } from 'dotenv';

// Load environment variables
dotenvConfig();

// --- Configuration ---
const config = {
  DIRECTUS_URL: process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055',
  ADMIN_TOKEN: process.env.ADMIN_TOKEN || 'tZysSCeE3RsghJ1sX0Gr4idOrBgDGDG-',
  COINGECKO_API_URL: process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3',
  COINGECKO_API_KEY: process.env.COINGECKO_API_KEY || 'CG-DqaXbdtAi62VaDTt6zskLtZx',
  DEBUG: process.env.SCRIPT_DEBUG === 'true' || process.env.DEBUG === 'true' || false,
  CONTINUE_ON_ERROR: process.env.CONTINUE_ON_ERROR === 'true' || true,
  BATCH_SIZE: parseInt(process.env.BATCH_SIZE) || 5,
  RATE_LIMIT_DELAY: parseInt(process.env.RATE_LIMIT_DELAY) || 1500, // 1.5 seconds between API calls
};

// Track script execution state
let scriptSuccess = true;
let scriptWarnings = 0;
let scriptErrors = 0;

// Logging functions
const logStep = (message) => console.log(`\n=== STEP: ${message} ===\n`);
const logInfo = (message) => console.log(`INFO: ${message}`);
const logSuccess = (message) => console.log(`SUCCESS: ${message}`);
const logDebug = (message) => config.DEBUG && console.log(`DEBUG: ${message}`);
const logError = (message) => {
  scriptErrors++;
  console.log(`ERROR: ${message}`);
};
const logWarning = (message) => {
  scriptWarnings++;
  console.log(`WARNING: ${message}`);
};

// Axios instance for Directus
const api = axios.create({
  baseURL: config.DIRECTUS_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Sleep function for rate limiting
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// STEP 1: Get market data (prices, volume, etc.)
async function fetchMarketData() {
  logInfo('🔍 Fetching market data for meme tokens...');
  
  try {
    const url = `${config.COINGECKO_API_URL}/coins/markets`;
    const params = {
      vs_currency: 'usd',
      category: 'meme-token',
      order: 'market_cap_desc',
      per_page: 100,
      page: 1,
      sparkline: false,
      price_change_percentage: '1h,24h,7d'
    };
    
    const headers = config.COINGECKO_API_KEY ? {
      'x-cg-demo-api-key': config.COINGECKO_API_KEY
    } : {};
    
    const response = await axios.get(url, { params, headers });
    logSuccess(`✅ Got market data for ${response.data.length} tokens`);
    
    return response.data;
    
  } catch (error) {
    logError(`Failed to fetch market data: ${error.message}`);
    throw error;
  }
}

// STEP 2: Get platform/address data for ALL tokens
async function fetchPlatformData() {
  logInfo('🔍 Fetching platform data for ALL tokens...');
  
  try {
    const url = `${config.COINGECKO_API_URL}/coins/list`;
    const params = {
      include_platform: true
    };
    
    const headers = config.COINGECKO_API_KEY ? {
      'x-cg-demo-api-key': config.COINGECKO_API_KEY
    } : {};
    
    const response = await axios.get(url, { params, headers });
    logSuccess(`✅ Got platform data for ${response.data.length} total coins`);
    
    // Convert to lookup object for easy access
    const platformLookup = {};
    response.data.forEach(coin => {
      if (coin.platforms) {
        platformLookup[coin.id] = coin.platforms;
      }
    });
    
    return platformLookup;
    
  } catch (error) {
    logError(`Failed to fetch platform data: ${error.message}`);
    throw error;
  }
}

// STEP 3: Get social data for tokens (one by one to avoid rate limits)
async function fetchSocialData(tokenIds) {
  logInfo(`🔍 Fetching social data for ${tokenIds.length} tokens...`);
  
  const socialLookup = {};
  const batchSize = config.BATCH_SIZE;
  
  for (let i = 0; i < tokenIds.length; i += batchSize) {
    const batch = tokenIds.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(tokenIds.length / batchSize);
    
    logInfo(`Processing social data batch ${batchNumber}/${totalBatches} (${batch.length} tokens)...`);
    
    for (const tokenId of batch) {
      try {
        const url = `${config.COINGECKO_API_URL}/coins/${tokenId}`;
        const params = {
          localization: false,
          tickers: false,
          market_data: false,
          community_data: false,
          developer_data: false,
          sparkline: false
        };
        
        const headers = config.COINGECKO_API_KEY ? {
          'x-cg-demo-api-key': config.COINGECKO_API_KEY
        } : {};
        
        const response = await axios.get(url, { params, headers });
        
        // Extract social links from the response
        const coin = response.data;
        const links = coin.links || {};
        
        socialLookup[tokenId] = {
          twitter_handle: links.twitter_screen_name || null,
          telegram_handle: links.telegram_channel_identifier || null,
          homepage: links.homepage?.[0] || null,
          // Additional social links you might want
          reddit_url: links.subreddit_url || null,
          discord_url: links.chat_url?.[0] || null,
          facebook_username: links.facebook_username || null,
          official_forum_url: links.official_forum_url?.[0] || null,
        };
        
        logDebug(`✓ Got social data for ${tokenId}`);
        
        // Rate limiting - wait between requests
        await sleep(config.RATE_LIMIT_DELAY);
        
      } catch (error) {
        logWarning(`Failed to fetch social data for ${tokenId}: ${error.message}`);
        // Continue with empty social data for this token
        socialLookup[tokenId] = {
          twitter_handle: null,
          telegram_handle: null,
          homepage: null,
          reddit_url: null,
          discord_url: null,
          facebook_username: null,
          official_forum_url: null,
        };
      }
    }
    
    // Additional delay between batches
    if (i + batchSize < tokenIds.length) {
      logInfo(`Waiting ${config.RATE_LIMIT_DELAY}ms before next batch...`);
      await sleep(config.RATE_LIMIT_DELAY);
    }
  }
  
  logSuccess(`✅ Got social data for ${Object.keys(socialLookup).length} tokens`);
  return socialLookup;
}

// Helper: Extract best token address from platforms
function extractTokenAddress(platforms) {
  if (!platforms || typeof platforms !== 'object') {
    return { address: null, chain: null };
  }
  
  // Priority order for chains
  const chainPriority = [
    { key: 'ethereum', name: 'ethereum' },
    { key: 'binance-smart-chain', name: 'bsc' },
    { key: 'polygon-pos', name: 'polygon' },
    { key: 'solana', name: 'solana' },
    { key: 'base', name: 'base' }
  ];
  
  for (const { key, name } of chainPriority) {
    const address = platforms[key];
    if (address && isValidAddress(address, name)) {
      return { address, chain: name };
    }
  }
  
  return { address: null, chain: null };
}

// Helper: Validate token address
function isValidAddress(address, chain) {
  if (!address || typeof address !== 'string') return false;
  
  // Reject obvious dummy values
  if (address.length <= 3 || /^[0HE]$/.test(address)) return false;
  
  switch (chain) {
    case 'ethereum':
    case 'bsc':
    case 'polygon':
    case 'base':
      return address.startsWith('0x') && address.length === 42;
    case 'solana':
      return address.length >= 32 && address.length <= 44;
    default:
      return address.length > 10;
  }
}

// STEP 4: Merge all data locally
function mergeAllData(marketData, platformLookup, socialLookup) {
  logInfo('🔧 Merging all data locally...');
  
  const processedTokens = marketData.map(coin => {
    const platforms = platformLookup[coin.id] || {};
    const { address, chain } = extractTokenAddress(platforms);
    const social = socialLookup[coin.id] || {};
    
    return {
      coingecko_id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      image_url: coin.image,
      current_price: coin.current_price,
      market_cap: coin.market_cap,
      market_cap_rank: coin.market_cap_rank,
      price_change_24h: coin.price_change_24h,
      price_change_percentage_24h: coin.price_change_percentage_24h,
      price_change_percentage_1h: coin.price_change_percentage_1h_in_currency,
      price_change_percentage_7d: coin.price_change_percentage_7d_in_currency,
      total_volume: coin.total_volume,
      circulating_supply: coin.circulating_supply,
      total_supply: coin.total_supply,
      max_supply: coin.max_supply,
      verified: Math.random() > 0.3,
      lore_count: Math.floor(Math.random() * 100),
      community_score: Math.floor(Math.random() * 100),
      trending_score: Math.floor(Math.random() * 100),
      last_price_update: new Date().toISOString(),
      
      // Enhanced social data
      twitter_handle: social.twitter_handle,
      telegram_handle: social.telegram_handle,
      homepage: social.homepage,
      reddit_url: social.reddit_url,
      discord_url: social.discord_url,
      facebook_username: social.facebook_username,
      official_forum_url: social.official_forum_url,
      
      // Platform data
      token_address: address,
      token_chain: chain,
      
      // Default workflow fields
      lore_content: null,
      lore_submitted_by: null,
      lore_submission_date: null,
      lore_verification_status: 'draft',
      likes_count: 0,
      view_count: 0,
      added_by: null,
      added_date: new Date().toISOString(),
      age_days: 0
    };
  });
  
  logSuccess(`✅ Processed ${processedTokens.length} tokens locally`);
  return processedTokens;
}

// STEP 5: Import to Directus
async function importToDirectus(tokens) {
  logInfo(`🚀 Importing ${tokens.length} tokens to Directus...`);
  
  const batchSize = config.BATCH_SIZE;
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(tokens.length / batchSize);
    
    logInfo(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} tokens)...`);
    
    for (const tokenData of batch) {
      try {
        await makeApiRequest('POST', '/items/meme_tokens', tokenData);
        successCount++;
        logDebug(`✓ Imported ${tokenData.name} (Twitter: ${tokenData.twitter_handle || 'none'}, Telegram: ${tokenData.telegram_handle || 'none'})`);
      } catch (error) {
        errorCount++;
        if (error.response?.status === 400) {
          logWarning(`Token ${tokenData.name} already exists, skipping...`);
        } else {
          logError(`Failed to import ${tokenData.name}: ${error.message}`);
        }
      }
    }
    
    // Rate limiting between batches
    if (i + batchSize < tokens.length) {
      await sleep(1000);
    }
  }
  
  logSuccess(`🎉 Import completed! Success: ${successCount}, Errors: ${errorCount}`);
  return { successCount, errorCount };
}

// Make API request to Directus
async function makeApiRequest(method, url, data = null) {
  const headers = config.ADMIN_TOKEN ? { 
    Authorization: `Bearer ${config.ADMIN_TOKEN}` 
  } : {};
  
  const requestConfig = { method, url, headers };
  if (data) requestConfig.data = data;
  
  const response = await api(requestConfig);
  
  // Small delay to avoid overwhelming Directus
  await sleep(100);
  return response;
}

// Main function
async function importFromAPI() {
  logStep('Enhanced CoinGecko Import with Social Links');
  
  try {
    // Step 1: Get market data
    const marketData = await fetchMarketData();
    
    // Step 2: Get platform data for ALL tokens
    const platformLookup = await fetchPlatformData();
    
    // Step 3: Get social data for top tokens (limit to avoid rate limits)
    const topTokenIds = marketData.slice(0, 20).map(token => token.id); // Reduced to 20 for better rate limit handling
    const socialLookup = await fetchSocialData(topTokenIds);
    
    // Step 4: Merge all data locally
    const processedTokens = mergeAllData(marketData, platformLookup, socialLookup);
    
    // Step 5: Import to Directus
    await importToDirectus(processedTokens);
    
    logSuccess('🎉 ALL DONE! Enhanced import with social links completed successfully!');
    
  } catch (error) {
    logError(`Import failed: ${error.message}`);
  }
}

// Show usage
function showUsage() {
  console.log(`
Usage:
  node directus-meme-tokens.mjs import-api  - Enhanced import with social links
`);
}

// Main execution
async function main() {
  const command = process.argv[2];
  
  if (config.DEBUG) {
    console.log('DEBUG: === ENHANCED DIRECTUS MEME TOKENS SCRIPT ===');
    console.log(`DEBUG: Command: ${command || 'none'}`);
    console.log(`DEBUG: Rate limit delay: ${config.RATE_LIMIT_DELAY}ms`);
    console.log(`DEBUG: Batch size: ${config.BATCH_SIZE}`);
  }
  
  if (!command) {
    showUsage();
    process.exit(0);
  }
  
  switch (command) {
    case 'import-api':
      await importFromAPI();
      break;
    default:
      console.log(`Unknown command: ${command}`);
      showUsage();
      process.exit(1);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  logError(`Unhandled rejection: ${error.message}`);
});

process.on('uncaughtException', (error) => {
  logError(`Uncaught exception: ${error.message}`);
});

// Run the script
main().catch((error) => {
  logError(`Script failed: ${error.message}`);
});