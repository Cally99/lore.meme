// @ts-nocheck
// lib/utils/social-media.ts
import { NextResponse } from 'next/server';

interface TokenData {
  name: string;
  symbol: string;
  lore: string;
  contract_address: string;
  slug: string;
}

interface SocialMediaResult {
  success: boolean;
  platform: string;
  error?: string;
  postId?: string;
}

// Twitter API posting function
export async function postToTwitter(tokenData: TokenData): Promise<SocialMediaResult> {
  try {
    console.log('🐦 Attempting to post to Twitter for token:', tokenData.name);

    // Check if Twitter credentials are configured
    if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_API_SECRET || 
        !process.env.TWITTER_ACCESS_TOKEN || !process.env.TWITTER_ACCESS_TOKEN_SECRET) {
      console.log('⚠️ Twitter API credentials not configured');
      return {
        success: false,
        platform: 'twitter',
        error: 'Twitter API credentials not configured'
      };
    }

    // Create Twitter post content
    const lorePreview = tokenData.lore.length > 100 
      ? tokenData.lore.substring(0, 100) + '...' 
      : tokenData.lore;
    
    const tokenUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/token/${tokenData.contract_address}`;
    
    const tweetContent = `🚀 New token lore just dropped! ${tokenData.name} ($${tokenData.symbol}) - ${lorePreview} Read the full story: ${tokenUrl} #crypto #meme #lore`;

    // Twitter API v2 endpoint
    const twitterResponse = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: tweetContent
      }),
    });

    if (!twitterResponse.ok) {
      const errorData = await twitterResponse.text();
      console.error('❌ Twitter API error:', errorData);
      return {
        success: false,
        platform: 'twitter',
        error: `Twitter API error: ${twitterResponse.status}`
      };
    }

    const result = await twitterResponse.json();
    console.log('✅ Successfully posted to Twitter:', result.data?.id);

    return {
      success: true,
      platform: 'twitter',
      postId: result.data?.id
    };

  } catch (error) {
    console.error('❌ Error posting to Twitter:', error);
    return {
      success: false,
      platform: 'twitter',
      error: error instanceof Error ? error.message : 'Unknown Twitter error'
    };
  }
}

// Telegram posting function
export async function postToTelegram(tokenData: TokenData): Promise<SocialMediaResult> {
  try {
    console.log('📱 Attempting to post to Telegram for token:', tokenData.name);

    // Check if Telegram credentials are configured
    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHANNEL_ID) {
      console.log('⚠️ Telegram API credentials not configured');
      return {
        success: false,
        platform: 'telegram',
        error: 'Telegram API credentials not configured'
      };
    }

    // Create Telegram post content
    const lorePreview = tokenData.lore.length > 200 
      ? tokenData.lore.substring(0, 200) + '...' 
      : tokenData.lore;
    
    const tokenUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/token/${tokenData.contract_address}`;
    
    const telegramMessage = `🚀 *New Token Lore Alert!*

*${tokenData.name}* \\($${tokenData.symbol}\\)

${lorePreview.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&')}

[Read the full story](${tokenUrl})

\\#crypto \\#meme \\#lore`;

    // Telegram Bot API endpoint
    const telegramResponse = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHANNEL_ID,
        text: telegramMessage,
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: false
      }),
    });

    if (!telegramResponse.ok) {
      const errorData = await telegramResponse.text();
      console.error('❌ Telegram API error:', errorData);
      return {
        success: false,
        platform: 'telegram',
        error: `Telegram API error: ${telegramResponse.status}`
      };
    }

    const result = await telegramResponse.json();
    console.log('✅ Successfully posted to Telegram:', result.result?.message_id);

    return {
      success: true,
      platform: 'telegram',
      postId: result.result?.message_id?.toString()
    };

  } catch (error) {
    console.error('❌ Error posting to Telegram:', error);
    return {
      success: false,
      platform: 'telegram',
      error: error instanceof Error ? error.message : 'Unknown Telegram error'
    };
  }
}

// Main social media posting function
export async function postToSocialMedia(tokenData: TokenData): Promise<SocialMediaResult[]> {
  console.log('📢 Starting social media posting for token:', tokenData.name);
  
  const results: SocialMediaResult[] = [];
  
  // Post to Twitter
  const twitterResult = await postToTwitter(tokenData);
  results.push(twitterResult);
  
  // Post to Telegram
  const telegramResult = await postToTelegram(tokenData);
  results.push(telegramResult);
  
  // Log summary
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log(`📊 Social media posting summary: ${successCount}/${totalCount} successful`);
  
  return results;
}

// Log social media posting results to Directus
export async function logSocialMediaResults(
  submissionId: string, 
  memeTokenId: string, 
  results: SocialMediaResult[]
): Promise<void> {
  try {
    const logData = {
      submission_id: submissionId,
      meme_token_id: memeTokenId,
      twitter_success: results.find(r => r.platform === 'twitter')?.success || false,
      twitter_post_id: results.find(r => r.platform === 'twitter')?.postId || null,
      twitter_error: results.find(r => r.platform === 'twitter')?.error || null,
      telegram_success: results.find(r => r.platform === 'telegram')?.success || false,
      telegram_post_id: results.find(r => r.platform === 'telegram')?.postId || null,
      telegram_error: results.find(r => r.platform === 'telegram')?.error || null,
      posted_at: new Date().toISOString()
    };

    // Log to Directus (create a social_media_posts collection if needed)
    await fetch(`${process.env.NEXT_PUBLIC_DIRECTUS_URL}/items/social_media_posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(logData),
    });

    console.log('✅ Social media results logged to database');
  } catch (error) {
    console.error('❌ Failed to log social media results:', error);
  }
}