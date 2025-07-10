// app/api/validate-token/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenName = searchParams.get('name');
    const tokenSymbol = searchParams.get('symbol');
    const tokenAddress = searchParams.get('address');
    
    console.log("🔍 [VALIDATION DEBUG] Received validation request:", {
      name: tokenName,
      symbol: tokenSymbol,
      address: tokenAddress
    });
    
    if (!tokenName && !tokenSymbol && !tokenAddress) {
      return NextResponse.json({ error: 'At least one field (name, symbol, or address) required' }, { status: 400 });
    }

    // Build validation checks for all provided fields
    let memeTokensResponse, submissionsResponse;
    let symbolMemeResponse, symbolSubmissionResponse;
    let addressMemeResponse, addressSubmissionResponse;
    
    // Check token name if provided
    if (tokenName) {
      memeTokensResponse = await fetch(
        `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/items/meme_tokens?filter[name][_icontains]=${encodeURIComponent(tokenName)}&limit=1`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.DIRECTUS_ADMIN_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );

      submissionsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/items/lore_submissions?filter[name][_icontains]=${encodeURIComponent(tokenName)}&limit=1`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.DIRECTUS_ADMIN_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Check token symbol if provided
    if (tokenSymbol) {
      symbolMemeResponse = await fetch(
        `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/items/meme_tokens?filter[symbol][_icontains]=${encodeURIComponent(tokenSymbol)}&limit=1`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.DIRECTUS_ADMIN_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );

      symbolSubmissionResponse = await fetch(
        `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/items/lore_submissions?filter[symbol][_icontains]=${encodeURIComponent(tokenSymbol)}&limit=1`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.DIRECTUS_ADMIN_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Check token address if provided
    if (tokenAddress) {
      addressMemeResponse = await fetch(
        `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/items/meme_tokens?filter[token_address][_eq]=${encodeURIComponent(tokenAddress)}&limit=1`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.DIRECTUS_ADMIN_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );

      addressSubmissionResponse = await fetch(
        `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/items/lore_submissions?filter[token_address][_eq]=${encodeURIComponent(tokenAddress)}&limit=1`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.DIRECTUS_ADMIN_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Parse all responses
    const memeTokensData = memeTokensResponse?.ok ? await memeTokensResponse.json() : { data: [] };
    const submissionsData = submissionsResponse?.ok ? await submissionsResponse.json() : { data: [] };
    const symbolMemeData = symbolMemeResponse?.ok ? await symbolMemeResponse.json() : { data: [] };
    const symbolSubmissionData = symbolSubmissionResponse?.ok ? await symbolSubmissionResponse.json() : { data: [] };
    const addressMemeData = addressMemeResponse?.ok ? await addressMemeResponse.json() : { data: [] };
    const addressSubmissionData = addressSubmissionResponse?.ok ? await addressSubmissionResponse.json() : { data: [] };

    // Check existence for each field
    const nameExistsInMeme = (memeTokensData.data && memeTokensData.data.length > 0);
    const nameExistsInSubmissions = (submissionsData.data && submissionsData.data.length > 0);
    const symbolExistsInMeme = (symbolMemeData.data && symbolMemeData.data.length > 0);
    const symbolExistsInSubmissions = (symbolSubmissionData.data && symbolSubmissionData.data.length > 0);
    const addressExistsInMeme = (addressMemeData.data && addressMemeData.data.length > 0);
    const addressExistsInSubmissions = (addressSubmissionData.data && addressSubmissionData.data.length > 0);

    // Determine overall availability
    const anyExistsInMeme = nameExistsInMeme || symbolExistsInMeme || addressExistsInMeme;
    const anyExistsInSubmissions = nameExistsInSubmissions || symbolExistsInSubmissions || addressExistsInSubmissions;

    console.log("🔍 [VALIDATION DEBUG] Comprehensive results:", {
      name: { existsInMeme: nameExistsInMeme, existsInSubmissions: nameExistsInSubmissions },
      symbol: { existsInMeme: symbolExistsInMeme, existsInSubmissions: symbolExistsInSubmissions },
      address: { existsInMeme: addressExistsInMeme, existsInSubmissions: addressExistsInSubmissions },
      overall: { anyExistsInMeme, anyExistsInSubmissions }
    });

    // Build detailed message
    let message = '';
    const conflicts = [];
    
    if (nameExistsInMeme) conflicts.push('name already exists');
    else if (nameExistsInSubmissions) conflicts.push('name already submitted');
    
    if (symbolExistsInMeme) conflicts.push('symbol already exists');
    else if (symbolExistsInSubmissions) conflicts.push('symbol already submitted');
    
    if (addressExistsInMeme) conflicts.push('address already exists');
    else if (addressExistsInSubmissions) conflicts.push('address already submitted');

    if (conflicts.length > 0) {
      message = `Token ${conflicts.join(', ')}`;
    } else {
      message = 'All fields are available';
    }

    return NextResponse.json({
      available: !anyExistsInMeme && !anyExistsInSubmissions,
      exists: anyExistsInMeme,
      hasPending: anyExistsInSubmissions && !anyExistsInMeme,
      message,
      details: {
        name: { available: !nameExistsInMeme && !nameExistsInSubmissions, exists: nameExistsInMeme, pending: nameExistsInSubmissions },
        symbol: { available: !symbolExistsInMeme && !symbolExistsInSubmissions, exists: symbolExistsInMeme, pending: symbolExistsInSubmissions },
        address: { available: !addressExistsInMeme && !addressExistsInSubmissions, exists: addressExistsInMeme, pending: addressExistsInSubmissions }
      }
    });

  } catch (error) {
    console.error('Error validating token:', error);
    return NextResponse.json({ error: 'Validation failed' }, { status: 500 });
  }
}
