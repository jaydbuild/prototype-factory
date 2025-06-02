import { useEffect, useState } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';

interface VersionControlState {
  isInternalTester: boolean;
  versionUploadEnabled: boolean;
  versionUiEnabled: boolean;
  loading: boolean;
}

/**
 * Hook to determine version control feature access
 * Checks if the current user is an internal tester and if version control features are enabled
 */
export function useVersionControl(): VersionControlState {
  const [state, setState] = useState<VersionControlState>({
    isInternalTester: false,
    versionUploadEnabled: false,
    versionUiEnabled: false,
    loading: true,
  });
  
  const supabaseClient = useSupabaseClient();
  const user = useUser();

  useEffect(() => {
    // If no user, they can't be an internal tester
    if (!user) {
      setState({
        isInternalTester: false,
        versionUploadEnabled: false,
        versionUiEnabled: false,
        loading: false,
      });
      return;
    }
    
    async function checkAccess() {
      try {
        // First, check if user has internal tester role
        const { data: profiles, error: profileError } = await supabaseClient
          .from('profiles')
          .select('internal_tester')
          .eq('id', user.id)
          .single();
        
        if (profileError) {
          console.error('Error fetching profile:', profileError);
          setState(prev => ({ ...prev, loading: false }));
          return;
        }
        
        const isInternalTester = !!profiles?.internal_tester;
        
        // Next, check feature flags
        const { data: flags, error: flagError } = await supabaseClient
          .from('feature_flags')
          .select('key, enabled')
          .in('key', ['version_control_enabled', 'version_upload_beta', 'version_ui_ro']);
        
        if (flagError) {
          console.error('Error fetching feature flags:', flagError);
          setState(prev => ({ ...prev, loading: false }));
          return;
        }
        
        // Create a map of flag keys to their enabled status
        const flagMap = flags?.reduce((acc, flag) => {
          acc[flag.key] = flag.enabled;
          return acc;
        }, {} as Record<string, boolean>) || {};
        
        // Update state with all the information
        setState({
          isInternalTester,
          versionUploadEnabled: isInternalTester && (flagMap.version_upload_beta || false),
          versionUiEnabled: isInternalTester && (flagMap.version_ui_ro || false),
          loading: false,
        });
      } catch (err) {
        console.error('Error in useVersionControl hook:', err);
        setState(prev => ({ ...prev, loading: false }));
      }
    }
    
    checkAccess();
  }, [user, supabaseClient]);
  
  return state;
}
