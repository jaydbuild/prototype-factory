
import { useState, useEffect } from "react";
import { Prototype } from "@/types/prototype";
import { useIframeStability } from "@/hooks/use-iframe-stability";

interface PrototypePreviewThumbnailProps {
  prototype: Prototype;
  className?: string;
}

export function PrototypePreviewThumbnail({ prototype, className = "" }: PrototypePreviewThumbnailProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [previewError, setPreviewError] = useState(false);

  // More permissive check - if we have any URL, try to load it
  const previewUrl = prototype.deployment_url || prototype.preview_url || null;
  const hasValidPreview = !!previewUrl;
  
  // Add debug logging to help troubleshoot
  useEffect(() => {
    if (prototype.id && !hasValidPreview) {
      console.debug(`Prototype ${prototype.id} has no valid preview URL:`, { 
        deployment_url: prototype.deployment_url,
        deployment_status: prototype.deployment_status,
        preview_url: prototype.preview_url
      });
    }
  }, [prototype, hasValidPreview]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setPreviewError(true);
    console.debug(`Preview load error for prototype ${prototype.id}:`, previewUrl);
  };

  return (
    <div className={`relative w-full h-full overflow-hidden bg-muted ${className}`}>
      {hasValidPreview && !previewError ? (
        <>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-foreground"></div>
            </div>
          )}
          <iframe 
            src={previewUrl}
            title={`Preview of ${prototype.name}`}
            className="w-full h-full border-none"
            style={{ opacity: isLoading ? 0 : 1, transition: "opacity 0.3s ease" }}
            sandbox="allow-scripts"
            loading="lazy"
            onLoad={handleLoad}
            onError={handleError}
          />
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center p-4">
          {previewError ? (
            <p className="text-xs text-muted-foreground text-center">Preview couldn't be loaded</p>
          ) : !hasValidPreview ? (
            <p className="text-xs text-muted-foreground text-center">No preview available</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
