import { ArrowPathIcon } from '@heroicons/react/24/outline';
import React, { useState } from 'react';

interface PreviewWindowProps {
  url: string;
  onShare: () => void;
}

export const PreviewWindow = ({ url, onShare }: PreviewWindowProps) => {
  const [key, setKey] = useState(0);

  const handleRefresh = () => {
    setKey(prev => prev + 1);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
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
      <div className="flex-1 bg-white overflow-auto">
        <iframe
          key={key}
          src={url}
          className="w-full h-full border-0"
          title="Preview"
        />
      </div>
    </div>
  );
};
