"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle } from "lucide-react"

export default function EnvCheck() {
  const [envStatus, setEnvStatus] = useState<Record<string, boolean> | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkEnv = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/debug/env-check")

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setEnvStatus(data.envStatus)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">Environment Variables Check</h2>
        <Button variant="outline" size="sm" onClick={checkEnv} disabled={isLoading}>
          {isLoading ? "Checking..." : "Check Environment"}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {envStatus && (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-blue-100 dark:border-gray-700 rounded-xl p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(envStatus).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                {value ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <span className={value ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
                  {key}: {value ? "Available" : "Missing"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
