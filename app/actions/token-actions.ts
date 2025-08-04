// lib/actions/token-actions.ts - Enhanced with pagination

// @ts-ignore
"use server"
import { revalidatePath } from "next/cache"

// Directus Configuration
const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL
const DIRECTUS_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN

// Your exact Token interface from the UI
interface Token {
  id: string
  name: string
  symbol: string
  address: string
  description: string
  story: string
  image_url: string
  created_at: string
  created_by: string
  creator_type?: string
  telegram?: string
  email: string
  twitter?: string
  dexscreener?: string
  featured: boolean
  status: string
  good_lores: number
  // Add price change fields for volume sorting
  price_change_percentage_1h?: number
  price_change_percentage_24h?: number
  price_change_percentage_7d?: number
  total_volume?: number
}

interface PaginatedTokensResponse {
  tokens: Token[]
  totalCount: number
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

// Map Directus status to UI status
function mapDirectusStatusToUI(directusStatus: string): string {
  switch (directusStatus) {
    case 'approved':
      return 'approved'
    case 'pending':
      return 'pending'
    case 'rejected':
      return 'rejected'
    case 'draft':
      return 'pending'
    default:
      return 'approved' // Default to approved for imported tokens
  }
}

function getImageUrl(imageUrl: string | null): string {
  if (!imageUrl) {
    return "/placeholder.svg?height=200&width=200"
  }
  
  // If it's already a full URL, use it as-is
  if (imageUrl.startsWith('http')) {
    return imageUrl
  }
  
  // If it's a UUID, construct Cloudflare R2 URL
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidRegex.test(imageUrl)) {
    return `${process.env.CLOUDFLARE_R2_URL}/${imageUrl}`
  }
  
  // Fallback to Directus assets
  return `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/assets/${imageUrl}`
}

// Map Directus data to your UI Token interface
function transformDirectusToken(directusToken: any): Token {
  console.log("🔍 [CREATOR TYPE DEBUG] Raw Directus token data:", {
    id: directusToken.id,
    name: directusToken.name,
    added_by: directusToken.added_by,
    relationship_to_token: directusToken.relationship_to_token,
    creator_type: directusToken.creator_type,
    all_fields: Object.keys(directusToken)
  });

  // Fix creator type mapping based on the actual relationship field
  let creatorType = "Community"; // Default
  
  if (directusToken.relationship_to_token === "creator" || directusToken.relationship_to_token === "owner") {
    creatorType = "Owner";
  } else if (directusToken.relationship_to_token === "community") {
    creatorType = "Community";
  } else if (directusToken.added_by) {
    // Fallback to old logic if relationship_to_token is not available
    creatorType = "Owner";
  }

  console.log("🔍 [CREATOR TYPE DEBUG] Determined creator type:", creatorType);

  return {
    id: directusToken.id,
    name: directusToken.name,
    symbol: directusToken.symbol,
    address: directusToken.token_address || directusToken.coingecko_id,
    description: directusToken.description || "No description available",
    story: directusToken.lore_content || "No story available",
    image_url: getImageUrl(directusToken.image_url),
    created_at: directusToken.added_date || directusToken.lore_submission_date || new Date().toISOString(),
    created_by: "admin@lore.meme",
    telegram: directusToken.telegram_handle,
    email: "admin@lore.meme",
    twitter: directusToken.twitter_handle,
    dexscreener: `https://dexscreener.com/search?q=${directusToken.token_address}`,
    featured: directusToken.featured || false,
    status: mapDirectusStatusToUI(directusToken.lore_verification_status),
    good_lores: directusToken.lore_count || 0,
    creator_type: creatorType,
    
    // Add price change fields for volume sorting
    price_change_percentage_1h: directusToken.price_change_percentage_1h || 0,
    price_change_percentage_24h: directusToken.price_change_percentage_24h || 0,
    price_change_percentage_7d: directusToken.price_change_percentage_7d || 0,
    total_volume: directusToken.total_volume || 0,
  }
}

// Make API request to Directus
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

