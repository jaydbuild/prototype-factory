import React from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Eye, Code, ThumbsUp, ArrowLeft, EyeOff } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface PreviewControlsProps {
  onViewModeChange: (mode: 'preview' | 'code') => void;
  viewMode: 'preview' | 'code';
  isFeedbackMode: boolean;
  onToggleFeedbackMode: () => void;
  showUI?: boolean;
  onToggleUI?: () => void;
}

export function PreviewControls({
  onViewModeChange,
  viewMode,
  isFeedbackMode,
  onToggleFeedbackMode,
  showUI = true,
  onToggleUI
}: PreviewControlsProps) {
  const { toast } = useToast();
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-2 p-1 rounded-lg backdrop-blur-sm bg-background/80 shadow-md">
      {/* Back button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => navigate(-1)}
        title="Back to dashboard"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
      </Button>
      
      {/* View mode toggle */}
      <Tabs 
        value={viewMode} 
        onValueChange={(value) => onViewModeChange(value as 'preview' | 'code')}
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
        </TabsList>
      </Tabs>

      {/* Hide/Unhide UI button */}
      {onToggleUI && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onToggleUI}
          title={showUI ? "Hide UI" : "Show UI"}
        >
          {showUI ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </Button>
      )}

      {/* Feedback button */}
      <Button
        variant="ghost"
        size="icon"
        className={`h-7 w-7 ${isFeedbackMode ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}`}
        onClick={onToggleFeedbackMode}
        title={isFeedbackMode ? "Exit feedback mode" : "Enter feedback mode"}
      >
        <MessageSquare className="h-3.5 w-3.5" />
      </Button>

      {/* Thumbs up button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
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
  );
}
