
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
      const maxAttempts = 15; // Increased for more attempts
      
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
      setTimeout(attemptAccess, 300);
      
      // Listen for iframe load event
      const handleIframeLoad = () => {
        console.log('PrototypePreview: iframe has loaded, checking content access');
        checkAccess();
      };
      
      if (iframeRef.current) {
        iframeRef.current.addEventListener('load', handleIframeLoad);
        return () => {
          if (iframeRef.current) {
            iframeRef.current.removeEventListener('load', handleIframeLoad);
          }
        };
      }
    }
  }, [isFeedbackMode]);

  if (!deploymentUrl) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <p className="text-gray-500">No preview available</p>
      </div>
    );
  }

  // Critical permissions for element targeting:
  // - allow-same-origin: Required to access iframe contentDocument
  // - allow-scripts: Required for JS execution in the iframe
  const defaultPermissions = [
    'allow-scripts', 
    'allow-same-origin', 
    'allow-forms', 
    'allow-popups', 
    'allow-top-navigation-by-user-activation'
  ];
  
  // Ensure we always include critical permissions
  const sandboxPermissions = sandboxConfig?.permissions?.length 
    ? [...new Set([...sandboxConfig.permissions, 'allow-same-origin', 'allow-scripts'])]
    : defaultPermissions;
  
  const sandboxAttr = sandboxPermissions.join(' ');

  console.log('PrototypePreview: Rendering with sandbox permissions:', sandboxAttr);
  console.log('PrototypePreview: Feedback mode:', isFeedbackMode);

  return (
    <div 
      className={`relative w-full h-full ${className} ${isFeedbackMode ? 'sp-preview' : ''}`}
      data-feedback-mode={isFeedbackMode ? 'true' : 'false'}
      id="prototype-preview-container"
    >
      <iframe
        ref={iframeRef}
        src={deploymentUrl}
        className="w-full h-full border-0"
        sandbox={sandboxAttr}
        allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; web-share"
        loading="lazy"
        data-feedback-mode={isFeedbackMode ? 'true' : 'false'}
      />
    </div>
  );
};
