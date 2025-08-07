"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, BookOpen, Mail, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export default function Contact() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // After mounting, we can access the theme
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-black text-slate-900 dark:text-slate-100">      <section className="container mx-auto px-4 py-20 flex flex-col items-center text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-10 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-300">
          Contact Us
        </h1>
        <div className="w-full max-w-2xl relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-blue-100 dark:border-gray-700 rounded-xl p-12 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-blue-300/10 dark:from-blue-500/5 dark:to-blue-300/5 rounded-xl blur-md -z-10"></div>
          <div className="flex flex-col items-center gap-6">
            <Mail className="h-16 w-16 text-blue-600 dark:text-blue-400" />
            <p className="text-xl text-slate-700 dark:text-slate-300">For any inquiries, please reach out to us at:</p>
            <a
              href="mailto:contact@lore.meme"
              className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-300 hover:from-blue-700 hover:to-blue-500 dark:hover:from-blue-500 dark:hover:to-blue-400 transition-all"
            >
              contact@lore.meme
            </a>
            <p className="text-slate-600 dark:text-slate-400 mt-6">We'll get back to you as soon as possible.</p>
          </div>
        </div>
        <Link href="/" className="mt-12">
          <Button
            variant="outline"
            className="border-blue-500 text-blue-500 hover:bg-blue-500/10 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-400/10"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back to Home
          </Button>
        </Link>
      </section>
    </div>
  )
}
