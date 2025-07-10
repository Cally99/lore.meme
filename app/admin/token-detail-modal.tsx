"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Token } from "@/types/database"
import { Calendar, ExternalLink, Mail, MessageSquare } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface TokenDetailModalProps {
  token: Token
  isOpen: boolean
  onClose: () => void
}

export default function TokenDetailModal({ token, isOpen, onClose }: TokenDetailModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500/20 to-blue-300/20 dark:from-blue-500/10 dark:to-blue-300/10 flex items-center justify-center">
              <img
                src={token.image_url || "/placeholder.svg?height=32&width=32"}
                alt={token.name}
                className="w-6 h-6 rounded-full"
              />
            </div>
            {token.symbol} - {token.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Token Info */}
          <div className="bg-slate-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Token Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Address</p>
                <p className="font-mono text-sm break-all">{token.address}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Status</p>
                <p className="capitalize">{token.status}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Featured</p>
                <p>{token.featured ? "Yes" : "No"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Good Lores</p>
                <p>{token.good_lores}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="font-medium mb-2">Description</h3>
            <p className="text-slate-700 dark:text-slate-300">{token.description}</p>
          </div>

          {/* Story */}
          <div>
            <h3 className="font-medium mb-2">Story</h3>
            <div className="bg-slate-50 dark:bg-gray-800 p-4 rounded-lg max-h-60 overflow-y-auto">
              {token.story.split("\n\n").map((paragraph, index) => (
                <p key={index} className="mb-4 text-sm text-slate-700 dark:text-slate-300">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-slate-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Contact Information</h3>
            <div className="space-y-2">
              {token.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-500" />
                  <span>{token.email}</span>
                </div>
              )}
              {token.telegram && (
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-slate-500" />
                  <span>{token.telegram}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-500" />
                <span>Submitted {formatDistanceToNow(new Date(token.created_at), { addSuffix: true })}</span>
              </div>
            </div>
          </div>

          {/* External Links */}
          <div>
            <h3 className="font-medium mb-2">External Links</h3>
            <div className="flex flex-wrap gap-2">
              {token.twitter && (
                <a
                  href={token.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 rounded-full text-sm"
                >
                  Twitter <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              )}
              {token.dexscreener && (
                <a
                  href={token.dexscreener}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 rounded-full text-sm"
                >
                  Dexscreener <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              )}
            </div>
          </div>

          {/* View on Site */}
          {token.status === "approved" && (
            <div className="flex justify-center mt-4">
              <a
                href={`/token/${encodeURIComponent(token.symbol)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md"
              >
                View on Site <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
