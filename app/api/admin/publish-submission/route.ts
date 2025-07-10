// @ts-nocheck
// app/api/admin/publish-submission/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '../../auth/[...nextauth]/route'
import { postToSocialMedia, logSocialMediaResults } from '../../../../lib/utils/social-media'

async function publishSubmission(submissionId: string): Promise<{ success: boolean, memeTokenId?: string, submission?: any, error?: string }> {
  try {
    console.log('🔍 DEBUG: Starting publishSubmission for ID:', submissionId);
    console.log('🔍 DEBUG: Environment check:', {
      directusUrl: process.env.NEXT_PUBLIC_DIRECTUS_URL,
      hasAdminToken: !!process.env.DIRECTUS_ADMIN_TOKEN,
      adminTokenLength: process.env.DIRECTUS_ADMIN_TOKEN?.length
    });

    const submissionResponse = await fetch(
      `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/items/lore_submission2/${submissionId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.DIRECTUS_ADMIN_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('🔍 DEBUG: Submission fetch response:', {
      status: submissionResponse.status,
      statusText: submissionResponse.statusText,
      ok: submissionResponse.ok
    });

    if (!submissionResponse.ok) {
      const errorText = await submissionResponse.text();
      console.error('❌ DEBUG: Failed to fetch submission:', errorText);
      throw new Error(`Failed to fetch submission: ${errorText}`);
    }

    const submissionData = await submissionResponse.json();
    const submission = submissionData.data;

    console.log('🔍 DEBUG: Submission data retrieved:', {
      id: submissionId,
      token: submission.token,
      token_symbol: submission.token_symbol,
      submitted_by: submission.submitted_by,
      submitted_by_type: typeof submission.submitted_by,
      is_fasttrack: submission.is_fasttrack,
      relationship_to_token: submission.relationship_to_token,
      status: submission.status,
      published: submission.published
    });

    const tokenData = {
      name: submission.token,
      symbol: submission.token_symbol,
      token_address: submission.token_address,
      lore_content: submission.lore_content,
      verified: submission.relationship_to_token === 'Owner / Team Member',
      lore_submitted_by: submission.submitted_by,
      lore_submission_date: new Date().toISOString(),
      likes_count: 0,
      view_count: 0,
      // Mark fast-track submissions as featured (optional)
      featured: submission.is_fasttrack || false,
      // Generate a placeholder coingecko_id (required field)
      coingecko_id: submission.token_symbol.toLowerCase(),
      added_by: submission.submitted_by,
      added_date: new Date().toISOString(),
      ...(submission.token_image && { image_url: submission.token_image }),
      ...(submission.x_url && { twitter_handle: submission.x_url }),
      ...(submission.telegram && { telegram_handle: submission.telegram }),
    };

    console.log('🔍 DEBUG: Token data to be created:', JSON.stringify(tokenData, null, 2));

    const tokenResponse = await fetch(`${process.env.NEXT_PUBLIC_DIRECTUS_URL}/items/meme_tokens`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DIRECTUS_ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tokenData),
    });

    console.log('🔍 DEBUG: Token creation response:', {
      status: tokenResponse.status,
      statusText: tokenResponse.statusText,
      ok: tokenResponse.ok
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('❌ DEBUG: Failed to create meme token:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        errorText: errorText
      });
      throw new Error(`Failed to create meme token: ${errorText}`);
    }

    const tokenResult = await tokenResponse.json();
    const memeTokenId = tokenResult.data.id;

    console.log('✅ DEBUG: Meme token created successfully:', {
      memeTokenId: memeTokenId,
      tokenResult: tokenResult.data
    });

    const submissionUpdateData = {
      status: 'published',
      verified: submission.relationship_to_token === 'Owner / Team Member',
      meme_token: memeTokenId,
      date_published: new Date().toISOString(),
    };

    console.log('🔍 DEBUG: Updating submission with:', submissionUpdateData);

    const updateResponse = await fetch(`${process.env.NEXT_PUBLIC_DIRECTUS_URL}/items/lore_submission2/${submissionId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.DIRECTUS_ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submissionUpdateData),
    });

    console.log('🔍 DEBUG: Submission update response:', {
      status: updateResponse.status,
      statusText: updateResponse.statusText,
      ok: updateResponse.ok
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('❌ DEBUG: Failed to update submission:', errorText);
    }

    console.log('✅ DEBUG: Publishing process completed successfully');
    return { success: true, memeTokenId, submission };

  } catch (error) {
    console.error('❌ DEBUG: Publishing process failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function handleFastTrackSocialMedia(
  submissionId: string,
  memeTokenId: string,
  tokenData: any,
  submission: any
): Promise<{ socialMediaResults?: any[], error?: string }> {
  try {
    console.log('🚀 Processing fast-track social media posting for:', tokenData.name);

    // Post to social media platforms
    const socialMediaResults = await postToSocialMedia({
      name: tokenData.name,
      symbol: tokenData.symbol,
      lore: tokenData.lore,
      contract_address: tokenData.contract_address,
      slug: tokenData.slug
    });

    // Log results to database
    await logSocialMediaResults(submissionId, memeTokenId, socialMediaResults);

    // Update submission with social media posting status
    const socialMediaStatus = {
      social_media_posted: true,
      social_media_posted_at: new Date().toISOString(),
      twitter_posted: socialMediaResults.find(r => r.platform === 'twitter')?.success || false,
      telegram_posted: socialMediaResults.find(r => r.platform === 'telegram')?.success || false
    };

    await fetch(`${process.env.NEXT_PUBLIC_DIRECTUS_URL}/items/lore_submission2/${submissionId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.DIRECTUS_ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(socialMediaStatus),
    });

    console.log('✅ Fast-track social media posting completed');
    return { socialMediaResults };

  } catch (error) {
    console.error('❌ Fast-track social media posting failed:', error);
    return { error: error instanceof Error ? error.message : 'Social media posting failed' };
  }
}

// Legacy function for backward compatibility
async function triggerSocialMediaFlow(memeTokenId: string, tokenData: any) {
  try {
    console.log('📢 Triggering legacy social media flow for:', tokenData.name);
    await fetch(`${process.env.NEXT_PUBLIC_DIRECTUS_URL}/flows/trigger/publish-token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DIRECTUS_ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        meme_token_id: memeTokenId,
        token_data: tokenData
      }),
    });
  } catch (error) {
    console.error('❌ Legacy social media flow error:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roleId = (session.user as any).directus_role_id;
    
    if (roleId !== process.env.ADMIN_ROLE_ID) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { submissionId } = await request.json();

    if (!submissionId) {
      return NextResponse.json({ error: 'Submission ID required' }, { status: 400 });
    }

    const result = await publishSubmission(submissionId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const tokenResponse = await fetch(
      `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/items/meme_tokens/${result.memeTokenId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.DIRECTUS_ADMIN_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    let socialMediaResults = null;
    let socialMediaError = null;

    if (tokenResponse.ok) {
      const tokenData = await tokenResponse.json();
      
      // Check if this is a fast-track submission
      if (result.submission?.is_fasttrack) {
        console.log('🚀 Fast-track submission detected - triggering social media posting');
        
        const socialMediaResult = await handleFastTrackSocialMedia(
          submissionId,
          result.memeTokenId,
          tokenData.data,
          result.submission
        );
        
        socialMediaResults = socialMediaResult.socialMediaResults;
        socialMediaError = socialMediaResult.error;
        
        if (socialMediaError) {
          console.error('⚠️ Social media posting failed but continuing with publication');
        }
      } else {
        console.log('📢 Regular submission - using legacy social media flow');
        await triggerSocialMediaFlow(result.memeTokenId, tokenData.data);
      }
    }

    // Prepare response message
    let message = 'Submission published successfully';
    if (result.submission?.is_fasttrack) {
      if (socialMediaError) {
        message += '. Fast-track social media posting encountered errors.';
      } else if (socialMediaResults) {
        const successCount = socialMediaResults.filter(r => r.success).length;
        const totalCount = socialMediaResults.length;
        message += `. Fast-track benefits applied: posted to ${successCount}/${totalCount} social media platforms.`;
      }
    }

    return NextResponse.json({
      success: true,
      memeTokenId: result.memeTokenId,
      message,
      isFastTrack: result.submission?.is_fasttrack || false,
      socialMediaResults: result.submission?.is_fasttrack ? socialMediaResults : undefined,
      socialMediaError: result.submission?.is_fasttrack ? socialMediaError : undefined
    });

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to publish submission'
    }, { status: 500 });
  }
}