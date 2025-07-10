'use client'

import React, { useState, useCallback } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ImageUploadProps {
  onImageUpload: (file: File | null) => void
  maxSizeInMB?: number
  acceptedFormats?: string[]
}

export function ImageUpload({ 
  onImageUpload, 
  maxSizeInMB = 5,
  acceptedFormats = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
}: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string>('')

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]
    setError('')

    // Validate file type
    if (!acceptedFormats.includes(file.type)) {
      setError(`Please upload a valid image file (${acceptedFormats.map(f => f.split('/')[1]).join(', ')})`)
      return
    }

    // Validate file size
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024
    if (file.size > maxSizeInBytes) {
      setError(`File size must be less than ${maxSizeInMB}MB`)
      return
    }

    // Create preview URL
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setUploadedImage(file)
    onImageUpload(file)
  }, [acceptedFormats, maxSizeInMB, onImageUpload])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
  }, [handleFiles])

  const removeImage = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    setUploadedImage(null)
    setError('')
    onImageUpload(null)
  }, [previewUrl, onImageUpload])

  return (
    <div className="space-y-4">
      {!uploadedImage ? (
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-400 bg-blue-400/10'
              : 'border-gray-600 hover:border-gray-500'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="file-upload"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            accept={acceptedFormats.join(',')}
            onChange={handleFileInput}
          />
          
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
              <Upload className="w-6 h-6 text-blue-400" />
            </div>
            
            <div>
              <p className="text-white font-medium mb-1">
                Click or drag to upload image
              </p>
              <p className="text-gray-400 text-sm">
                PNG, JPG, GIF up to {maxSizeInMB}MB
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Token preview"
                    className="w-20 h-20 object-cover rounded-lg border border-gray-600"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gray-700 rounded-lg flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">
                  {uploadedImage.name}
                </p>
                <p className="text-gray-400 text-sm">
                  {(uploadedImage.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <p className="text-green-400 text-sm mt-1">
                  ✓ Ready to upload
                </p>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={removeImage}
                className="text-gray-400 hover:text-red-400 hover:bg-red-400/10"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-500 p-3 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  )
}
