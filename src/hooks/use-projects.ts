
import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/lib/supabase-provider';
import { useToast } from './use-toast';
import { Project, ProjectWithMemberCount } from '@/types/project';

export const useProjects = () => {
  const [projects, setProjects] = useState<ProjectWithMemberCount[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { supabase } = useSupabase();
  const { toast } = useToast();

  const fetchProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        console.error('No authenticated user found');
        return;
      }

      // First, get the user's project memberships
      const { data: memberships, error: membershipError } = await supabase
        .from('project_members')
        .select('project_id, role')
        .eq('user_id', userData.user.id);

      if (membershipError) {
        console.error('Error fetching project memberships:', membershipError);
        throw membershipError;
      }

      if (!memberships || memberships.length === 0) {
        setProjects([]);
        setIsLoading(false);
        return;
      }

      // Then, fetch the projects using the project_ids
      const projectIds = memberships.map(m => m.project_id);
      
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          project_members_count:project_members(count),
          prototype_count:prototypes(count)
        `)
        .in('id', projectIds)
        .order('created_at', { ascending: false });

      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
        throw projectsError;
      }

      // Helper function to validate role is one of the expected values
      const validateRole = (role: string): 'owner' | 'editor' | 'viewer' | undefined => {
        return (role === 'owner' || role === 'editor' || role === 'viewer') 
          ? (role as 'owner' | 'editor' | 'viewer') 
          : undefined;
      };

      // Transform the data to include the member count, prototype count, and role
      const projectsWithCounts = projectsData.map(project => {
        const membership = memberships.find(m => m.project_id === project.id);
        return {
          ...project,
          member_count: project.project_members_count?.[0]?.count || 0,
          prototype_count: project.prototype_count?.[0]?.count || 0,
          role: validateRole(membership?.role)
        } as ProjectWithMemberCount; // Ensure the whole object matches the expected type
      });

      setProjects(projectsWithCounts);
      
      // Set first project as current if none is set
      if (projectsWithCounts.length > 0 && !currentProject) {
        setCurrentProject(projectsWithCounts[0]);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch projects. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  }, [supabase, toast, currentProject]);

  const createDefaultProjectIfNeeded = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        console.error('No authenticated user found');
        return;
      }

      // Create a default "Test" project
      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: 'Test',
          description: 'Default project for your prototypes',
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (projectError) {
        console.error('Error creating default project:', projectError);
        throw projectError;
      }

      // Add the user as an owner of the project, using a separate query
      const { error: memberError } = await supabase
        .from('project_members')
        .insert({
          project_id: newProject.id,
          user_id: userData.user.id,
          role: 'owner',
        });

      if (memberError) {
        console.error('Error adding member to project:', memberError);
        throw memberError;
      }
      
      // Get existing prototypes without a project_id
      const { data: prototypes, error: prototypeError } = await supabase
        .from('prototypes')
        .select('id')
        .is('project_id', null);
        
      if (prototypeError) {
        console.error('Error fetching prototypes:', prototypeError);
        throw prototypeError;
      }
      
      // Update all prototypes to the new project
      if (prototypes && prototypes.length > 0) {
        const { error: updateError } = await supabase
          .from('prototypes')
          .update({ project_id: newProject.id })
          .in('id', prototypes.map(p => p.id));
          
        if (updateError) {
          console.error('Error updating prototypes:', updateError);
          throw updateError;
        }
      }

      // Add the newly created project to the state
      const newProjectWithCounts: ProjectWithMemberCount = {
        ...newProject,
        member_count: 1,
        prototype_count: prototypes?.length || 0,
        role: 'owner'
      };
      
      setProjects(prev => [newProjectWithCounts, ...prev]);
      
      // Set as current project
      setCurrentProject(newProject);
      
      toast({
        title: 'Default Project Created',
        description: 'A "Test" project has been created for your prototypes.'
      });
      
    } catch (error) {
      console.error('Error creating default project:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create default project. Please try again.'
      });
    }
  }, [supabase, toast]);

  useEffect(() => {
    if (supabase) {
      fetchProjects();
    }
  }, [supabase, fetchProjects]);

  return {
    projects,
    currentProject,
    setCurrentProject,
    isLoading,
    createDefaultProjectIfNeeded,
    refetchProjects: fetchProjects
  };
};
