import { NextRequest, NextResponse } from 'next/server'

// Directus Configuration
const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055'
const DIRECTUS_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN || 'tZysSCeE3RsghJ1sX0Gr4idOrBgDGDG-'

// Make API request to Directus with authentication
async function makeDirectusRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${DIRECTUS_URL}/items/${endpoint}`
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${DIRECTUS_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    throw new Error(`Directus API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

export async function POST(request: NextRequest) {
  try {
    const { tokenId } = await request.json()

    if (!tokenId) {
      return NextResponse.json(
        { error: 'Token ID is required' },
        { status: 400 }
      )
    }

    console.log(`📊 Incrementing view count for token ${tokenId}`)

    // First get the current token to get the current view count
    const currentToken = await makeDirectusRequest(`meme_tokens/${tokenId}`)
    
    if (!currentToken.data) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      )
    }

    const currentViews = currentToken.data.views || 0
    const newViews = currentViews + 1

    // Update the view count
    await makeDirectusRequest(`meme_tokens/${tokenId}`, {
      method: 'PATCH',
      body: JSON.stringify({ views: newViews }),
    })

    console.log(`✅ View count incremented successfully for token ${tokenId}: ${currentViews} -> ${newViews}`)

    return NextResponse.json({ 
      success: true, 
      views: newViews 
    })

  } catch (error) {
    console.error('💥 Error incrementing view count:', error)
    return NextResponse.json(
      { error: 'Failed to increment view count' },
      { status: 500 }
    )
  }
}