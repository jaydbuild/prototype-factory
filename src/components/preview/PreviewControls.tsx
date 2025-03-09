
import React from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Eye, Code, SplitSquareHorizontal, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface PreviewControlsProps {
  onViewModeChange: (mode: 'preview' | 'code' | 'split') => void;
  viewMode: 'preview' | 'code' | 'split';
  isFeedbackMode: boolean;
  onToggleFeedbackMode: () => void;
  onShareClick: () => void;
}

export function PreviewControls({
  onViewModeChange,
  viewMode,
  isFeedbackMode,
  onToggleFeedbackMode,
  onShareClick
}: PreviewControlsProps) {
  const { toast } = useToast();

  return (
    <div className="flex items-center gap-2 p-1 rounded-lg backdrop-blur-sm bg-background/80">
      <Tabs 
        value={viewMode} 
        onValueChange={(value) => onViewModeChange(value as 'preview' | 'code' | 'split')}
        className="w-auto"
      >
        <TabsList className="h-8">
          <TabsTrigger value="preview" className="flex items-center gap-1 px-2 h-7">
            <Eye className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Preview</span>
          </TabsTrigger>
          <TabsTrigger value="code" className="flex items-center gap-1 px-2 h-7">
            <Code className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Code</span>
          </TabsTrigger>
          <TabsTrigger value="split" className="flex items-center gap-1 px-2 h-7">
            <SplitSquareHorizontal className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Split</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex items-center h-8 border rounded-md border-input">
        <Button
          variant="ghost"
          size="icon"
          className={`h-7 w-7 rounded-r-none ${isFeedbackMode ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}`}
          onClick={onToggleFeedbackMode}
          title="Toggle feedback mode"
        >
          <MessageSquare className="h-3.5 w-3.5" />
        </Button>

        <div className="h-full w-px bg-input"></div>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-l-none"
          onClick={() => {
            toast({
              title: "Feedback sent",
              description: "Thanks for your positive feedback!"
            });
          }}
          title="Send positive feedback"
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
