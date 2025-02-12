import { ArrowPathIcon } from '@heroicons/react/24/outline';
import React, { useState } from 'react';
import { PreviewIframe } from './PreviewIframe';

interface PreviewWindowProps {
  url: string;
  onShare: () => void;
  prototypeId: string;
}

export const PreviewWindow = ({ url, onShare, prototypeId }: PreviewWindowProps) => {
  const [key, setKey] = useState(0);

  const handleRefresh = () => {
    setKey(prev => prev + 1);
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 shrink-0">
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
            title="Refresh preview"
          >
            <ArrowPathIcon className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={onShare}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Share
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <PreviewIframe
          key={key}
          url={url}
          title="Preview"
          prototypeId={prototypeId}
        />
      </div>
    </div>
  );
};
