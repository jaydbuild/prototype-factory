import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PreviewIframe } from "./PreviewIframe";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Eye, EyeOff, Share2 } from "lucide-react";
import { Button } from "./ui/button";

export const PrototypeDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showUI, setShowUI] = useState(true);

  console.log('Attempting to fetch prototype with ID:', id);

  const { data: prototype, isLoading } = useQuery({
    queryKey: ['prototype', id],
    queryFn: async () => {
      console.log('Making Supabase query for ID:', id);
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

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!prototype) {
    return <div className="flex items-center justify-center min-h-screen">Prototype not found</div>;
  }

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

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 relative">
        {/* Preview */}
        <div className="absolute inset-0">
          {id && (
            <>
              {console.log('Preview URL:', prototype.preview_url, 'URL:', prototype.url)}
              <PreviewIframe 
                url={prototype.deployment_status === 'deployed' ? prototype.deployment_url : prototype.preview_url || prototype.url}
                title={prototype.name}
                prototypeId={id}
              />
            </>
          )}
        </div>

        {prototype.deployment_status === 'processing' && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <p className="text-lg">Deployment in progress...</p>
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
