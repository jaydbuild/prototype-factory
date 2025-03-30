
import React from 'react';
import { Badge } from '@/components/ui/badge';

export function EnvironmentBadge() {
  const environment = import.meta.env.VITE_ENVIRONMENT || 'development';
  
  if (environment === 'production') {
    return null; // Don't show badge in production
  }
  
  const colorMap: Record<string, string> = {
    development: 'bg-blue-500 hover:bg-blue-600',
    staging: 'bg-amber-500 hover:bg-amber-600',
    test: 'bg-purple-500 hover:bg-purple-600',
  };
  
  return (
    <div className="fixed bottom-2 right-2 z-50">
      <Badge className={`${colorMap[environment] || 'bg-gray-500'} text-white`}>
        {environment.toUpperCase()}
      </Badge>
    </div>
  );
}
