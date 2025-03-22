
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { Project, ProjectWithMemberCount } from '@/types/project';

export function useProjects() {
  const [projects, setProjects] = useState<ProjectWithMemberCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoading(true);
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          setIsLoading(false);
          return;
        }

        // Get projects the user belongs to
        const { data, error } = await supabase
          .from('projects')
          .select(`
            *,
            project_members!inner(role),
            project_members_count:project_members(count),
            prototypes_count:prototypes(count)
          `)
          .eq('project_members.user_id', userData.user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
          const projectsWithCounts = data.map(project => ({
            ...project,
            member_count: project.project_members_count?.[0]?.count || 0,
            prototype_count: project.prototypes_count?.[0]?.count || 0,
            role: project.project_members?.[0]?.role
          })) as ProjectWithMemberCount[];

          setProjects(projectsWithCounts);
          
          // If we have projects but no current project, set the first one
          if (projectsWithCounts.length > 0 && !currentProject) {
            setCurrentProject(projectsWithCounts[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load projects. Please try refreshing the page.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();

    // Set up realtime subscription
    const channel = supabase
      .channel('projects-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
        },
        (payload) => {
          fetchProjects(); // Refetch all projects on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast, currentProject]);

  const createProject = async (name: string, description?: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('projects')
        .insert({
          name,
          description,
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add the creator as an owner
      if (data) {
        const { error: memberError } = await supabase
          .from('project_members')
          .insert({
            project_id: data.id,
            user_id: userData.user.id,
            role: 'owner',
          });

        if (memberError) throw memberError;

        toast({
          title: 'Success',
          description: `Project "${name}" created successfully.`,
        });

        return data as Project;
      }
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create project. Please try again.',
      });
      return null;
    }
  };

  const deleteProject = async (projectId: string) => {
    try {
      // Check if user is the owner
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('User not authenticated');
      }

      const { data: memberData, error: memberError } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', userData.user.id)
        .single();

      if (memberError || !memberData || memberData.role !== 'owner') {
        throw new Error('Only the project owner can delete a project');
      }

      // Delete project (cascading delete will handle members and prototypes)
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Project deleted successfully.',
      });

      // If the deleted project was the current project, set current to null
      if (currentProject && currentProject.id === projectId) {
        setCurrentProject(null);
      }

      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete project. Please try again.',
      });
      return false;
    }
  };

  return {
    projects,
    isLoading,
    currentProject,
    setCurrentProject,
    createProject,
    deleteProject,
  };
}
