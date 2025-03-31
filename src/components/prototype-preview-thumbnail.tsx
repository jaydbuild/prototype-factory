
import { useState } from "react";
import { Prototype } from "@/types/prototype";

interface PrototypePreviewThumbnailProps {
  prototype: Prototype;
  className?: string;
}

export function PrototypePreviewThumbnail({ prototype, className = "" }: PrototypePreviewThumbnailProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [previewError, setPreviewError] = useState(false);

  const hasValidPreview = prototype.deployment_url && prototype.deployment_status === 'deployed';

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setPreviewError(true);
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
            src={prototype.deployment_url}
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
