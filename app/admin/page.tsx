"use client"

import type React from "react"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CheckCircle,
  Edit,
  Eye,
  Filter,
  LogOut,
  Search,
  Shield,
  Star,
  Trash2,
  XCircle,
  BookOpen,
  Settings,
  Bug,
  AlertTriangle,
} from "lucide-react"
import { getTokens, updateTokenStatus, updateTokenFeatured, deleteToken } from "../actions/token-actions"
import type { Token } from "@/types/database"
import { formatDistanceToNow } from "date-fns"
import TokenDetailModal from "./token-detail-modal"
import EditTokenModal from "./edit-token-modal"
import ThemeToggle from "@/components/theme-toggle"
import EnvCheck from "./env-check"

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(true)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [pendingTokens, setPendingTokens] = useState<Token[]>([])
  const [approvedTokens, setApprovedTokens] = useState<Token[]>([])
  const [rejectedTokens, setRejectedTokens] = useState<Token[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [selectedToken, setSelectedToken] = useState<Token | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("pending")
  const [showEnvCheck, setShowEnvCheck] = useState(false)

  // Debug state
  const [showDebug, setShowDebug] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [debugLoading, setDebugLoading] = useState(false)

  // Check if user is already authenticated
  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch("/api/auth/verify-admin")
        const data = await response.json()

        if (data.authenticated) {
          setIsAuthenticated(true)
          setCurrentUser(data.username)
        }
      } catch (error) {
        console.error("Auth check error:", error)
      } finally {
        setIsAuthenticating(false)
      }
    }

    checkAuth()
  }, [])

  // Load tokens when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadTokens()
    }
  }, [isAuthenticated])

  const loadTokens = async () => {
    setIsLoading(true)
    try {
      const pendingData = await getTokens({ status: "pending" })
      const approvedData = await getTokens({ status: "approved" })
      const rejectedData = await getTokens({ status: "rejected" })

      setPendingTokens(pendingData)
      setApprovedTokens(approvedData)
      setRejectedTokens(rejectedData)
    } catch (error) {
      console.error("Error loading tokens:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const checkDebugInfo = async () => {
    setDebugLoading(true)
    try {
      console.log("Fetching debug info...")
      const response = await fetch("/api/debug/public-env-check", {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      console.log("Debug response status:", response.status)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("Debug data received:", data)
      setDebugInfo(data)
    } catch (error) {
      console.error("Error fetching debug info:", error)
      setDebugInfo({
        error: error instanceof Error ? error.message : String(error),
        message: "Failed to fetch debug information",
      })
    } finally {
      setDebugLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError("")

    try {
      console.log("Attempting login...")
      const response = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (data.success) {
        setIsAuthenticated(true)
        setCurrentUser(username)
      } else {
        setLoginError(data.message || "Invalid credentials")
      }
    } catch (error) {
      console.error("Login error:", error)
      setLoginError("An error occurred during login")
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/admin-logout", {
        method: "POST",
      })
      setIsAuthenticated(false)
      setCurrentUser(null)
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const handleApprove = async (id: string) => {
    const token = pendingTokens.find((t) => t.id === id)
    if (!token) return

    // Check if this is an update to an existing token
    const existingToken = approvedTokens.find(
      (t) => t.address.toLowerCase() === token.address.toLowerCase() && t.id !== token.id,
    )

    if (existingToken) {
      // This is an update to an existing token
      if (
        confirm(
          `This appears to be an update to an existing token (${existingToken.symbol}). Do you want to approve this update and replace the existing token?`,
        )
      ) {
        // First delete the existing token
        await deleteToken(existingToken.id)

        // Then approve the new one
        const result = await updateTokenStatus(id, "approved")
        if (result.success) {
          // Move token from pending to approved
          setPendingTokens((prev) => prev.filter((t) => t.id !== id))
          setApprovedTokens((prev) => [
            ...prev.filter((t) => t.id !== existingToken.id),
            { ...token, status: "approved" },
          ])
        } else {
          alert("Failed to approve token update")
        }
      }
    } else {
      // This is a new token
      const result = await updateTokenStatus(id, "approved")
      if (result.success) {
        // Move token from pending to approved
        setPendingTokens((prev) => prev.filter((t) => t.id !== id))
        setApprovedTokens((prev) => [...prev, { ...token, status: "approved" }])
      } else {
        alert("Failed to approve token")
      }
    }
  }

  const handleReject = async (id: string) => {
    const result = await updateTokenStatus(id, "rejected")
    if (result.success) {
      // Move token from pending to rejected
      const token = pendingTokens.find((t) => t.id === id)
      if (token) {
        setPendingTokens((prev) => prev.filter((t) => t.id !== id))
        setRejectedTokens((prev) => [...prev, { ...token, status: "rejected" }])
      }
    } else {
      alert("Failed to reject token")
    }
  }

  const handleToggleFeatured = async (id: string, featured: boolean) => {
    const result = await updateTokenFeatured(id, featured)
    if (result.success) {
      // Update featured status in the approved tokens list
      setApprovedTokens((prev) => prev.map((token) => (token.id === id ? { ...token, featured } : token)))
    } else {
      alert("Failed to update featured status")
    }
  }

  const handleDelete = async (id: string, status: "pending" | "approved" | "rejected") => {
    if (confirm("Are you sure you want to delete this token? This action cannot be undone.")) {
      const result = await deleteToken(id)
      if (result.success) {
        // Remove token from the appropriate list
        if (status === "pending") {
          setPendingTokens((prev) => prev.filter((t) => t.id !== id))
        } else if (status === "approved") {
          setApprovedTokens((prev) => prev.filter((t) => t.id !== id))
        } else if (status === "rejected") {
          setRejectedTokens((prev) => prev.filter((t) => t.id !== id))
        }
      } else {
        alert("Failed to delete token")
      }
    }
  }

  const handleViewToken = (token: Token) => {
    setSelectedToken(token)
    setIsViewModalOpen(true)
  }

  const handleEditToken = (token: Token) => {
    console.log("Editing token:", token.id, token.name) // Add debugging
    setSelectedToken(token)
    setIsEditModalOpen(true)
  }

  const handleTokenUpdated = (updatedToken: Token) => {
    // Update token in the appropriate list
    if (updatedToken.status === "pending") {
      setPendingTokens((prev) => prev.map((token) => (token.id === updatedToken.id ? updatedToken : token)))
    } else if (updatedToken.status === "approved") {
      setApprovedTokens((prev) => prev.map((token) => (token.id === updatedToken.id ? updatedToken : token)))
    } else if (updatedToken.status === "rejected") {
      setRejectedTokens((prev) => prev.map((token) => (token.id === updatedToken.id ? updatedToken : token)))
    }
  }

  // Filter tokens based on search query
  const filterTokens = (tokens: Token[]) => {
    if (!searchQuery) return tokens

    return tokens.filter(
      (token) =>
        token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        token.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (token.email && token.email.toLowerCase().includes(searchQuery.toLowerCase())),
    )
  }

  const filteredPendingTokens = filterTokens(pendingTokens)
  const filteredApprovedTokens = filterTokens(approvedTokens)
  const filteredRejectedTokens = filterTokens(rejectedTokens)

  // Show loading state while checking authentication
  if (isAuthenticating) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-black text-slate-900 dark:text-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-black text-slate-900 dark:text-slate-100 flex items-center justify-center">
        <div className="w-full max-w-md p-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-blue-100 dark:border-gray-700 rounded-xl shadow-sm">
          <div className="flex justify-center mb-6">
            <Shield className="h-12 w-12 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold mb-6 text-center">Admin Login</h1>

          {/* Environment Status Warning */}
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="font-medium text-amber-700 dark:text-amber-300">Environment Check</span>
            </div>
            <p className="text-sm text-amber-600 dark:text-amber-400 mb-3">
              Your environment variables may not be loaded properly. Click below to check.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowDebug(!showDebug)
                if (!showDebug) {
                  checkDebugInfo()
                }
              }}
              disabled={debugLoading}
              className="w-full border-amber-300 text-amber-700 dark:text-amber-300"
            >
              <Bug className="mr-2 h-4 w-4" />
              {debugLoading ? "Checking..." : showDebug ? "Hide Debug Info" : "Check Environment Variables"}
            </Button>
          </div>

          <form onSubmit={handleLogin}>
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Username
                </label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full"
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full"
                  required
                />
              </div>
              {loginError && (
                <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 p-3 rounded-md text-sm">
                  {loginError}
                </div>
              )}

              {showDebug && (
                <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-md">
                  <h3 className="font-medium mb-3">Environment Variables Debug Info:</h3>

                  {debugInfo ? (
                    <div className="space-y-3">
                      {debugInfo.error ? (
                        <div className="text-red-600 dark:text-red-400">
                          <p className="font-medium">Error: {debugInfo.error}</p>
                        </div>
                      ) : (
                        <>
                          <div className="text-xs">
                            <p>
                              <strong>Platform:</strong> {debugInfo.platform}
                            </p>
                            <p>
                              <strong>Environment:</strong> {debugInfo.nodeEnv}
                            </p>
                            <p>
                              <strong>Vercel Env:</strong> {debugInfo.vercelEnv}
                            </p>
                            <p>
                              <strong>Timestamp:</strong> {debugInfo.timestamp}
                            </p>
                          </div>

                          <div className="space-y-2">
                            <h4 className="font-medium text-sm">Environment Variables:</h4>
                            {Object.entries(debugInfo.envStatus || {}).map(([key, info]: [string, any]) => (
                              <div key={key} className="flex justify-between items-center text-xs">
                                <span className="font-mono">{key}:</span>
                                <span
                                  className={
                                    info.exists
                                      ? "text-green-600 dark:text-green-400"
                                      : "text-red-600 dark:text-red-400"
                                  }
                                >
                                  {info.exists ? `✅ ${info.value} (${info.length} chars)` : "❌ Missing"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Click "Check Environment Variables" to load debug info.</p>
                  )}

                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
                    <p className="font-medium mb-1">If variables are missing:</p>
                    <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400">
                      <li>Go to Vercel Dashboard → Your Project → Settings → Environment Variables</li>
                      <li>Add all missing variables for Production, Preview, and Development</li>
                      <li>Redeploy your site</li>
                      <li>Wait a few minutes and try again</li>
                    </ol>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 dark:from-blue-500 dark:to-blue-400 dark:hover:from-blue-600 dark:hover:to-blue-500"
              >
                Login
              </Button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-black text-slate-900 dark:text-slate-100">
      {/* Header */}
      <header className="container mx-auto py-6 px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-300">
            Lore.meme
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="font-medium">Admin Panel</span>
            {currentUser && <span className="text-sm text-slate-500 dark:text-slate-400 ml-2">({currentUser})</span>}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowEnvCheck(!showEnvCheck)}
            className="rounded-full"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-full" aria-label="Logout">
            <LogOut className="h-5 w-5" />
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {/* Admin Content */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-300">
            Token Management
          </h1>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search submissions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {showEnvCheck && <EnvCheck />}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <div className="relative">
                <Filter className="h-4 w-4" />
                {pendingTokens.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {pendingTokens.length}
                  </span>
                )}
              </div>
              Pending
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Approved
            </TabsTrigger>
            <TabsTrigger value="rejected" className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Rejected
            </TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
            </div>
          ) : (
            <>
              <TabsContent value="pending">{renderTokenTable(filteredPendingTokens, "pending")}</TabsContent>
              <TabsContent value="approved">{renderTokenTable(filteredApprovedTokens, "approved")}</TabsContent>
              <TabsContent value="rejected">{renderTokenTable(filteredRejectedTokens, "rejected")}</TabsContent>
            </>
          )}
        </Tabs>
      </section>

      {/* Footer */}
      <footer className="border-t border-blue-100 dark:border-gray-800 py-12 mt-auto">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <Link href="/" className="flex items-center gap-2 mb-6 md:mb-0">
              <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-300">
                Lore.meme
              </span>
            </Link>
            <div className="text-slate-500 text-sm">Admin Panel • © {new Date().getFullYear()} Lore.meme</div>
          </div>
        </div>
      </footer>

      {/* View Token Modal */}
      {selectedToken && (
        <TokenDetailModal token={selectedToken} isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} />
      )}

      {/* Edit Token Modal */}
      {selectedToken && (
        <EditTokenModal
          key={selectedToken.id} // Add key prop to force re-render
          token={selectedToken}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onTokenUpdated={handleTokenUpdated}
        />
      )}
    </div>
  )

  function renderTokenTable(tokens: Token[], status: "pending" | "approved" | "rejected") {
    if (tokens.length === 0) {
      return (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-blue-100 dark:border-gray-700 rounded-xl p-8 text-center">
          <p className="text-slate-600 dark:text-slate-400">No {status} tokens found.</p>
        </div>
      )
    }

    return (
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-blue-100 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Token
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Contact
                </th>
                {status === "approved" && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    Featured
                  </th>
                )}
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-gray-700">
              {tokens.map((token) => (
                <tr key={token.id} className="hover:bg-slate-50 dark:hover:bg-gray-750">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-slate-900 dark:text-slate-100">{token.symbol}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">{token.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-mono text-slate-500 dark:text-slate-400">
                      {token.address.substring(0, 10)}...
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {formatDistanceToNow(new Date(token.created_at), { addSuffix: true })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900 dark:text-slate-100">{token.email}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">{token.telegram}</div>
                  </td>
                  {status === "approved" && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`${
                          token.featured
                            ? "text-yellow-500 hover:text-yellow-600"
                            : "text-slate-400 hover:text-yellow-500"
                        }`}
                        onClick={() => handleToggleFeatured(token.id, !token.featured)}
                      >
                        <Star className={`h-5 w-5 ${token.featured ? "fill-yellow-500" : ""}`} />
                      </Button>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                        onClick={() => handleViewToken(token)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                        onClick={() => {
                          console.log("Edit clicked for token:", token.id, token.name) // Add debugging
                          handleEditToken(token)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {status === "pending" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                            onClick={() => handleApprove(token.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                            onClick={() => handleReject(token.id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                        onClick={() => handleDelete(token.id, status)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }
}
