
import { PrototypeGrid } from "@/components/prototype-grid";
import { useSupabase } from "@/lib/supabase-provider";
import { CustomSidebar } from "@/components/ui/custom-sidebar";

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
    <div className="flex min-h-screen bg-background">
      <CustomSidebar />
      <main className="flex-1 pl-[3.05rem] transition-all">
        <div className="container mx-auto p-6">
          <PrototypeGrid />
        </div>
      </main>
    </div>
  );
};

export default Index;
