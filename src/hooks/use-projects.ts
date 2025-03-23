
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

  // Helper function to validate role is one of the expected values
  const validateRole = (role: string | undefined): 'owner' | 'editor' | 'viewer' | undefined => {
    if (!role) return undefined;
    return (role === 'owner' || role === 'editor' || role === 'viewer') 
      ? (role as 'owner' | 'editor' | 'viewer') 
      : undefined;
  };

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
        console.log('No project memberships found for user:', userData.user.id);
        setProjects([]);
        setIsLoading(false);
        return;
      }

      console.log('User project memberships:', memberships);

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

      console.log('Projects data fetched:', projectsData);

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

      console.log('Projects with counts:', projectsWithCounts);
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

      console.log('Creating default project for user:', userData.user.id);

      // Create a default "Test" project using the RPC function
      const { data, error: projectError } = await supabase.rpc('create_project_with_owner', {
        p_name: 'Test',
        p_description: 'Default project for your prototypes',
        p_user_id: userData.user.id
      } as any);

      if (projectError) {
        console.error('Error creating default project:', projectError);
        throw projectError;
      }

      // Parse data if it's a string
      const projectData = typeof data === 'string' ? JSON.parse(data) : data;
      
      if (!projectData) {
        throw new Error('Failed to create default project');
      }
      
      console.log('Default project created:', projectData);
      
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
          .update({ project_id: projectData.id })
          .in('id', prototypes.map(p => p.id));
          
        if (updateError) {
          console.error('Error updating prototypes:', updateError);
          throw updateError;
        }
      }

      // Add the newly created project to the state
      const newProjectWithCounts: ProjectWithMemberCount = {
        ...projectData,
        member_count: 1,
        prototype_count: prototypes?.length || 0,
        role: 'owner'
      };
      
      setProjects(prev => [newProjectWithCounts, ...prev]);
      
      // Set as current project
      setCurrentProject(newProjectWithCounts);
      
      toast({
        title: 'Default Project Created',
        description: 'A "Test" project has been created for your prototypes.'
      });
      
      // Refetch projects to ensure UI is up-to-date
      fetchProjects();
      
    } catch (error) {
      console.error('Error creating default project:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create default project. Please try again.'
      });
    }
  }, [supabase, toast, fetchProjects]);

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
