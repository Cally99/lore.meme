"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { useAuthModal } from "@/providers/AuthModalProvider"
import { Button } from "@/components/ui/button"
import { ArrowLeft, BookOpen, LockKeyhole, CheckCircle, AlertTriangle, User } from "lucide-react"
import Link from "next/link"

export default function VerifyTokenPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const { openModal } = useAuthModal()
  
  const [verificationStatus, setVerificationStatus] = useState<'checking' | 'verified' | 'not-verified' | 'error'>('checking')
  const [userSubmissions, setUserSubmissions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Check authentication and user submissions
  useEffect(() => {
    const checkUserVerification = async () => {
      if (status === 'loading') return
      
      if (status === 'unauthenticated') {
        setVerificationStatus('not-verified')
        setIsLoading(false)
        return
      }

      if (status === 'authenticated' && session?.user) {
        try {
          // Check if user has any lore submissions they can edit
          const response = await fetch('/api/lore/user-submissions', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          })

          if (response.ok) {
            const data = await response.json()
            setUserSubmissions(data.submissions || [])
            setVerificationStatus('verified')
          } else {
            setVerificationStatus('error')
          }
        } catch (error) {
          console.error('Error checking user submissions:', error)
          setVerificationStatus('error')
        }
      }
      
      setIsLoading(false)
    }

    checkUserVerification()
  }, [status, session])

  // Auto-open modal if not authenticated
  useEffect(() => {
    if (verificationStatus === 'not-verified' && !isLoading) {
      openModal()
    }
  }, [verificationStatus, isLoading, openModal])

  const handleSignIn = () => {
    openModal()
  }

  const handleEditSubmission = (submissionId: string) => {
    router.push(`/submit-lore?edit=${submissionId}`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-black text-slate-900 dark:text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Verifying authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-black text-slate-900 dark:text-slate-100">
      {/* Header */}
      <header className="container mx-auto py-6 px-4 flex items-center justify-center">
        <Link href="/" className="flex items-center gap-2">
          <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-300">
            Lore.meme
          </span>
        </Link>
      </header>

      {/* Main Content */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-blue-100 dark:border-gray-700 rounded-xl p-8 shadow-sm">
            
            {/* Not Authenticated State */}
            {verificationStatus === 'not-verified' && (
              <>
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500/20 to-blue-300/20 dark:from-blue-500/10 dark:to-blue-300/10 flex items-center justify-center">
                    <LockKeyhole className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>

                <h1 className="text-2xl font-bold mb-4 text-center">Verify Token Ownership</h1>
                <p className="text-slate-600 dark:text-slate-400 mb-6 text-center">
                  Sign in to verify your identity and update your submitted lore
                </p>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">What verification allows:</h3>
                  <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                    <li>• Update your submitted token lore</li>
                    <li>• Edit token descriptions and stories</li>
                    <li>• Modify contact information</li>
                    <li>• Update social media links</li>
                  </ul>
                </div>

                <div className="text-center space-y-4">
                  <Button
                    onClick={handleSignIn}
                    className="bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 dark:from-blue-500 dark:to-blue-400 dark:hover:from-blue-600 dark:hover:to-blue-500 px-8 py-3"
                  >
                    Sign In to Verify
                  </Button>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                          Having trouble logging in?
                        </p>
                        <p className="text-yellow-700 dark:text-yellow-400">
                          If you can't access your account or need help with token ownership verification,
                          please contact our support team at{' '}
                          <a
                            href="mailto:support@lore.meme"
                            className="font-medium underline hover:no-underline"
                          >
                            support@lore.meme
                          </a>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Authenticated and Verified State */}
            {verificationStatus === 'verified' && (
              <>
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-green-500/20 to-green-300/20 dark:from-green-500/10 dark:to-green-300/10 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                </div>

                <h1 className="text-2xl font-bold mb-4 text-center">Verification Successful</h1>
                <div className="flex items-center justify-center gap-2 mb-6">
                  <User className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  <p className="text-slate-600 dark:text-slate-400">
                    Welcome back, {session?.user?.email}
                  </p>
                </div>

                {userSubmissions.length > 0 ? (
                  <>
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4 mb-6">
                      <p className="text-green-800 dark:text-green-300 font-medium">
                        ✓ You are verified and can edit your lore submissions
                      </p>
                    </div>

                    <h3 className="font-semibold mb-4">Your Lore Submissions:</h3>
                    <div className="space-y-3 mb-6">
                      {userSubmissions.map((submission) => (
                        <div
                          key={submission.id}
                          className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                        >
                          <div>
                            <h4 className="font-medium">{submission.token}</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              Status: <span className="capitalize">{submission.status}</span>
                            </p>
                          </div>
                          <Button
                            onClick={() => handleEditSubmission(submission.id)}
                            variant="outline"
                            size="sm"
                            className="border-blue-500 text-blue-500 hover:bg-blue-500/10 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-400/10"
                          >
                            Edit
                          </Button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 mb-6 text-center">
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                      You don't have any lore submissions yet.
                    </p>
                    <Button
                      onClick={() => router.push('/submit-lore')}
                      className="bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 dark:from-blue-500 dark:to-blue-400 dark:hover:from-blue-600 dark:hover:to-blue-500"
                    >
                      Submit Your First Lore
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Error State */}
            {verificationStatus === 'error' && (
              <>
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-red-500/20 to-red-300/20 dark:from-red-500/10 dark:to-red-300/10 flex items-center justify-center">
                    <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
                  </div>
                </div>

                <h1 className="text-2xl font-bold mb-4 text-center">Verification Error</h1>
                <p className="text-slate-600 dark:text-slate-400 mb-6 text-center">
                  We encountered an error while verifying your account. Please try again or contact support.
                </p>

                <div className="text-center space-y-4">
                  <Button
                    onClick={() => window.location.reload()}
                    variant="outline"
                    className="border-blue-500 text-blue-500 hover:bg-blue-500/10 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-400/10"
                  >
                    Try Again
                  </Button>

                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
                    <p className="text-sm text-red-800 dark:text-red-300">
                      If this problem persists, please contact{' '}
                      <a
                        href="mailto:support@lore.meme"
                        className="font-medium underline hover:no-underline"
                      >
                        support@lore.meme
                      </a>
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Back Button */}
            <div className="flex justify-center pt-6 border-t border-slate-200 dark:border-slate-700">
              <Link href="/">
                <Button
                  variant="outline"
                  className="border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
