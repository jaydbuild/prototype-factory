
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton
} from '@/components/ui/sidebar';
import { Folder, FolderPlus, Plus } from 'lucide-react';
import { ProjectWithMemberCount } from '@/types/project';
import { Button } from '@/components/ui/button';
import { CreateProjectDialog } from './create-project-dialog';

interface ProjectListProps {
  projects: ProjectWithMemberCount[];
  currentProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  isLoading?: boolean;
}

export function ProjectList({ 
  projects, 
  currentProjectId, 
  onSelectProject,
  isLoading = false 
}: ProjectListProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <SidebarMenuSub className="pl-4">
        {isLoading ? (
          <div className="py-2 text-sm text-muted-foreground">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="py-2 text-sm text-muted-foreground">No projects found</div>
        ) : (
          projects.map((project) => (
            <SidebarMenuSubItem key={project.id}>
              <SidebarMenuSubButton
                onClick={() => onSelectProject(project.id)}
                isActive={currentProjectId === project.id}
              >
                <Folder className="h-4 w-4" />
                <span>{project.name}</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))
        )}
        
        <SidebarMenuSubItem>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs pl-2 h-7"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <FolderPlus className="h-3.5 w-3.5 mr-2" />
            New Project
          </Button>
        </SidebarMenuSubItem>
      </SidebarMenuSub>

      <CreateProjectDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen}
        onProjectCreated={(project) => {
          onSelectProject(project.id);
        }}
      />
    </>
  );
}
