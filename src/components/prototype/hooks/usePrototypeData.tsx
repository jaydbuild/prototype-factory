
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Prototype } from "@/types/prototype";

export function usePrototypeData(
  sortBy: string, 
  searchTerm: string,
  selectedCollection: string | null
) {
  const { toast } = useToast();

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

  // Query for prototypes
  const { data: prototypes = [], isLoading } = useQuery({
    queryKey: ['prototypes', sortBy, searchTerm, selectedCollection, prototypeCollections],
    queryFn: async () => {
      try {
        let query = supabase
          .from('prototypes')
          .select('*');

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

          return {
            id: item.id,
            name: item.name,
            created_at: item.created_at,
            created_by: item.created_by,
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
    isLoading
  };
}
