
import React, { useEffect, useRef } from 'react';

interface PrototypePreviewProps {
  deploymentUrl?: string;
  sandboxConfig?: {
    permissions: string[];
  };
  className?: string;
  filesUrl?: string;
  onDownload?: () => void;
  onShare?: () => void;
  isFeedbackMode?: boolean;
}

export const PrototypePreview: React.FC<PrototypePreviewProps> = ({
  deploymentUrl,
  sandboxConfig,
  className = '',
  filesUrl,
  onDownload,
  onShare,
  isFeedbackMode = false
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  useEffect(() => {
    console.log('PrototypePreview: Component mounted with feedback mode:', isFeedbackMode);
    
    // Reset iframe when URL changes
    if (iframeRef.current) {
      console.log('PrototypePreview: Setting iframe src to:', deploymentUrl || 'about:blank');
      iframeRef.current.src = deploymentUrl || 'about:blank';
    }

    // Clean up on unmount
    return () => {
      console.log('PrototypePreview: Component unmounting, cleaning up iframe');
      if (iframeRef.current) {
        iframeRef.current.src = 'about:blank';
      }
    };
  }, [deploymentUrl]);

  // Debug iframe access
  useEffect(() => {
    if (isFeedbackMode) {
      console.log('PrototypePreview: Feedback mode enabled, checking iframe access');
      
      // Check iframe access after the iframe has had time to load
      const checkAccess = () => {
        try {
          if (iframeRef.current && iframeRef.current.contentDocument) {
            console.log('PrototypePreview: Successfully accessed iframe contentDocument');
            return true;
          } else {
            console.warn('PrototypePreview: Cannot access iframe contentDocument yet');
            return false;
          }
        } catch (e) {
          console.error('PrototypePreview: Error accessing iframe contentDocument:', e);
          return false;
        }
      };
      
      // Try a few times with increasing delays
      let attempts = 0;
      const maxAttempts = 5;
      
      const attemptAccess = () => {
        if (attempts >= maxAttempts) {
          console.error('PrototypePreview: Max attempts reached, cannot access iframe content');
          return;
        }
        
        if (!checkAccess()) {
          attempts++;
          setTimeout(attemptAccess, 500 * attempts);
        }
      };
      
      // Start checking after a short delay
      setTimeout(attemptAccess, 500);
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
  
  const sandboxPermissions = sandboxConfig?.permissions?.length 
    ? [...sandboxConfig.permissions, 'allow-top-navigation-by-user-activation'].join(' ')
    : defaultPermissions.join(' ');

  console.log('PrototypePreview: Rendering with sandbox permissions:', sandboxPermissions);
  console.log('PrototypePreview: Feedback mode:', isFeedbackMode);

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
