
import { useState, useEffect, useRef } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { PreviewControls } from '@/components/preview/PreviewControls'
import { getLatestReadyVersion, PrototypeVersion } from '@/lib/version-control'
import { useVersionControl } from '@/hooks/use-version-control'

interface PrototypePreviewProps {
  prototypeId: string
  className?: string
}

export function PrototypePreview({ prototypeId, className = '' }: PrototypePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [filesUrl, setFilesUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({})
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null)
  const [currentVersion, setCurrentVersion] = useState<PrototypeVersion | null>(null)
  const supabase = useSupabaseClient()
  const { toast } = useToast()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const { isInternalTester, versionUiEnabled, versionUploadEnabled } = useVersionControl()

  // Load feature flags from Supabase
  const loadFeatureFlags = async () => {
    try {
      const { data: flags, error } = await supabase
        .from('feature_flags')
        .select('key, enabled')
        .in('key', ['version_control_enabled', 'version_ui_ro', 'version_upload_beta'])
      
      if (error) throw error
      
      // Transform to key-value object
      const flagMap = flags.reduce((acc, flag) => {
        acc[flag.key] = flag.enabled
        return acc
      }, {} as Record<string, boolean>)
      
      setFeatureFlags(flagMap)
      return flagMap
    } catch (err) {
      console.error('Error loading feature flags:', err)
      return {}
    }
  }

  const loadPreview = async (showToast = false, versionId?: string) => {
    try {
      setIsRefreshing(true)
      
      // Get feature flags if not loaded yet
      const flags = Object.keys(featureFlags).length > 0 ? featureFlags : await loadFeatureFlags()
      
      // Check localStorage for saved version preference
      const localStorageVersionId = localStorage.getItem(`prototype_version_${prototypeId}`)
      const targetVersionId = versionId || localStorageVersionId || null
      
      // If version control is enabled and we have a version ID (either passed or from localStorage)
      if (flags.version_control_enabled && isInternalTester && versionUiEnabled && targetVersionId) {
        try {
          // Fetch specific version
          const { data: version, error: versionError } = await supabase
            .from('prototype_versions')
            .select('*')
            .eq('id', targetVersionId)
            .eq('status', 'ready') // Only load ready versions
            .single()
          
          if (versionError) throw versionError
          
          if (version) {
            setPreviewUrl(version.preview_url)
            setFilesUrl(version.files_url)
            setCurrentVersionId(version.id)
            setCurrentVersion(version)
            setIsLoading(false)
            setIsRefreshing(false)
            
            if (showToast) {
              toast({
                title: `Loaded version ${version.version_number}`,
                description: version.title || 'Version loaded successfully',
              })
            }
            return
          }
        } catch (err) {
          console.error('Error loading specific version:', err)
          // Fall back to latest version or legacy URL
        }
      }
      
      // If version control is enabled but no specific version requested, or if fetching specific version failed,
      // try to get latest ready version
      if (flags.version_control_enabled) {
        try {
          const versionInfo = await getLatestReadyVersion(supabase, prototypeId, flags)
          
          if (versionInfo.version_id) {
            // We have a version, use it
            setPreviewUrl(versionInfo.preview_url)
            setFilesUrl(versionInfo.files_url)
            setCurrentVersionId(versionInfo.version_id)
            
            // Also fetch the full version details
            const { data: version } = await supabase
              .from('prototype_versions')
              .select('*')
              .eq('id', versionInfo.version_id)
              .single()
              
            if (version) {
              setCurrentVersion(version)
            }
            
            setIsLoading(false)
            setIsRefreshing(false)
            
            if (showToast) {
              toast({
                title: 'Preview Updated',
                description: 'The preview has been refreshed with the latest changes.',
              })
            }
            
            return
          }
        } catch (err) {
          console.error('Error getting latest version:', err)
          // Fall back to legacy URL
        }
      }
      
      // Fall back to legacy URLs if version control is disabled or fails
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

  // Handle version change
  const handleVersionChange = (versionId: string, previewUrl: string, version: PrototypeVersion) => {
    // Update iframe source without full reload
    if (iframeRef.current && iframeRef.current.src !== previewUrl) {
      iframeRef.current.src = previewUrl;
    }
    
    setPreviewUrl(previewUrl);
    setFilesUrl(version.files_url);
    setCurrentVersionId(versionId);
    setCurrentVersion(version);
    
    // Store selected version in localStorage
    localStorage.setItem(`prototype_version_${prototypeId}`, versionId);
  };
  
  useEffect(() => {
    loadPreview()

    // Clean up on unmount
    return () => {
      if (iframeRef.current) {
        iframeRef.current.src = 'about:blank';
      }
    };
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
          // Version control props
          prototypeId={prototypeId}
          onVersionChange={handleVersionChange}
          currentVersionId={currentVersionId || undefined}
        />
      </div>
      
      {previewUrl ? (
        <iframe
          ref={iframeRef}
          src={previewUrl}
          className="w-full h-[600px] border rounded-lg"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation"
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
