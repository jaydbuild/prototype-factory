import { SupabaseClient } from '@supabase/supabase-js';

export interface PrototypeVersion {
  id: string;
  prototype_id: string;
  version_number: number;
  title?: string;
  description?: string;
  figma_url?: string;
  preview_url: string;
  files_url: string;
  status: 'ready' | 'processing' | 'failed';
  created_at: string;
  created_by: string;
}

// Maximum number of versions per prototype
export const VERSION_SOFT_CAP = 20;

/**
 * Get the storage path for a specific prototype version
 * @param prototypeId The prototype UUID
 * @param versionNumber The version number
 * @returns The storage path for the version
 */
export function getVersionPath(prototypeId: string, versionNumber: number): string {
  return `prototypes/${prototypeId}/v${versionNumber}`;
}

/**
 * Creates a new version row for a prototype with transaction safety
 * @param supabase Supabase client
 * @param prototypeId The prototype UUID
 * @param userId The user creating the version
 * @param status The initial status (defaults to 'ready')
 * @returns The created version data or error
 */
export async function createVersionRow(
  supabase: SupabaseClient,
  prototypeId: string,
  userId: string,
  status: 'ready' | 'processing' | 'failed' = 'ready'
) {
  const { data, error } = await supabase.rpc('create_version_row', {
    p_prototype_id: prototypeId,
    p_created_by: userId,
    p_status: status
  });
  
  return { data, error };
}

/**
 * Gets the latest ready version for a prototype
 * @param supabase Supabase client
 * @param prototypeId The prototype UUID
 * @param featureFlags The feature flags object
 * @returns The latest version URL information or legacy URL
 */
export async function getLatestReadyVersion(
  supabase: SupabaseClient,
  prototypeId: string,
  featureFlags: Record<string, boolean>
) {
  // Check if version control is enabled
  const versionControlEnabled = featureFlags?.version_control_enabled || false;
  
  if (!versionControlEnabled) {
    // Return legacy URL from prototypes table
    const { data: prototype, error } = await supabase
      .from('prototypes')
      .select('preview_url, files_url')
      .eq('id', prototypeId)
      .single();
      
    if (error) {
      throw error;
    }
    
    return {
      preview_url: prototype?.preview_url,
      files_url: prototype?.files_url,
      version_number: null,
      version_id: null
    };
  }
  
  // Get latest ready version
  const { data: versions, error } = await supabase
    .from('prototype_versions')
    .select('id, version_number')
    .eq('prototype_id', prototypeId)
    .eq('status', 'ready')
    .order('version_number', { ascending: false })
    .limit(1);
    
  if (error) {
    throw error;
  }
  
  // If no versions found, fall back to legacy columns
  if (!versions || versions.length === 0) {
    const { data: prototype, error } = await supabase
      .from('prototypes')
      .select('preview_url, files_url')
      .eq('id', prototypeId)
      .single();
      
    if (error) {
      throw error;
    }
    
    return {
      preview_url: prototype?.preview_url,
      files_url: prototype?.files_url,
      version_number: null,
      version_id: null
    };
  }
  
  const latestVersion = versions[0];
  const versionPath = getVersionPath(prototypeId, latestVersion.version_number);
  
  return {
    preview_url: `${versionPath}/index.html`,
    files_url: versionPath,
    version_number: latestVersion.version_number,
    version_id: latestVersion.id
  };
}

/**
 * Checks if a prototype has reached the version soft cap
 * @param supabase Supabase client
 * @param prototypeId The prototype UUID
 * @returns True if the prototype has reached or exceeded the soft cap
 */
export async function hasReachedVersionSoftCap(
  supabase: SupabaseClient,
  prototypeId: string
): Promise<boolean> {
  try {
    // Count versions for this prototype using exact count
    const { count, error } = await supabase
      .from('prototype_versions')
      .select('id', { count: 'exact' })
      .eq('prototype_id', prototypeId);
      
    if (error) {
      throw error;
    }
    
    return (count || 0) >= VERSION_SOFT_CAP;
  } catch (err) {
    console.error('Error checking version soft cap:', err);
    // In case of error, assume cap not reached to prevent blocking upload
    return false;
  }
}
