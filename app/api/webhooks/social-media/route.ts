// app/api/webhooks/social-media/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { TwitterApi } from 'twitter-api-v2' 
// Twitter/X API functions
async function postToTwitter(tokenData: any) {
  try {
    const twitterClient = new TwitterApi({
      appKey: process.env.X_API_KEY!,
      appSecret: process.env.X_API_SECRET!,
      accessToken: process.env.X_ACCESS_TOKEN!,
      accessSecret: process.env.X_ACCESS_TOKEN_SECRET_KEY!,
    })

    const imageUrl = tokenData.image_url
    let mediaId: string | undefined

    // Upload image if available
    if (imageUrl) {
      try {
        const imageResponse = await fetch(imageUrl)
        const imageBuffer = await imageResponse.arrayBuffer()
        const uploadResult = await twitterClient.v1.uploadMedia(Buffer.from(imageBuffer), { mimeType: 'image/jpeg' })
        mediaId = uploadResult
      } catch (error) {
        console.warn('Failed to upload image to Twitter:', error)
      }
    }

    const tweetText = `🚀 New MemeToken Alert! $${tokenData.symbol} just launched with an epic lore! 🌟

Uncover the story at lore.meme/token/${tokenData.symbol}

Trade now: ${tokenData.dexscreener_url || `https://dexscreener.com/search?q=${tokenData.token_address}`}

${tokenData.telegram_handle ? `Join Telegram: ${tokenData.telegram_handle}` : ''}

#MemeToken #Crypto #NewLaunch`

    const tweetOptions: any = { text: tweetText }
    if (mediaId) {
      tweetOptions.media = { media_ids: [mediaId] }
    }

    const tweet = await twitterClient.v2.tweet(tweetOptions)
    
    return {
      platform: 'twitter',
      success: true,
      id: tweet.data.id,
      url: `https://twitter.com/loredotmeme/status/${tweet.data.id}`
    }
  } catch (error) {
    console.error('Twitter posting failed:', error)
    return {
      platform: 'twitter',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function postToTelegram(tokenData: any) {
  try {
    const botToken = process.env.TELEGRAM_BOT_KEY!
    const channelId = '@lorelistingbot' // or your channel ID

    const message = `🚀 New MemeToken Alert! $${tokenData.symbol} just launched with an epic lore! 🌟

**What's the story?**
Dive into the untold tale of $${tokenData.symbol} at lore.meme/token/${tokenData.symbol}. Discover how ${tokenData.description_about_token}.

**Where to trade?**
Check out ${tokenData.symbol} | Chart: ${tokenData.dexscreener_url || `https://dexscreener.com/search?q=${tokenData.token_address}`}

${tokenData.telegram_handle ? `**Join the community!**\nJoin our Telegram group: ${tokenData.telegram_handle}` : ''}

#MemeToken #Crypto #NewLaunch #Lore`

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`
    
    const payload: any = {
      chat_id: channelId,
      text: message,
      parse_mode: 'Markdown',
      disable_web_page_preview: false
    }

    // Send image separately if available
    if (tokenData.image_url) {
      const photoUrl = `https://api.telegram.org/bot${botToken}/sendPhoto`
      await fetch(photoUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: channelId,
          photo: tokenData.image_url,
          caption: `$${tokenData.symbol} Token Image`
        })
      })
    }

    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.status}`)
    }

    const result = await response.json()
    
    return {
      platform: 'telegram',
      success: true,
      id: result.result.message_id,
      url: `https://t.me/lorelistingbot/${result.result.message_id}`
    }
  } catch (error) {
    console.error('Telegram posting failed:', error)
    return {
      platform: 'telegram',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.WEBHOOK_SECRET}`
    
    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { meme_token_id, submission_id, is_fasttrack, token_data } = await request.json()

    if (!is_fasttrack) {
      return NextResponse.json({ 
        success: true, 
        message: 'Not a fast-track submission, skipping social media posting' 
      })
    }

    console.log('🚀 Processing fast-track social media for:', token_data.name)

    // Fetch full token data from Directus
    const tokenResponse = await fetch(
      `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/items/meme_tokens/${meme_token_id}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.DIRECTUS_ADMIN_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!tokenResponse.ok) {
      throw new Error('Failed to fetch token data')
    }

    const fullTokenData = await tokenResponse.json()
    const token = fullTokenData.data

    // Post to social media platforms
    const results = await Promise.allSettled([
      postToTwitter(token),
      postToTelegram(token)
    ])

    const socialMediaResults = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        return {
          platform: index === 0 ? 'twitter' : 'telegram',
          success: false,
          error: result.reason?.message || 'Unknown error'
        }
      }
    })

    // Log results to Directus
    await fetch(`${process.env.NEXT_PUBLIC_DIRECTUS_URL}/items/social_media_posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DIRECTUS_ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        submission_id,
        meme_token_id,
        posted_at: new Date().toISOString(),
        platforms: socialMediaResults,
        success_count: socialMediaResults.filter(r => r.success).length,
        total_platforms: socialMediaResults.length
      })
    })

    // Update submission with social media status
    await fetch(`${process.env.NEXT_PUBLIC_DIRECTUS_URL}/items/lore_submissions/${submission_id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.DIRECTUS_ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        social_media_posted: true,
        social_media_posted_at: new Date().toISOString(),
        twitter_posted: socialMediaResults.find(r => r.platform === 'twitter')?.success || false,
        telegram_posted: socialMediaResults.find(r => r.platform === 'telegram')?.success || false
      })
    })

    return NextResponse.json({ 
      success: true, 
      results: socialMediaResults,
      message: `Posted to ${socialMediaResults.filter(r => r.success).length}/${socialMediaResults.length} platforms`
    })

  } catch (error) {
    console.error('❌ Social media webhook error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Webhook failed' 
    }, { status: 500 })
  }
}
