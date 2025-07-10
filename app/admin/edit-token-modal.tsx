"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import type { Token } from "@/types/database"
import { updateToken } from "../actions/token-actions"

interface EditTokenModalProps {
  token: Token
  isOpen: boolean
  onClose: () => void
  onTokenUpdated: (token: Token) => void
}

export default function EditTokenModal({ token, isOpen, onClose, onTokenUpdated }: EditTokenModalProps) {
  const [formData, setFormData] = useState({
    name: token.name,
    symbol: token.symbol,
    address: token.address,
    description: token.description,
    story: token.story,
    image_url: token.image_url,
    twitter: token.twitter || "",
    telegram: token.telegram || "",
    dexscreener: token.dexscreener || "",
    featured: token.featured,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, featured: checked }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const result = await updateToken(token.id, formData)

      if (result.success) {
        // Update the token in the parent component
        onTokenUpdated({
          ...token,
          ...formData,
        })
        onClose()
      } else {
        alert("Failed to update token")
      }
    } catch (error) {
      console.error("Error updating token:", error)
      alert("An error occurred while updating the token")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Token</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Token Name</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="symbol">Token Symbol</Label>
              <Input id="symbol" name="symbol" value={formData.symbol} onChange={handleInputChange} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Token Address</Label>
            <Input id="address" name="address" value={formData.address} onChange={handleInputChange} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image_url">Image URL</Label>
            <Input id="image_url" name="image_url" value={formData.image_url} onChange={handleInputChange} />
            {formData.image_url && (
              <div className="mt-2 flex justify-center">
                <img
                  src={formData.image_url || "/placeholder.svg"}
                  alt="Token preview"
                  className="h-16 w-16 rounded-full object-cover"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="story">Story</Label>
            <Textarea id="story" name="story" value={formData.story} onChange={handleInputChange} required rows={8} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="twitter">Twitter URL</Label>
              <Input
                id="twitter"
                name="twitter"
                value={formData.twitter}
                onChange={handleInputChange}
                placeholder="https://twitter.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telegram">Telegram</Label>
              <Input
                id="telegram"
                name="telegram"
                value={formData.telegram}
                onChange={handleInputChange}
                placeholder="@username"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dexscreener">Dexscreener URL</Label>
            <Input
              id="dexscreener"
              name="dexscreener"
              value={formData.dexscreener}
              onChange={handleInputChange}
              placeholder="https://dexscreener.com/..."
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="featured" checked={formData.featured} onCheckedChange={handleSwitchChange} />
            <Label htmlFor="featured">Featured Token</Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
