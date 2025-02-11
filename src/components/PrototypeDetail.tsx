import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PreviewIframe } from "./PreviewIframe";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Eye, EyeOff, Share2 } from "lucide-react";
import { Button } from "./ui/button";
import { CommentOverlay } from "./CommentOverlay";

export const PrototypeDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showUI, setShowUI] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("preview");

  const { data: prototype, isLoading } = useQuery({
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

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === "comments") {
      toast({
        description: "Click and drag to highlight an area for commenting",
      });
    }
  };

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
    <div className="fixed inset-0 overflow-hidden">
      <div className="absolute inset-0 z-10">
        <PreviewIframe 
          url={prototype.preview_url || prototype.url}
          title={prototype.name}
        />
      </div>

      <Tabs 
        value={activeTab} 
        onValueChange={handleTabChange} 
        className="relative h-full"
      >
        {showUI && (
          <>
            <div className="absolute top-0 left-0 right-0 z-30 flex justify-between items-center p-2 gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-background/80 backdrop-blur-sm hover:bg-background/90"
                  onClick={() => navigate('/')}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="bg-background/80 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <h1 className="text-2xl font-semibold">{prototype.name}</h1>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-background/80 backdrop-blur-sm hover:bg-background/90"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                <TabsList className="bg-background/80 backdrop-blur-sm px-2 rounded-lg">
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="comments">Comments</TabsTrigger>
                </TabsList>
              </div>
            </div>

            <div className="absolute inset-0 z-20">
              {id && <CommentOverlay prototypeId={id} isCommentMode={activeTab === "comments"} />}
            </div>

            <TabsContent 
              value="comments"
              className="absolute top-16 right-2 z-30 w-96 max-h-[calc(100vh-5rem)] bg-background/80 backdrop-blur-sm rounded-lg shadow-lg transform transition-transform m-0"
            />
          </>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="absolute bottom-4 right-4 z-30 bg-background/80 backdrop-blur-sm hover:bg-background/90"
          onClick={() => setShowUI(!showUI)}
        >
          {showUI ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </Tabs>
    </div>
  );
};
