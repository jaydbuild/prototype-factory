
import { useEffect, useState } from 'react';
import { useSupabase } from '@/lib/supabase-provider';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { UploadPrototypeDialog } from './upload-prototype-dialog';

// Update the Props interface to accept projectId
interface PrototypeGridProps {
  projectId?: string | null;
}

export function PrototypeGrid({ projectId }: PrototypeGridProps) {
  const [prototypes, setPrototypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const { supabase } = useSupabase();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Add projectId filter to the query when fetching prototypes
  useEffect(() => {
    const fetchPrototypes = async () => {
      try {
        setLoading(true);
        let query = supabase
          .from('prototypes')
          .select('*, profiles(name, avatar_url), tags(*)')
          .order('created_at', { ascending: false });
          
        // Filter by project if projectId is provided
        if (projectId) {
          query = query.eq('project_id', projectId);
        }
          
        const { data, error } = await query;
        
        if (error) {
          throw error;
        }

        if (data) {
          setPrototypes(data);
        }
      } catch (error) {
        console.error('Error fetching prototypes:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load prototypes. Please try refreshing the page.',
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchPrototypes();

    // Set up realtime subscription
    const channel = supabase
      .channel('prototypes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prototypes',
        },
        (payload) => {
          fetchPrototypes(); // Refetch all prototypes on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, supabase, toast]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="p-0">
              <Skeleton className="h-40 w-full rounded-none" />
            </CardHeader>
            <CardContent className="p-4">
              <Skeleton className="mb-2 h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
            </CardContent>
            <CardFooter className="flex justify-between p-4 pt-0">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-20" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          {projectId ? 'Project Prototypes' : 'All Prototypes'}
        </h2>
        <Button onClick={() => setIsUploadDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Prototype
        </Button>
      </div>
      
      {prototypes.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
            <h3 className="mt-4 text-lg font-semibold">No prototypes found</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground">
              You haven't created any prototypes yet. Get started by creating your first prototype.
            </p>
            <Button onClick={() => setIsUploadDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Prototype
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {prototypes.map((prototype) => (
            <Card key={prototype.id} className="overflow-hidden cursor-pointer" onClick={() => navigate(`/prototype/${prototype.id}`)}>
              <CardHeader className="p-0">
                {prototype.preview_image ? (
                  <img
                    src={prototype.preview_image}
                    alt={prototype.name}
                    className="aspect-video h-40 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-40 w-full items-center justify-center bg-muted">
                    <span className="text-sm text-muted-foreground">No preview available</span>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-4">
                <h3 className="font-semibold">{prototype.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(prototype.created_at), { addSuffix: true })}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {prototype.tags &&
                    prototype.tags.map((tag: any) => (
                      <Badge key={tag.id} variant="secondary" className="text-xs">
                        {tag.name}
                      </Badge>
                    ))}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between p-4 pt-0">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={prototype.profiles?.avatar_url} />
                    <AvatarFallback>
                      {prototype.profiles?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">
                    {prototype.profiles?.name || 'Unknown'}
                  </span>
                </div>
                <Button asChild size="sm" variant="ghost" onClick={(e) => {
                  e.stopPropagation(); // Prevent triggering the card click
                }}>
                  <a
                    href={prototype.deployment_url || prototype.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-1 h-3 w-3" />
                    View
                  </a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      <UploadPrototypeDialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen} />
    </div>
  );
}
