import React, { useEffect, useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { formatDistanceToNow } from 'date-fns';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, History as VersionIcon, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PrototypeVersion } from '@/lib/version-control';
import { useToast } from '@/hooks/use-toast';

interface VersionSelectorProps {
  prototypeId: string;
  currentVersionId?: string;
  onVersionSelect: (versionId: string, previewUrl: string, version: PrototypeVersion) => void;
  onAddVersion?: () => void;
  isInternalTester: boolean;
}

export function VersionSelector({
  prototypeId,
  currentVersionId,
  onVersionSelect,
  onAddVersion,
  isInternalTester
}: VersionSelectorProps) {
  const [versions, setVersions] = useState<PrototypeVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabaseClient = useSupabaseClient();
  const { toast } = useToast();
  
  // Format the relative date (e.g., "2 days ago")
  const formatRelativeDate = (date: Date): string => {
    try {
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      return 'Unknown date';
    }
  };
  
  // Format status for display
  const formatStatus = (status: string): string => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };
  
  // Selected version label for the dropdown button
  const selectedVersionLabel = React.useMemo(() => {
    if (isLoading) return 'Loading...';
    if (error) return 'Error';
    if (versions.length === 0) return 'No versions';
    
    const selectedVersion = versions.find(v => v.id === currentVersionId);
    if (!selectedVersion) {
      return 'Latest';
    }
    
    return `v${selectedVersion.version_number}`;
  }, [currentVersionId, versions, isLoading, error]);
  
  // Fetch versions from Supabase
  useEffect(() => {
    const fetchVersions = async () => {
      try {
        setIsLoading(true);
        
        const { data, error } = await supabaseClient
          .from('prototype_versions')
          .select('*')
          .eq('prototype_id', prototypeId)
          .order('version_number', { ascending: false });
          
        if (error) {
          throw error;
        }
        
        setVersions(data || []);
      } catch (err: any) {
        console.error('Error fetching versions:', err);
        setError(err);
        toast({
          title: 'Error',
          description: 'Failed to load version history',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchVersions();
  }, [prototypeId, supabaseClient, toast]);
  
  // Handle version selection
  const handleVersionSelect = (version: PrototypeVersion) => {
    if (version.status !== 'ready') {
      // Don't allow selecting non-ready versions
      return;
    }
    
    // Persist the selection in localStorage
    localStorage.setItem(`prototype_version_${prototypeId}`, version.id);
    
    // Call the selection callback with the version data
    onVersionSelect(version.id, version.preview_url, version);
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-2"
          data-testid="version-selector"
        >
          <VersionIcon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">
            {selectedVersionLabel}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 max-h-72 overflow-auto">
        <DropdownMenuLabel>Version History</DropdownMenuLabel>
        {isLoading ? (
          <DropdownMenuItem disabled className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
          </DropdownMenuItem>
        ) : error ? (
          <DropdownMenuItem disabled className="flex justify-center py-4 text-red-500">
            Error loading versions
          </DropdownMenuItem>
        ) : versions.length === 0 ? (
          <DropdownMenuItem disabled className="flex justify-center py-4">
            No versions available
          </DropdownMenuItem>
        ) : (
          <div>
            {versions.map(version => (
              <DropdownMenuItem
                key={version.id}
                className="flex items-center justify-between py-2"
                onClick={() => handleVersionSelect(version)}
                disabled={version.status !== 'ready'}
                data-state={currentVersionId === version.id ? 'checked' : undefined}
                data-testid="version-item"
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    {currentVersionId === version.id && (
                      <Check className="h-3 w-3 text-primary" />
                    )}
                    <span className="font-medium">
                      v{version.version_number}{version.title ? ` - ${version.title}` : ''}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeDate(new Date(version.created_at))}
                  </span>
                </div>
                <div className="flex items-center">
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs",
                      version.status === 'ready' ? "bg-green-500 text-white" : "",
                      version.status === 'processing' ? "bg-yellow-500 text-white" : "",
                      version.status === 'failed' ? "bg-red-500 text-white" : ""
                    )}
                    data-testid="status-badge"
                  >
                    {formatStatus(version.status)}
                  </Badge>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
        <DropdownMenuSeparator />
        {isInternalTester && onAddVersion && (
          <DropdownMenuItem 
            onClick={onAddVersion}
            className="flex items-center gap-2"
            data-testid="add-version-item"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Version</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
