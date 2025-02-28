
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PreviewWindow } from "./PreviewWindow";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Eye, EyeOff, Share2, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";

export const PrototypeDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showUI, setShowUI] = useState(true);
  const [processingTimeout, setProcessingTimeout] = useState(false);

  const { 
    data: prototype, 
    isLoading, 
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['prototype', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prototypes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        toast({
          variant: "destructive",
          title: "Error fetching prototype",
          description: error.message
        });
        throw error;
      }

      return data;
    }
  });

  // Set up polling when prototype is in processing state
  useEffect(() => {
    if (prototype?.deployment_status === 'processing') {
      // Set up polling
      const intervalId = setInterval(() => {
        refetch();
      }, 5000);
      
      // Set up timeout after 60 seconds of processing
      const timeoutId = setTimeout(() => {
        setProcessingTimeout(true);
      }, 60000);
      
      return () => {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
      };
    } else {
      // Reset timeout if status changes
      setProcessingTimeout(false);
    }
  }, [prototype?.deployment_status, refetch]);

  const handleRefresh = () => {
    setProcessingTimeout(false);
    refetch();
  };

  const handleForceComplete = async () => {
    if (!id) return;
    
    try {
      // Force the prototype to be marked as deployed
      await supabase
        .from('prototypes')
        .update({
          deployment_status: 'deployed',
          status: 'deployed',
          processed_at: new Date().toISOString()
        })
        .eq('id', id);
      
      toast({
        title: "Status updated",
        description: "Prototype marked as deployed"
      });
      
      refetch();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error updating status",
        description: "Failed to update prototype status"
      });
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Prototype link copied to clipboard",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to copy link",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-foreground"></div>
          <p className="text-sm text-muted-foreground">Loading prototype...</p>
        </div>
      </div>
    );
  }

  if (!prototype) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-card p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-2">Prototype not found</h2>
          <p className="text-muted-foreground mb-4">The prototype you're looking for doesn't exist or has been deleted.</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 relative">
        {/* Preview */}
        <div className="absolute inset-0">
          {id && (
            <PreviewWindow 
              prototypeId={id}
              url={prototype.deployment_url}
              onShare={handleShare}
            />
          )}
        </div>

        {prototype.deployment_status === 'processing' && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <div className="bg-white rounded-lg p-6 shadow-lg max-w-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-8 w-8 text-primary animate-spin">
                  <RefreshCw className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-semibold">Deployment in progress...</h2>
              </div>
              <p className="text-muted-foreground mb-4">Your prototype is being prepared. This may take a moment.</p>
              
              {processingTimeout && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Taking longer than expected</p>
                    <p className="text-xs text-amber-700 mt-1">
                      The deployment is taking longer than usual. You can continue waiting or try to force complete the deployment.
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button onClick={handleRefresh} disabled={isRefetching}>
                  {isRefetching ? 'Checking...' : 'Check Status'}
                </Button>
                
                {processingTimeout && (
                  <Button variant="outline" onClick={handleForceComplete}>
                    Force Complete
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {prototype.deployment_status === 'failed' && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <div className="bg-white rounded-lg p-6 shadow-lg max-w-md">
              <h2 className="text-xl font-semibold text-destructive mb-2">Deployment Failed</h2>
              <p className="text-muted-foreground mb-4">
                There was an issue deploying your prototype. Please try uploading it again or force complete the deployment.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
                <Button onClick={handleRefresh} disabled={isRefetching}>
                  {isRefetching ? 'Checking...' : 'Check Again'}
                </Button>
                <Button variant="outline" onClick={handleForceComplete}>
                  Force Complete
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* UI Layer */}
        {showUI && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="flex justify-between items-center p-2 gap-2 shrink-0">
              <div className="flex items-center gap-2 pointer-events-auto">
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-background/80 backdrop-blur-sm hover:bg-background/90"
                  onClick={() => navigate(-1)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="bg-background/80 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <h1 className="text-2xl font-semibold">{prototype.name}</h1>
                </div>
              </div>

              <div className="flex items-center gap-2 pointer-events-auto">
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-background/80 backdrop-blur-sm hover:bg-background/90"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-background/80 backdrop-blur-sm hover:bg-background/90"
                  onClick={handleRefresh}
                  disabled={isRefetching}
                >
                  <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toggle UI Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-sm hover:bg-background/90"
        onClick={() => setShowUI(!showUI)}
      >
        {showUI ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  );
};
