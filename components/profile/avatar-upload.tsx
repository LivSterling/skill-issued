  "use client"

import { useState, useRef, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { avatarFileSchema } from '@/lib/validations/profile-schemas'
import type { AvatarFileInput } from '@/lib/validations/profile-schemas'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  Loader2, 
  AlertTriangle, 
  CheckCircle,
  Camera,
  Trash2,
  RotateCcw
} from 'lucide-react'

interface AvatarUploadProps {
  currentAvatarUrl?: string | null
  onUploadComplete?: (url: string) => void
  onUploadError?: (error: string) => void
  onRemove?: () => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showRemoveButton?: boolean
}

interface UploadState {
  file: File | null
  preview: string | null
  uploading: boolean
  progress: number
  error: string | null
  success: boolean
}

const SIZE_CONFIG = {
  sm: { avatar: 'h-16 w-16', upload: 'h-16 w-16' },
  md: { avatar: 'h-24 w-24', upload: 'h-24 w-24' },
  lg: { avatar: 'h-32 w-32', upload: 'h-32 w-32' }
}

export function AvatarUpload({
  currentAvatarUrl,
  onUploadComplete,
  onUploadError,
  onRemove,
  className = "",
  size = 'md',
  showRemoveButton = true
}: AvatarUploadProps) {
  const { user, getInitials } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [uploadState, setUploadState] = useState<UploadState>({
    file: null,
    preview: null,
    uploading: false,
    progress: 0,
    error: null,
    success: false
  })

  const sizeClasses = SIZE_CONFIG[size]

  // Validate file
  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    try {
      const fileData: AvatarFileInput = {
        name: file.name,
        size: file.size,
        type: file.type
      }

      const validation = avatarFileSchema.safeParse(fileData)
      if (!validation.success) {
        const errors = validation.error.issues.map(issue => issue.message)
        return { valid: false, error: errors.join(', ') }
      }

      return { valid: true }
    } catch (error) {
      return { valid: false, error: 'Invalid file' }
    }
  }, [])

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    // Clear previous state
    setUploadState(prev => ({
      ...prev,
      error: null,
      success: false,
      preview: null,
      file: null
    }))

    // Validate file
    const validation = validateFile(file)
    if (!validation.valid) {
      setUploadState(prev => ({
        ...prev,
        error: validation.error || 'Invalid file'
      }))
      return
    }

    // Create preview
    const previewUrl = URL.createObjectURL(file)
    setUploadState(prev => ({
      ...prev,
      file,
      preview: previewUrl,
      error: null
    }))
  }, [validateFile])

  // Handle file input change
  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }, [handleFileSelect])

  // Handle drag and drop
  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }, [])

  // Generate unique filename
  const generateFilename = useCallback((file: File): string => {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2)
    const extension = file.name.split('.').pop()
    return `avatar_${user?.id}_${timestamp}_${random}.${extension}`
  }, [user?.id])

  // Upload file to Supabase Storage
  const uploadFile = useCallback(async () => {
    if (!uploadState.file || !user?.id) {
      setUploadState(prev => ({
        ...prev,
        error: 'No file selected or user not authenticated'
      }))
      return
    }

    setUploadState(prev => ({
      ...prev,
      uploading: true,
      progress: 0,
      error: null,
      success: false
    }))

    try {
      const filename = generateFilename(uploadState.file)
      const filePath = `${user.id}/${filename}`

      // Simulate upload progress
      setUploadState(prev => ({ ...prev, progress: 50 }))

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, uploadState.file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      if (!urlData.publicUrl) {
        throw new Error('Failed to get public URL')
      }

      // Update progress to 100%
      setUploadState(prev => ({
        ...prev,
        progress: 100,
        success: true,
        uploading: false
      }))

      // Call success callback
      onUploadComplete?.(urlData.publicUrl)

      // Clear the file after successful upload
      setTimeout(() => {
        setUploadState(prev => ({
          ...prev,
          file: null,
          preview: null,
          success: false
        }))
      }, 2000)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      setUploadState(prev => ({
        ...prev,
        error: errorMessage,
        uploading: false,
        progress: 0
      }))
      onUploadError?.(errorMessage)
    }
  }, [uploadState.file, user?.id, generateFilename, onUploadComplete, onUploadError])

  // Remove current avatar
  const handleRemove = useCallback(async () => {
    if (!currentAvatarUrl) return

    try {
      // Extract file path from URL for deletion
      const urlParts = currentAvatarUrl.split('/')
      const fileName = urlParts[urlParts.length - 1]
      const filePath = `${user?.id}/${fileName}`

      // Delete from storage
      const { error } = await supabase.storage
        .from('avatars')
        .remove([filePath])

      if (error) {
        console.warn('Failed to delete old avatar:', error.message)
      }

      onRemove?.()
    } catch (error) {
      console.warn('Failed to remove avatar:', error)
      onRemove?.()
    }
  }, [currentAvatarUrl, user?.id, onRemove])

  // Clear current selection
  const clearSelection = useCallback(() => {
    setUploadState({
      file: null,
      preview: null,
      uploading: false,
      progress: 0,
      error: null,
      success: false
    })
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const displayUrl = uploadState.preview || currentAvatarUrl
  const hasAvatar = !!displayUrl
  const isUploading = uploadState.uploading

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Profile Picture
        </CardTitle>
        <CardDescription>
          Upload a profile picture. Max size: 5MB
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Messages */}
        {uploadState.error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{uploadState.error}</AlertDescription>
          </Alert>
        )}

        {uploadState.success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>Avatar uploaded successfully!</AlertDescription>
          </Alert>
        )}

        <div className="flex items-start gap-6">
          {/* Avatar Preview */}
          <div className="flex flex-col items-center gap-3">
            <Avatar className={`${sizeClasses.avatar} border-2 border-dashed border-border`}>
              <AvatarImage src={displayUrl || ''} alt="Profile picture" />
              <AvatarFallback className="text-lg">
                {hasAvatar ? <ImageIcon className="h-8 w-8" /> : getInitials()}
              </AvatarFallback>
            </Avatar>
            
            {hasAvatar && showRemoveButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemove}
                className="flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" />
                Remove
              </Button>
            )}
          </div>

          {/* Upload Area */}
          <div className="flex-1 space-y-4">
            {/* File Selection */}
            <div
              className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleInputChange}
                className="hidden"
              />
              
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div className="text-sm">
                  <span className="font-medium">Click to upload</span> or drag and drop
                </div>
                <div className="text-xs text-muted-foreground">
                  JPEG, PNG, WebP up to 5MB
                </div>
              </div>
            </div>

            {/* File Info */}
            {uploadState.file && (
              <div className="bg-muted rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">{uploadState.file.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{formatFileSize(uploadState.file.size)}</span>
                  <Badge variant="outline" className="text-xs">
                    {uploadState.file.type.split('/')[1].toUpperCase()}
                  </Badge>
                </div>

                {/* Upload Progress */}
                {isUploading && (
                  <div className="space-y-2">
                    <Progress value={uploadState.progress} className="h-2" />
                    <div className="text-xs text-center text-muted-foreground">
                      Uploading... {uploadState.progress}%
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              {uploadState.file && !isUploading && (
                <Button
                  onClick={uploadFile}
                  disabled={!uploadState.file}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload Avatar
                </Button>
              )}

              {uploadState.file && (
                <Button
                  variant="outline"
                  onClick={clearSelection}
                  disabled={isUploading}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Choose Different
                </Button>
              )}

              {isUploading && (
                <Button disabled className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Upload Guidelines */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Use a clear, high-quality image for best results</p>
          <p>• Square images work best (1:1 aspect ratio)</p>
          <p>• Supported formats: JPEG, PNG, WebP</p>
          <p>• Maximum file size: 5MB</p>
        </div>
      </CardContent>
    </Card>
  )
}
