
import { useEffect, useState } from "react";
import { PrototypeGrid } from "@/components/prototype-grid";
import { useSupabase } from "@/lib/supabase-provider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { ProjectList } from "@/components/project/project-list";
import { useProjects } from "@/hooks/use-projects";
import { Collapsible } from "@/components/ui/collapsible";

const Index = () => {
  const { session } = useSupabase();
  const { projects, currentProject, setCurrentProject, isLoading: projectsLoading } = useProjects();
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (currentProject) {
      setCurrentProjectId(currentProject.id);
    }
  }, [currentProject]);

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

  const handleSelectProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setCurrentProject(project);
    }
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full">
        <AppSidebar>
          <Collapsible defaultOpen>
            <ProjectList 
              projects={projects} 
              currentProjectId={currentProjectId}
              onSelectProject={handleSelectProject}
              isLoading={projectsLoading}
            />
          </Collapsible>
        </AppSidebar>
        <SidebarInset className="bg-background">
          <div className="container mx-auto p-6">
            <PrototypeGrid projectId={currentProjectId} />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Index;
