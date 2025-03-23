
import { useEffect, useState } from "react";
import { PrototypeGrid } from "@/components/prototype-grid";
import { useSupabase } from "@/lib/supabase-provider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { ProjectList } from "@/components/project/project-list";
import { useProjects } from "@/hooks/use-projects";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";

const Index = () => {
  const { session } = useSupabase();
  const { projects, currentProject, setCurrentProject, isLoading: projectsLoading, createDefaultProjectIfNeeded } = useProjects();
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (currentProject) {
      setCurrentProjectId(currentProject.id);
    }
  }, [currentProject]);

  // Create default project if needed
  useEffect(() => {
    if (!projectsLoading && projects.length === 0) {
      createDefaultProjectIfNeeded();
    }
  }, [projectsLoading, projects, createDefaultProjectIfNeeded]);

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
          {/* The issue was here - Radix UI's Collapsible component has specific TypeScript types */}
          <Collapsible defaultOpen className="group/collapsible">
            <CollapsibleTrigger className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-accent">
              <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
              <span>Projects</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ProjectList 
                projects={projects} 
                currentProjectId={currentProjectId}
                onSelectProject={handleSelectProject}
                isLoading={projectsLoading}
              />
            </CollapsibleContent>
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
