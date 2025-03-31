
import React from 'react';
import { PrototypeGrid } from './prototype-grid';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSupabase } from '@/lib/supabase-provider';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const isMobile = useIsMobile();
  const { session } = useSupabase();
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!session) {
      navigate('/auth');
    }
  }, [session, navigate]);

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please Login</h1>
          <p className="text-muted-foreground mb-4">You need to be logged in to view your prototypes</p>
          <Button onClick={() => navigate('/auth')}>Go to Login</Button>
        </div>
      </div>
    );
  }

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
