
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Prototype } from "@/types/prototype";
import { useSupabase } from "@/lib/supabase-provider";

export function usePrototypeData(
  sortBy: string, 
  searchTerm: string,
  selectedCollection: string | null
) {
  const { toast } = useToast();
  const { session } = useSupabase();
  const currentUserId = session?.user?.id;

  // Query for prototype-collection mappings
  const { data: prototypeCollections = {} } = useQuery({
    queryKey: ['prototype-collections'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('prototype_collections')
          .select('prototype_id, collection_id');

        if (error) throw error;

        const mapping: Record<string, string[]> = {};
        (data || []).forEach((item: any) => {
          if (!mapping[item.prototype_id]) {
            mapping[item.prototype_id] = [];
          }
          mapping[item.prototype_id].push(item.collection_id);
        });
        
        return mapping;
      } catch (error) {
        console.error('Error fetching prototype collections:', error);
        return {};
      }
    }
  });

  // Query for creator profiles
  const { data: creatorProfiles = {} } = useQuery({
    queryKey: ['creator-profiles'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, avatar_url');

        if (error) throw error;

        const profileMap: Record<string, { name: string, avatar_url: string | null }> = {};
        (data || []).forEach((profile: any) => {
          profileMap[profile.id] = {
            name: profile.name || 'Anonymous',
            avatar_url: profile.avatar_url
          };
        });
        
        return profileMap;
      } catch (error) {
        console.error('Error fetching creator profiles:', error);
        return {};
      }
    }
  });

  // Query for prototypes
  const { data: prototypes = [], isLoading } = useQuery({
    queryKey: ['prototypes', sortBy, searchTerm, selectedCollection, prototypeCollections, currentUserId],
    queryFn: async () => {
      try {
        let query = supabase
          .from('prototypes')
          .select('*');

        // Filter by the currently logged-in user
        if (currentUserId) {
          query = query.eq('created_by', currentUserId);
        }

        if (searchTerm) {
          query = query.ilike('name', `%${searchTerm}%`);
        }

        if (sortBy === 'recent') {
          query = query.order('created_at', { ascending: false });
        } else {
          query = query.order('name');
        }

        const { data, error } = await query;

        if (error) throw error;
        
        let filteredData = data || [];
        
        // Filter by collection if one is selected
        if (selectedCollection) {
          filteredData = filteredData.filter(item => {
            const prototypeCollectionIds = prototypeCollections[item.id] || [];
            return prototypeCollectionIds.includes(selectedCollection);
          });
        } else {
          // Only show prototypes not in any collection in the "All" view
          filteredData = filteredData.filter(item => {
            return !prototypeCollections[item.id] || prototypeCollections[item.id].length === 0;
          });
        }
        
        // Transform data to match Prototype type
        return filteredData.map((item): Prototype => {
          let parsedSandboxConfig: Record<string, unknown> | null = null;
          if (item.sandbox_config) {
            if (typeof item.sandbox_config === 'string') {
              try {
                parsedSandboxConfig = JSON.parse(item.sandbox_config);
              } catch {
                console.warn('Failed to parse sandbox_config:', item.sandbox_config);
              }
            } else if (typeof item.sandbox_config === 'object') {
              parsedSandboxConfig = item.sandbox_config as Record<string, unknown>;
            }
          }

          // Add creator profile information
          const creator = creatorProfiles[item.created_by] || { name: 'Unknown User', avatar_url: null };

          return {
            id: item.id,
            name: item.name,
            created_at: item.created_at,
            created_by: item.created_by,
            creator_name: creator.name,
            creator_avatar: creator.avatar_url,
            url: item.url,
            preview_url: item.preview_url,
            preview_title: item.preview_title,
            preview_description: item.preview_description,
            preview_image: item.preview_image,
            deployment_status: item.deployment_status as 'pending' | 'processing' | 'deployed' | 'failed',
            deployment_url: item.deployment_url,
            file_path: item.file_path,
            bundle_path: item.bundle_path,
            processed_at: item.processed_at,
            status: item.status,
            figma_url: item.figma_url,
            sandbox_config: parsedSandboxConfig
          };
        });
      } catch (error: any) {
        console.error('Error fetching prototypes:', error);
        toast({
          title: "Error",
          description: "Failed to fetch prototypes",
          variant: "destructive",
        });
        return [];
      }
    },
  });

  return {
    prototypes,
    prototypeCollections,
    isLoading,
    creatorProfiles
  };
}
