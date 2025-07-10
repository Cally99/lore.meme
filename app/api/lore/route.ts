// @ts-ignore
// app/api/lore/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '../auth/[...nextauth]/route'

// Check if token name already exists in meme_tokens collection
async function checkTokenExists(tokenName: string): Promise<boolean> {
  try {
    console.log('🔍 Checking if token exists:', tokenName);
    
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/items/meme_tokens?filter[name][_eq]=${encodeURIComponent(tokenName.toLowerCase())}&limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.DIRECTUS_ADMIN_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      const exists = data.data && data.data.length > 0;
      console.log(exists ? '❌ Token already exists' : '✅ Token name available');
      return exists;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Error checking token existence:', error);
    return false; // If we can't check, allow submission (admin can review)
  }
}

// Check if token name already has a pending submission
async function checkPendingSubmission(tokenName: string): Promise<boolean> {
  try {
    console.log('🔍 Checking for pending submissions:', tokenName);
    
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/items/lore_submissions?filter[name][_eq]=${encodeURIComponent(tokenName.toLowerCase())}&filter[published][_eq]=false&limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.DIRECTUS_ADMIN_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      const hasPending = data.data && data.data.length > 0;
      console.log(hasPending ? '❌ Pending submission exists' : '✅ No pending submissions');
      return hasPending;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Error checking pending submissions:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Starting lore submission API call');
    
    // Get user session
    const session = await getServerSession(authConfig);
    
    if (!session?.user?.email) {
      console.log('❌ No session found');
      return NextResponse.json({ error: 'Unauthorized - no valid session found' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const roleId = (session.user as any).directus_role_id;
    const email = session.user.email;
    
    console.log('🔍 Processing lore submission:', {
      email,
      userId,
      roleId,
      expectedRoleId: process.env.NEXT_PUBLIC_ROLE_LORE_CREATOR_ID
    });

    // Verify user has the correct role
    if (roleId !== process.env.NEXT_PUBLIC_ROLE_LORE_CREATOR_ID) {
      console.log('❌ Insufficient permissions');
      return NextResponse.json({ 
        error: 'Insufficient permissions. Lore Creator role required.'
      }, { status: 403 });
    }

    // Parse form data
    const formData = await request.formData();
    
    // Log all received form data for debugging
    console.log('📝 Received form data:');
    for (let [key, value] of formData.entries()) {
      if (key === 'token_image') {
        console.log(key, value instanceof File ? `File: ${value.name} (${value.size} bytes)` : value);
      } else {
        console.log(key, value);
      }
    }
    
    // Extract and validate form fields
    const token = formData.get('token') as string;
    const token_symbol = formData.get('token_symbol') as string;
    const token_address = formData.get('token_address') as string;
    const relationship_to_token = formData.get('relationship_to_token') as string;
    const description_about_token = formData.get('description_about_token') as string;
    const lore_content = formData.get('lore_content') as string;
    const emailField = formData.get('email') as string;
    const is_fasttrack = formData.get('is_fasttrack') === 'true';

    // 🔍 DEBUG: Log extracted form fields
    console.log('🔍 DEBUG: Extracted form fields:', {
      token,
      token_symbol,
      token_address,
      relationship_to_token,
      description_about_token: description_about_token?.substring(0, 50) + '...',
      lore_content: lore_content?.substring(0, 50) + '...',
      emailField,
      is_fasttrack,
      telegram_handle: formData.get('telegram_handle'),
      x_url: formData.get('x_url'),
      dexscreener_url: formData.get('dexscreener_url')
    });

    // Validate required fields
    if (!token || !token_symbol || !token_address || !relationship_to_token || !description_about_token || !lore_content || !emailField) {
      console.log('❌ Missing required fields:', {
        token: !!token,
        token_symbol: !!token_symbol,
        token_address: !!token_address,
        relationship_to_token: !!relationship_to_token,
        description_about_token: !!description_about_token,
        lore_content: !!lore_content,
        emailField: !!emailField
      });
      
      return NextResponse.json({ 
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // 🚨 VALIDATION: Check if token already exists
    const tokenExists = await checkTokenExists(token);
    if (tokenExists) {
      return NextResponse.json({
        error: 'Token already exists',
        message: `A token with the name "${token}" already exists in our database. Please choose a different name.`,
        field: 'token'
      }, { status: 409 }); // 409 Conflict
    }

    // 🚨 VALIDATION: Check if there's already a pending submission
    const hasPendingSubmission = await checkPendingSubmission(token);
    if (hasPendingSubmission) {
      return NextResponse.json({
        error: 'Pending submission exists',
        message: `A submission for token "${token}" is already pending review. Please wait for the current submission to be processed.`,
        field: 'token'
      }, { status: 409 }); // 409 Conflict
    }

    // Handle image upload if present
    const imageFile = formData.get('token_image') as File;
    let imageId = null;

    if (imageFile && imageFile.size > 0) {
      console.log('🔍 Processing image upload');
      
      const imageFormData = new FormData();
      imageFormData.append('file', imageFile);
      imageFormData.append('title', `${token} Logo`);
      
      try {
        const imageResponse = await fetch(`${process.env.NEXT_PUBLIC_DIRECTUS_URL}/files`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.DIRECTUS_ADMIN_TOKEN}`,
          },
          body: imageFormData,
        });

        if (imageResponse.ok) {
          const imageResult = await imageResponse.json();
          imageId = imageResult.data.id;
          console.log('✅ Image uploaded successfully:', imageId);
        }
      } catch (imageError) {
        console.log('⚠️ Image upload failed:', imageError);
      }
    }

    // Prepare submission data for new clean lore_submissions collection
    const submissionData = {
      name: token, // Form 'token' → Database 'name'
      symbol: token_symbol, // Form 'token_symbol' → Database 'symbol'
      token_address, // Same field name
      relationship_to_token, // Same field name
      description: description_about_token, // Form 'description_about_token' → Database 'description'
      lore_content, // Same field name
      telegram_handle: formData.get('telegram_handle') as string || null, // Same field name
      email_address: emailField, // Form 'email' → Database 'email_address'
      twitter_url: formData.get('x_url') as string || null, // Form 'x_url' → Database 'twitter_url'
      dexscreener_url: formData.get('dexscreener_url') as string || null, // Same field name
      submitted_by: userId,
      is_fasttrack, // Form 'is_fasttrack' → Database 'is_fasttrack' (same field name)
      published: false, // Set to false initially - admin will set to true to trigger flow
      ...(imageId && {
        token_image: imageId, // Store UUID for Directus file reference
        image_url: `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/assets/${imageId}` // Store proper Directus asset URL
      }),
      ...(formData.get('fasttrack_payment_id') && { fasttrack_payment_id: formData.get('fasttrack_payment_id') as string }),
    };

    console.log('🔍 DEBUG: Final submission data:', {
      ...submissionData,
      lore_content: `${lore_content?.substring(0, 50)}...`
    });

    console.log('🔍 DEBUG: API endpoint:', `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/items/lore_submissions`);
    console.log('🔍 DEBUG: Admin token exists:', !!process.env.DIRECTUS_ADMIN_TOKEN);

    // Create lore submission ONLY (no meme_token creation)
    const response = await fetch(`${process.env.NEXT_PUBLIC_DIRECTUS_URL}/items/lore_submissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DIRECTUS_ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submissionData),
    });

    console.log('🔍 DEBUG: Response status:', response.status);
    console.log('🔍 DEBUG: Response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ DEBUG: Lore submission failed:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText
      });
      
      return NextResponse.json({
        error: `Submission failed: ${response.status}`,
        details: errorText,
        submissionData: submissionData // Include for debugging
      }, { status: response.status });
    }

    const result = await response.json();
    console.log('✅ Lore submission created successfully:', result.data.id);

    return NextResponse.json({ 
      success: true, 
      id: result.data.id,
      message: 'Lore submission created successfully and is pending review.',
      status: 'pending'
    });

  } catch (error) {
    console.error('❌ Error in lore submission API:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to create lore submission'
    }, { status: 500 });
  }
}