// Enhanced getTokens with pagination
// Enhanced getTokens with pagination
export async function getTokensWithPagination(options?: {
  status?: "pending" | "approved" | "rejected"
  featured?: boolean
  page?: number
  limit?: number
  orderBy?: string
  sortBy?: "volume_1h" | "volume_24h" | "volume_7d" | "newest" | "top"
}): Promise<PaginatedTokensResponse> {
  console.log("🚀 getTokensWithPagination called with options:", options)

  try {
    const page = options?.page || 1
    const limit = options?.limit || 20
    const offset = (page - 1) * limit

    // Build query parameters
    const params = new URLSearchParams()
    
    // Add pagination
    params.append('limit', limit.toString())
    params.append('offset', offset.toString())
    
    // Add filtering
    if (options?.status) {
      params.append('filter[lore_verification_status][_eq]', options.status)
    }
    
    if (options?.featured !== undefined) {
      params.append('filter[featured][_eq]', options.featured.toString())
    }
    
    // Add sorting based on sortBy option
    if (options?.sortBy) {
      switch (options.sortBy) {
        case 'volume_1h':
          params.append('sort', '-price_change_percentage_1h')
          break
        case 'volume_24h':
          params.append('sort', '-price_change_percentage_24h')
          break
        case 'volume_7d':
          params.append('sort', '-price_change_percentage_7d')
          break
        case 'newest':
          params.append('sort', '-added_date')
          break
        case 'top':
        default:
          params.append('sort', '-lore_count')
          break
      }
    } else if (options?.orderBy) {
      const sortDirection = '-'
      params.append('sort', `${sortDirection}${options.orderBy}`)
    } else {
      params.append('sort', '-lore_count')
    }

    // Get total count first
    const countParams = new URLSearchParams()
    if (options?.status) {
      countParams.append('filter[lore_verification_status][_eq]', options.status)
    }
    if (options?.featured !== undefined) {
      countParams.append('filter[featured][_eq]', options.featured.toString())
    }
    countParams.append('aggregate[count]', '*')

    const countResponse = await makeDirectusRequest(`meme_tokens?${countParams.toString()}`)
    const totalCount = countResponse.data?.[0]?.count || 0

    // Get paginated data
    const endpoint = `meme_tokens?${params.toString()}`
    const response = await makeDirectusRequest(endpoint)
    
    const tokens = response.data?.map(transformDirectusToken) || []
    
    const totalPages = Math.ceil(totalCount / limit)
    
    console.log(`✅ Successfully fetched ${tokens.length} tokens from Directus (page ${page}/${totalPages})`)
    
    return {
      tokens,
      totalCount,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    }

  } catch (error) {
    console.error("💥 Error fetching tokens from Directus:", error)
    return {
      tokens: [],
      totalCount: 0,
      currentPage: 1,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false
    }
  }
}

// Keep original getTokens for backward compatibility
export async function getTokens(options?: {
  status?: "pending" | "approved" | "rejected"
  featured?: boolean
  limit?: number
  orderBy?: string
  sortBy?: "volume_1h" | "volume_24h" | "volume_7d" | "newest" | "top"
}) {
  const result = await getTokensWithPagination(options)
  return result.tokens
}

// Rest of your existing functions remain the same...
export async function getToken(identifier: string) {
  console.log("🔍 getToken called with identifier:", identifier)

  try {
    const endpoint = `meme_tokens/${identifier}`
    const response = await makeDirectusRequest(endpoint)
    
    if (response.data) {
      return transformDirectusToken(response.data)
    }
    
    return null
  } catch (error) {
    console.error("💥 Error fetching token from Directus:", error)
    return null
  }
}

export async function getTokenByAddress(address: string, includeAllStatuses: boolean = true) {
  console.log("🔍 getTokenByAddress called with address:", address, "includeAllStatuses:", includeAllStatuses)

  try {
    const params = new URLSearchParams()
    params.append('filter[token_address][_eq]', address)
    params.append('limit', '1')

    if (!includeAllStatuses) {
      params.append('filter[lore_verification_status][_eq]', 'approved')
    }

    const endpoint = `meme_tokens?${params.toString()}`
    console.log("🔍 [TOKEN DEBUG] Querying endpoint:", endpoint)
    
    const response = await makeDirectusRequest(endpoint)
    console.log("🔍 [TOKEN DEBUG] Raw response:", JSON.stringify(response, null, 2))
    
    if (response.data && response.data.length > 0) {
      const token = transformDirectusToken(response.data[0])
      console.log("✅ [TOKEN DEBUG] Token found and transformed:", {
        id: token.id,
        name: token.name,
        symbol: token.symbol,
        address: token.address,
        status: token.status
      })
      return token
    }
    
    console.log("❌ [TOKEN DEBUG] No token found for address:", address)
    console.log("🔍 [TOKEN DEBUG] Response data length:", response.data?.length || 0)
    return null
  } catch (error) {
    console.error("💥 Error fetching token by address from Directus:", error)
    return null
  }
}

