import React, { useEffect, useRef } from 'react';

interface PrototypePreviewProps {
  deploymentUrl?: string;
  sandboxConfig?: {
    permissions: string[];
  };
  className?: string;
}

export const PrototypePreview: React.FC<PrototypePreviewProps> = ({
  deploymentUrl,
  sandboxConfig,
  className = ''
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Reset iframe when URL changes
    if (iframeRef.current) {
      iframeRef.current.src = deploymentUrl || 'about:blank';
    }
  }, [deploymentUrl]);

  if (!deploymentUrl) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <p className="text-gray-500">No preview available</p>
      </div>
    );
  }

  // Construct sandbox permissions
  const sandboxPermissions = sandboxConfig?.permissions?.join(' ') || 'allow-scripts';

  return (
    <div className={`relative w-full h-full ${className}`}>
      <iframe
        ref={iframeRef}
        src={deploymentUrl}
        className="w-full h-full border-0"
        sandbox={sandboxPermissions}
        allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; web-share"
        loading="lazy"
      />
    </div>
  );
};
