//app/submit-lore/thank-you/page.tsx
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, BookOpen, CheckCircle, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export default function ThankYou() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // After mounting, we can access the theme
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-black text-slate-900 dark:text-slate-100">
      {/* Thank You Section */}
      <section className="container mx-auto px-4 py-20 flex flex-col items-center text-center">
        <div className="w-full max-w-2xl relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-blue-100 dark:border-gray-700 rounded-xl p-12 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-blue-300/10 dark:from-blue-500/5 dark:to-blue-300/5 rounded-xl blur-md -z-10"></div>
          <div className="flex flex-col items-center gap-6">
            <CheckCircle className="h-20 w-20 text-green-500 dark:text-green-400" />
            <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-300">
              Thank You for Your Submission
            </h1>
            <p className="text-xl text-slate-700 dark:text-slate-300 mb-4">Please allow up to 24 hours for approval.</p>
            <p className="text-slate-600 dark:text-slate-400">
              If you want to fast track your submission please email{" "}
              <a href="mailto:contact@lore.meme" className="text-blue-500 hover:underline">
                contact@lore.meme
              </a>{" "}
              from the email you have submitted.
            </p>
            <Link href="/" className="mt-8">
              <Button
                variant="outline"
                className="border-blue-500 text-blue-500 hover:bg-blue-500/10 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-400/10"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
