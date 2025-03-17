
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

  // Make the iframe ready for inspection with feedback mode
  useEffect(() => {
    if (!iframeRef.current) return;
    
    if (isFeedbackMode) {
      // Apply crosshair cursor style to the iframe
      iframeRef.current.style.cursor = 'crosshair';
      
      // Add a class to the iframe container
      const container = iframeRef.current.parentElement;
      if (container) {
        container.classList.add('inspector-active');
      }
      
    } else {
      // Reset cursor style
      iframeRef.current.style.cursor = '';
      
      // Remove the class from the iframe container
      const container = iframeRef.current.parentElement;
      if (container) {
        container.classList.remove('inspector-active');
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
    <div 
      className={`relative w-full h-full ${className} ${isFeedbackMode ? 'sp-preview' : ''}`}
      data-feedback-mode={isFeedbackMode ? 'true' : 'false'}
    >
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
