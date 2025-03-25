
import { PrototypeGrid } from "@/components/prototype-grid";
import { useSupabase } from "@/lib/supabase-provider";

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
    <main className="min-h-screen bg-background">
      <PrototypeGrid />
    </main>
  );
};

export default Index;
