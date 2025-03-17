
import React, { useEffect, useRef, useState } from 'react';

interface PrototypePreviewProps {
  deploymentUrl?: string;
  sandboxConfig?: {
    permissions: string[];
  };
  className?: string;
  filesUrl?: string;
  onDownload?: () => void;
  onShare?: () => void;
  originalDimensions?: {
    width: number;
    height: number;
  };
}

export const PrototypePreview: React.FC<PrototypePreviewProps> = ({
  deploymentUrl,
  sandboxConfig,
  className = '',
  filesUrl,
  onDownload,
  onShare,
  originalDimensions = { width: 1920, height: 1080 } // Default dimensions
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [aspectRatio, setAspectRatio] = useState(originalDimensions.width / originalDimensions.height);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset iframe when URL changes
    if (iframeRef.current) {
      iframeRef.current.src = deploymentUrl || 'about:blank';
    }

    // Clean up on unmount
    return () => {
      if (iframeRef.current) {
        iframeRef.current.src = 'about:blank';
      }
    };
  }, [deploymentUrl]);

  // Calculate scale factor when container is resized
  useEffect(() => {
    if (!containerRef.current) return;

    const calculateScale = () => {
      const containerWidth = containerRef.current?.clientWidth || 0;
      const idealWidth = originalDimensions.width;
      const newScale = containerWidth / idealWidth;
      setScale(newScale);
    };

    calculateScale();
    const resizeObserver = new ResizeObserver(calculateScale);
    resizeObserver.observe(containerRef.current);

    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, [originalDimensions.width]);

  if (!deploymentUrl) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <p className="text-gray-500">No preview available</p>
      </div>
    );
  }

  // Construct sandbox permissions with proper navigation permissions
  const defaultPermissions = [
    'allow-scripts', 
    'allow-same-origin', 
    'allow-forms', 
    'allow-popups', 
    'allow-top-navigation-by-user-activation'
  ];
  
  const sandboxPermissions = sandboxConfig?.permissions?.length 
    ? [...sandboxConfig.permissions, 'allow-top-navigation-by-user-activation'].join(' ')
    : defaultPermissions.join(' ');

  return (
    <div 
      ref={containerRef}
      className={`relative w-full overflow-hidden ${className}`} 
      style={{ aspectRatio: aspectRatio }}
    >
      <iframe
        ref={iframeRef}
        src={deploymentUrl}
        className="w-full h-full border-0"
        sandbox={sandboxPermissions}
        allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; web-share"
        loading="lazy"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      />
    </div>
  );
};
