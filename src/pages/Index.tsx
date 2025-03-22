
import { PrototypeGrid } from "@/components/prototype-grid";
import { useSupabase } from "@/lib/supabase-provider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";

const Index = () => {
  const { session } = useSupabase();

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-foreground"></div>
          <p className="text-sm text-muted-foreground">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="bg-background">
          <div className="container mx-auto p-6">
            <PrototypeGrid />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Index;