export async function getTokenBySymbol(symbol: string, includeAllStatuses: boolean = true) {
  console.log("🔍 getTokenBySymbol called with symbol:", symbol, "includeAllStatuses:", includeAllStatuses)

  try {
    const params = new URLSearchParams()
    params.append('filter[symbol][_icontains]', symbol)
    params.append('limit', '1')

    if (!includeAllStatuses) {
      params.append('filter[lore_verification_status][_eq]', 'approved')
    }

    const endpoint = `meme_tokens?${params.toString()}`
    console.log("🔍 [TOKEN DEBUG] Querying endpoint:", endpoint)
    
    const response = await makeDirectusRequest(endpoint)
    console.log("🔍 [TOKEN DEBUG] Raw response:", JSON.stringify(response, null, 2))
    
    if (response.data && response.data.length > 0) {
      const token = transformDirectusToken(response.data[0])
      console.log("✅ [TOKEN DEBUG] Token found and transformed:", {
        id: token.id,
        name: token.name,
        symbol: token.symbol,
        address: token.address,
        status: token.status
      })
      return token
    }
    
    console.log("❌ [TOKEN DEBUG] No token found for symbol:", symbol)
    console.log("🔍 [TOKEN DEBUG] Response data length:", response.data?.length || 0)
    return null
  } catch (error) {
    console.error("💥 Error fetching token by symbol from Directus:", error)
    return null
  }
}

export async function incrementGoodLores(id: string) {
  console.log(`❤️ Incrementing lore count for token ${id}`)

  try {
    const currentToken = await getToken(id)
    if (!currentToken) {
      console.error("Token not found for lore increment")
      return { success: true, count: 1 }
    }

    const newCount = currentToken.good_lores + 1

    const response = await makeDirectusRequest(`meme_tokens/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ lore_count: newCount }),
    })

    console.log("✅ Lore count incremented successfully in Directus")
    console.log("🔄 [REVALIDATE DEBUG] Calling revalidatePath for token ID:", id)
    console.log("🔄 [REVALIDATE DEBUG] Current token symbol:", currentToken.symbol)
    
    revalidatePath(`/token/${id}`)
    revalidatePath(`/token/${currentToken.symbol}`)
    revalidatePath(`/token/${encodeURIComponent(currentToken.symbol)}`)
    revalidatePath('/all-tokens')
    
    console.log("🔄 [REVALIDATE DEBUG] Revalidated paths:", [
      `/token/${id}`,
      `/token/${currentToken.symbol}`,
      `/token/${encodeURIComponent(currentToken.symbol)}`,
      '/all-tokens'
    ])
    
    return { success: true, count: newCount }

  } catch (error) {
    console.error("💥 Error incrementing lore count:", error)
    return { success: true, count: 1 }
  }
}

export async function decrementGoodLores(id: string) {
  console.log(`💔 Decrementing lore count for token ${id}`)

  try {
    const currentToken = await getToken(id)
    if (!currentToken) {
      console.error("Token not found for lore decrement")
      return { success: true, count: 0 }
    }

    const newCount = Math.max(0, currentToken.good_lores - 1)

    const response = await makeDirectusRequest(`meme_tokens/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ lore_count: newCount }),
    })

    console.log("✅ Lore count decremented successfully in Directus")
    console.log("🔄 [REVALIDATE DEBUG] Calling revalidatePath for token ID:", id)
    console.log("🔄 [REVALIDATE DEBUG] Current token symbol:", currentToken.symbol)
    
    revalidatePath(`/token/${id}`)
    revalidatePath(`/token/${currentToken.symbol}`)
    revalidatePath(`/token/${encodeURIComponent(currentToken.symbol)}`)
    revalidatePath('/all-tokens')
    
    console.log("🔄 [REVALIDATE DEBUG] Revalidated paths:", [
      `/token/${id}`,
      `/token/${currentToken.symbol}`,
      `/token/${encodeURIComponent(currentToken.symbol)}`,
      '/all-tokens'
    ])
    
    return { success: true, count: newCount }

  } catch (error) {
    console.error("💥 Error decrementing lore count:", error)
    return { success: true, count: 0 }
  }
}

