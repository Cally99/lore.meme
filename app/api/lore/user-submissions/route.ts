// @ts-ignore
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '../../auth/[...nextauth]/route'

export async function GET(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authConfig)
    
    // @ts-ignore
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized - no valid session found' }, { status: 401 })
    }

    // @ts-ignore
    const userId = (session.user as any).id
    // @ts-ignore
    const email = session.user.email
    
    console.log('🔍 Fetching user submissions for:', { email, userId })

    // Fetch user's lore submissions from Directus
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/items/lore_submissions?filter[submitted_by][_eq]=${userId}&sort=-date_created&fields=id,token,token_symbol,status,date_created,is_fasttrack`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.DIRECTUS_ADMIN_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      console.error('❌ Failed to fetch user submissions:', response.status)
      return NextResponse.json({ 
        error: 'Failed to fetch submissions' 
      }, { status: response.status })
    }

    const data = await response.json()
    const submissions = data.data || []
    
    console.log('✅ Found submissions:', submissions.length)

    return NextResponse.json({ 
      success: true, 
      submissions: submissions.map((submission: any) => ({
        id: submission.id,
        token: submission.token,
        token_symbol: submission.token_symbol,
        status: submission.status,
        date_created: submission.date_created,
        is_fasttrack: submission.is_fasttrack
      }))
    })

  } catch (error) {
    console.error('❌ Error fetching user submissions:', error)
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to fetch user submissions'
    }, { status: 500 })
  }
}