"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"

interface SearchFormProps {
  className?: string
  placeholder?: string
  buttonText?: string
}

export default function SearchForm({
  className = "",
  placeholder = "Search by token address or name...",
  buttonText = "Search",
}: SearchFormProps) {
  const [query, setQuery] = useState("")
  const router = useRouter()

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="flex">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full px-6 py-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-blue-100 dark:border-gray-700 rounded-l-xl focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 text-slate-800 dark:text-slate-200"
          aria-label="Search for a token"
        />
        <button
          type="submit"
          className="bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 dark:from-blue-500 dark:to-blue-400 dark:hover:from-blue-600 dark:hover:to-blue-500 px-6 py-4 rounded-r-xl text-white font-medium"
          aria-label="Search"
        >
          {buttonText}
        </button>
      </div>
    </form>
  )
}
