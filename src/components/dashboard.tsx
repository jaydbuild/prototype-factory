
import React from 'react';
import { PrototypeGrid } from './prototype-grid';
import { useIsMobile } from '@/hooks/use-mobile';

const Dashboard = () => {
  const isMobile = useIsMobile();

  return (
    <div className={`mx-auto ${isMobile ? 'px-4' : 'container'} py-8`}>
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Prototypes Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Manage and organize your prototypes
        </p>
      </header>
      
      <PrototypeGrid />
    </div>
  );
};

export default Dashboard;
