import { useState, useEffect } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { PreviewControls } from '@/components/preview/PreviewControls'

interface PrototypePreviewProps {
  prototypeId: string
  className?: string
}

export function PrototypePreview({ prototypeId, className = '' }: PrototypePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [filesUrl, setFilesUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const supabase = useSupabaseClient()
  const { toast } = useToast()

  const loadPreview = async (showToast = false) => {
    try {
      setIsRefreshing(true)
      
      // Get prototype data including file_path
      const { data: prototypeData, error: prototypeError } = await supabase
        .from('prototypes')
        .select('preview_url, files_url, file_path')
        .eq('id', prototypeId)
        .single()

      if (prototypeError) {
        console.error('Failed to load prototype:', prototypeError)
        throw prototypeError
      }

      if (prototypeData) {
        // Set preview URL
        setPreviewUrl(prototypeData.preview_url)
        
        // Get download URL if file_path exists
        if (prototypeData.file_path) {
          const { data: { publicUrl } } = await supabase
            .storage
            .from('prototype-uploads')
            .getPublicUrl(prototypeData.file_path)
          
          setFilesUrl(publicUrl)
        } else {
          setFilesUrl(null)
        }

        if (showToast) {
          toast({
            title: 'Preview Updated',
            description: 'The preview has been refreshed with the latest changes.',
          })
        }
      }
    } catch (error) {
      console.error('Preview error:', error)
      toast({
        title: 'Preview Error',
        description: 'Failed to load preview. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleDownload = async () => {
    if (!filesUrl) {
      toast({
        title: 'Download Error',
        description: 'No files available for download.',
        variant: 'destructive',
      })
      return
    }

    try {
      window.open(filesUrl, '_blank')
      toast({
        title: 'Download Started',
        description: 'Your files will download in a new tab.',
      })
    } catch (error) {
      console.error('Download error:', error)
      toast({
        title: 'Download Error',
        description: 'Failed to download files. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleShare = async () => {
    try {
      const shareUrl = window.location.href
      await navigator.clipboard.writeText(shareUrl)
      toast({
        title: 'Link Copied!',
        description: 'Prototype link has been copied to clipboard.',
      })
    } catch (error) {
      console.error('Share error:', error)
      toast({
        title: 'Share Error',
        description: 'Failed to copy link. Please try manually copying the URL.',
        variant: 'destructive',
      })
    }
  }

  useEffect(() => {
    loadPreview()
  }, [prototypeId])

  if (isLoading) {
    return <Skeleton className={`w-full h-[600px] ${className}`} />
  }

  return (
    <div className={`relative ${className}`}>
      <div className="absolute top-4 right-4 z-10">
        <PreviewControls
          viewMode="preview"
          onViewModeChange={() => {}}
          isFeedbackMode={false}
          onToggleFeedbackMode={() => {}}
          filesUrl={filesUrl || undefined}
          onDownload={handleDownload}
          onShare={handleShare}
        />
      </div>
      
      {previewUrl ? (
        <iframe
          src={previewUrl}
          className="w-full h-[600px] border rounded-lg"
          sandbox="allow-scripts allow-same-origin"
          allow="accelerometer; camera; encrypted-media; display-capture; geolocation; gyroscope; microphone; midi; payment; web-share"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-[600px] flex items-center justify-center border rounded-lg bg-muted">
          <p className="text-muted-foreground">No preview available</p>
        </div>
      )}
    </div>
  )
}