export async function addUserLike(tokenId: string, userId: string) {
  console.log(`❤️ Adding user like for token ${tokenId} by user ${userId}`)

  try {
    // Check if user_likes collection exists, if not, create a simple tracking mechanism
    try {
      const existingLike = await makeDirectusRequest(`user_likes?filter[user_id][_eq]=${userId}&filter[token_id][_eq]=${tokenId}`)
      
      if (existingLike.data && existingLike.data.length > 0) {
        console.log("User has already liked this token")
        return { success: true, alreadyLiked: true }
      }

      const likeData = {
        user_id: userId,
        token_id: tokenId,
        date_created: new Date().toISOString()
      }

      await makeDirectusRequest('user_likes', {
        method: 'POST',
        body: JSON.stringify(likeData),
      })

      console.log("✅ User like added successfully")
      return { success: true, alreadyLiked: false }

    } catch (collectionError) {
      console.log("⚠️ user_likes collection not found, using fallback approach")
      // Fallback: Just return success and let the lore count increment
      return { success: true, alreadyLiked: false }
    }

  } catch (error) {
    console.error("💥 Error adding user like:", error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function removeUserLike(tokenId: string, userId: string) {
  console.log(`💔 Removing user like for token ${tokenId} by user ${userId}`)

  try {
    try {
      const existingLike = await makeDirectusRequest(`user_likes?filter[user_id][_eq]=${userId}&filter[token_id][_eq]=${tokenId}`)
      
      if (!existingLike.data || existingLike.data.length === 0) {
        console.log("No existing like found to remove")
        return { success: true, notFound: true }
      }

      const likeId = existingLike.data[0].id

      await makeDirectusRequest(`user_likes/${likeId}`, {
        method: 'DELETE',
      })

      console.log("✅ User like removed successfully")
      return { success: true, notFound: false }

    } catch (collectionError) {
      console.log("⚠️ user_likes collection not found, using fallback approach")
      // Fallback: Just return success and let the lore count decrement
      return { success: true, notFound: false }
    }

  } catch (error) {
    console.error("💥 Error removing user like:", error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function getUserLikeStatus(tokenId: string, userId: string) {
  console.log(`🔍 Checking user like status for token ${tokenId} by user ${userId}`)

  try {
    try {
      const existingLike = await makeDirectusRequest(`user_likes?filter[user_id][_eq]=${userId}&filter[token_id][_eq]=${tokenId}`)
      
      const hasLiked = existingLike.data && existingLike.data.length > 0
      
      return { success: true, hasLiked }

    } catch (collectionError) {
      console.log("⚠️ user_likes collection not found, using fallback approach")
      // Fallback: Check localStorage or return false
      return { success: true, hasLiked: false }
    }

  } catch (error) {
    console.error("💥 Error checking user like status:", error)
    return { success: false, hasLiked: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function toggleUserLike(tokenId: string, userId: string) {
  console.log(`🔄 Toggling user like for token ${tokenId} by user ${userId}`)

  try {
    const likeStatus = await getUserLikeStatus(tokenId, userId)
    
    if (!likeStatus.success) {
      return { success: false, error: "Failed to check like status" }
    }

    let result
    if (likeStatus.hasLiked) {
      const removeResult = await removeUserLike(tokenId, userId)
      if (removeResult.success && !removeResult.notFound) {
        result = await decrementGoodLores(tokenId)
        return { success: true, action: 'removed', count: result.count, hasLiked: false }
      }
    } else {
      const addResult = await addUserLike(tokenId, userId)
      if (addResult.success && !addResult.alreadyLiked) {
        result = await incrementGoodLores(tokenId)
        return { success: true, action: 'added', count: result.count, hasLiked: true }
      }
    }

    return { success: false, error: "Failed to toggle like" }

  } catch (error) {
    console.error("💥 Error toggling user like:", error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function getLoreSubmissions(options?: {
  status?: "pending" | "published" | "rejected"
  limit?: number
  orderBy?: string
}) {
  console.log("🚀 getLoreSubmissions called with options:", options)

  try {
    const params = new URLSearchParams()
    
    if (options?.status) {
      params.append('filter[status][_eq]', options.status)
    }
    
    if (options?.orderBy) {
      params.append('sort', `-${options.orderBy}`)
    } else {
      params.append('sort', '-is_fasttrack,-date_created')
    }
    
    if (options?.limit) {
      params.append('limit', options.limit.toString())
    }

    const endpoint = `lore_submissions?${params.toString()}`
    const response = await makeDirectusRequest(endpoint)
    
    const submissions = response.data || []
    
    console.log(`✅ Successfully fetched ${submissions.length} lore submissions from Directus`)
    return submissions

  } catch (error) {
    console.error("💥 Error fetching lore submissions from Directus:", error)
    return []
  }
}

export async function publishLoreSubmission(submissionId: string) {
  console.log(`📢 Publishing lore submission ${submissionId}`)

  try {
    // Just update the status - Directus Flow handles the rest!
    const response = await makeDirectusRequest(`lore_submissions/${submissionId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'published',
        date_updated: new Date().toISOString()
      }),
    })

    console.log("✅ Lore submission published successfully")
    revalidatePath('/admin')
    
    return {
      success: true,
      message: "Submission published successfully"
    }

  } catch (error) {
    console.error("💥 Error publishing lore submission:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function updateSubmissionStatus(id: string, status: string) {
  console.log(`🔄 Updating submission ${id} status to ${status}`)

  try {
    const response = await makeDirectusRequest(`lore_submissions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status,
        date_updated: new Date().toISOString()
      }),
    })

    console.log("✅ Submission status updated successfully")
    revalidatePath('/admin')
    return { success: true }

  } catch (error) {
    console.error("💥 Error updating submission status:", error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function deleteSubmission(id: string) {
  console.log(`🗑️ Deleting submission ${id}`)

  try {
    await makeDirectusRequest(`lore_submissions/${id}`, {
      method: 'DELETE',
    })

    console.log("✅ Submission deleted successfully")
    revalidatePath('/admin')
    return { success: true }

  } catch (error) {
    console.error("💥 Error deleting submission:", error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function updateTokenStatus(id: string, status: string) {
  console.log(`🔄 Legacy updateTokenStatus called for ${id} with status ${status}`)
  
  try {
    const response = await makeDirectusRequest(`meme_tokens/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status,
        date_updated: new Date().toISOString()
      }),
    })

    console.log("✅ Token status updated successfully")
    revalidatePath('/admin')
    return { success: true }

  } catch (error) {
    console.error("💥 Error updating token status:", error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function updateTokenFeatured(id: string, featured: boolean) {
  console.log(`⭐ Updating token ${id} featured status to ${featured}`)

  try {
    const response = await makeDirectusRequest(`meme_tokens/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ featured }),
    })

    console.log("✅ Token featured status updated successfully")
    revalidatePath('/admin')
    return { success: true }

  } catch (error) {
    console.error("💥 Error updating token featured status:", error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function deleteToken(id: string) {
  console.log(`🗑️ Deleting token ${id}`)

  try {
    await makeDirectusRequest(`meme_tokens/${id}`, {
      method: 'DELETE',
    })

    console.log("✅ Token deleted successfully")
    revalidatePath('/admin')
    return { success: true }

  } catch (error) {
    console.error("💥 Error deleting token:", error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function updateToken(id: string, tokenData: any) {
  console.log(`🔄 Updating token ${id} with data:`, tokenData)

  try {
    // Map the form data to Directus field names
    const directusData = {
      name: tokenData.name,
      symbol: tokenData.symbol,
      token_address: tokenData.address,
      description: tokenData.description,
      lore_content: tokenData.story,
      image_url: tokenData.image_url,
      twitter_handle: tokenData.twitter,
      telegram_handle: tokenData.telegram,
      dexscreener: tokenData.dexscreener,
      featured: tokenData.featured,
      date_updated: new Date().toISOString()
    }

    const response = await makeDirectusRequest(`meme_tokens/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(directusData),
    })

    console.log("✅ Token updated successfully")
    revalidatePath('/admin')
    revalidatePath('/all-tokens')
    revalidatePath(`/token/${id}`)
    
    return { success: true, data: response.data }

  } catch (error) {
    console.error("💥 Error updating token:", error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function submitToken(token: any) {
  return { success: true }
}


