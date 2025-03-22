
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { Project, ProjectWithMemberCount } from '@/types/project';

export function useProjects() {
  const [projects, setProjects] = useState<ProjectWithMemberCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const { toast } = useToast();

  const fetchProjects = useCallback(async () => {
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
  }, [toast, currentProject]);

  useEffect(() => {
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
  }, [fetchProjects]);

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

        fetchProjects(); // Refresh the projects list
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

  const createDefaultProjectIfNeeded = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Check if user has any projects
      const { data: existingProjects, error: projectsError } = await supabase
        .from('projects')
        .select('id')
        .eq('created_by', userData.user.id);

      if (projectsError) throw projectsError;

      // Create a default project if none exist
      if (!existingProjects || existingProjects.length === 0) {
        const { data: defaultProject, error: createError } = await supabase
          .from('projects')
          .insert({
            name: 'Test',
            description: 'Default project for existing prototypes',
            created_by: userData.user.id,
          })
          .select()
          .single();

        if (createError) throw createError;

        if (defaultProject) {
          // Add user as owner of the default project
          const { error: memberError } = await supabase
            .from('project_members')
            .insert({
              project_id: defaultProject.id,
              user_id: userData.user.id,
              role: 'owner',
            });

          if (memberError) throw memberError;

          // Get prototypes without a project
          const { data: orphanedPrototypes, error: prototypeError } = await supabase
            .from('prototypes')
            .select('id')
            .is('project_id', null);

          if (prototypeError) throw prototypeError;

          // Update orphaned prototypes to be part of this project
          if (orphanedPrototypes && orphanedPrototypes.length > 0) {
            const { error: updateError } = await supabase
              .from('prototypes')
              .update({ project_id: defaultProject.id })
              .is('project_id', null);

            if (updateError) throw updateError;
          }

          toast({
            title: 'Default Project Created',
            description: 'A "Test" project has been created with your existing prototypes.',
          });

          fetchProjects(); // Refresh projects list
          return defaultProject as Project;
        }
      }
    } catch (error) {
      console.error('Error creating default project:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create default project.',
      });
      return null;
    }
  }, [toast, fetchProjects]);

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

      fetchProjects(); // Refresh the projects list
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
    createDefaultProjectIfNeeded,
  };
}
