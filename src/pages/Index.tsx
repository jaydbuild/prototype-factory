import { PrototypeGrid } from "@/components/prototype-grid";
import { useSupabase } from "@/lib/supabase-provider";

const Index = () => {
  const { session } = useSupabase();

  if (!session) {
    return null;
  }

  return (
    <main className="min-h-screen bg-background">
      <PrototypeGrid />
    </main>
  );
};

export default Index;
