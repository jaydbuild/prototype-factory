import { useState } from "react";
import { AddPrototypeDialog } from "@/components/upload-prototype-dialog";
import { useSupabase } from "@/lib/supabase-provider";
import { PrototypeGrid } from "./prototype-grid";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { useEffect } from "react";
import { Skeleton } from "./ui/skeleton";
import { toast } from "./ui/sonner";
import { useQueryClient } from "@tanstack/react-query";
import { NotificationBell } from "./notification/notification-bell";

const Dashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [prototypeCount, setPrototypeCount] = useState(0);
  const { supabase, session } = useSupabase();
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchPrototypeCount = async () => {
      try {
        setIsLoading(true);
        const { data, error, count } = await supabase
          .from("prototypes")
          .select("*", { count: "exact", head: false })
          .eq("created_by", session?.user.id);

        if (error) {
          console.error("Error fetching prototype count:", error);
          toast({
            title: "Error fetching prototypes",
            description: "Please try again later",
            variant: "destructive",
          });
        }

        setPrototypeCount(count || 0);
      } catch (error) {
        console.error("Unexpected error fetching prototype count:", error);
        toast({
          title: "Unexpected error",
          description: "Please try again later",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (session?.user) {
      fetchPrototypeCount();
    }
  }, [session?.user, supabase, queryClient]);

  return (
    <div className="container py-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Your Prototypes</h1>
          <p className="text-muted-foreground">
            Manage and showcase your interactive prototypes.
          </p>
        </div>
        <div className="flex gap-4 items-center">
          <NotificationBell />
          <AddPrototypeDialog
            onUpload={() => {
              queryClient.invalidateQueries({ queryKey: ["prototypes"] });
            }}
          />
        </div>
      </div>

      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Prototype Overview</h2>
            <p className="text-muted-foreground">
              A summary of your prototype activity.
            </p>
          </div>
          <div className="space-x-2">
            <Button variant="outline" size="sm">
              Last 7 Days
            </Button>
            <Button variant="outline" size="sm">
              Last Month
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-2xl font-bold">
                {isLoading ? <Skeleton className="h-6 w-12" /> : prototypeCount}
              </span>
              <p className="text-muted-foreground">Total Prototypes</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <span className="text-2xl font-bold">
                {isLoading ? <Skeleton className="h-6 w-12" /> : "0"}
              </span>
              <p className="text-muted-foreground">Active Users</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <span className="text-2xl font-bold">
                {isLoading ? <Skeleton className="h-6 w-12" /> : "0"}
              </span>
              <p className="text-muted-foreground">Total Comments</p>
            </div>
          </div>
        </div>
      </Card>

      <PrototypeGrid />
    </div>
  );
};

export default Dashboard;
