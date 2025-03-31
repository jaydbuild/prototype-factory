import { useState } from "react";
import { PrototypeCard } from "@/components/prototype-card";
import { NewPrototypeDialog } from "@/components/new-prototype-dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationBell } from "./notification/notification-bell";

const Dashboard = () => {
  const [selectedPrototypeId, setSelectedPrototypeId] = useState<string | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);

  const { data: prototypes, isLoading } = useQuery({
    queryKey: ['prototypes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prototypes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data;
    }
  });

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container flex items-center justify-between h-14">
          <div className="font-semibold">Prototype Playground</div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <Button size="sm" asChild onClick={() => setShowNewDialog(true)}>
              <Link to="#">
                <Plus className="w-4 h-4 mr-2" />
                New Prototype
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container py-6">
        <h2 className="text-2xl font-bold mb-4">Your Prototypes</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-40 w-full rounded-t-lg" />
                <div className="p-5 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))
          ) : prototypes && prototypes.length > 0 ? (
            prototypes.map(prototype => (
              <PrototypeCard
                key={prototype.id}
                prototype={prototype}
                onSelect={() => setSelectedPrototypeId(prototype.id)}
                isSelected={selectedPrototypeId === prototype.id}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No prototypes yet. Create one to get started!</p>
            </div>
          )}
        </div>
      </main>

      {/* New Prototype Dialog */}
      <NewPrototypeDialog open={showNewDialog} onOpenChange={setShowNewDialog} />
    </div>
  );
};

export default Dashboard;
