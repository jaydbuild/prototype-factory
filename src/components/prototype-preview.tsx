import { useState, useEffect } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

interface PrototypePreviewProps {
  prototypeId: string
  className?: string
}

export function PrototypePreview({ prototypeId, className = '' }: PrototypePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const supabase = useSupabaseClient()
  const { toast } = useToast()

  const loadPreview = async (showToast = false) => {
    try {
      setIsRefreshing(true)
      
      // Trigger bundling
      const { data, error } = await supabase.functions.invoke('bundle-prototype', {
        body: { prototypeId }
      })

      if (error) throw error

      setPreviewUrl(data.previewUrl)

      if (showToast) {
        toast({
          title: 'Preview Updated',
          description: 'The preview has been refreshed with the latest changes.',
        })
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

  useEffect(() => {
    loadPreview()
  }, [prototypeId])

  if (isLoading) {
    return <Skeleton className={`w-full h-[600px] ${className}`} />
  }

  return (
    <div className={`relative ${className}`}>
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadPreview(true)}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Preview
        </Button>
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
