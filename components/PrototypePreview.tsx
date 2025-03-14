
import React, { useEffect, useRef } from 'react';

interface PrototypePreviewProps {
  deploymentUrl?: string;
  sandboxConfig?: {
    permissions: string[];
  };
  className?: string;
  isFeedbackMode?: boolean;
}

export const PrototypePreview: React.FC<PrototypePreviewProps> = ({
  deploymentUrl,
  sandboxConfig,
  className = '',
  isFeedbackMode = false
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    console.log('PrototypePreview (components): Component mounted with feedback mode:', isFeedbackMode);
    
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

  // Debug logging
  useEffect(() => {
    if (isFeedbackMode) {
      console.log('PrototypePreview (components): Feedback mode enabled, checking iframe access');
      setTimeout(() => {
        try {
          if (iframeRef.current && iframeRef.current.contentDocument) {
            console.log('PrototypePreview: Successfully accessed iframe contentDocument');
          } else {
            console.warn('PrototypePreview: Cannot access iframe contentDocument - possible security restriction');
          }
        } catch (e) {
          console.error('PrototypePreview: Error accessing iframe contentDocument:', e);
        }
      }, 1000);
    }
  }, [isFeedbackMode]);

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
  
  const sandboxPermissions = sandboxConfig?.permissions?.join(' ') || defaultPermissions.join(' ');

  return (
    <div className={`relative w-full h-full ${className} ${isFeedbackMode ? 'sp-preview' : ''}`}>
      <iframe
        ref={iframeRef}
        src={deploymentUrl}
        className="w-full h-full border-0"
        sandbox={sandboxPermissions}
        allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; web-share"
        loading="lazy"
        data-feedback-mode={isFeedbackMode ? 'true' : 'false'}
      />
    </div>
  );
};
