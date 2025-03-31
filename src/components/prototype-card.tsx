
import { format, parseISO } from "date-fns";
import { MessageSquare, Edit, ArrowUpRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { PrototypeStatusBadge } from "./prototype-status-badge";
import { useState } from "react";
import { EditPrototypeDialog } from "./edit-prototype-dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Prototype } from "@/types/prototype";
import { cn } from "@/lib/utils";
import { PrototypePreviewThumbnail } from "./prototype-preview-thumbnail";

interface PrototypeCardProps {
  prototype: Prototype;
  onSelect?: (prototype: Prototype) => void;
  isSelected?: boolean;
  collectionId?: string;
}

export function PrototypeCard({ prototype, onSelect, isSelected, collectionId }: PrototypeCardProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  
  const { data: feedbackCount = 0 } = useQuery({
    queryKey: ['prototype-feedback-count', prototype.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('prototype_feedback')
        .select('id', { count: 'exact' })
        .eq('prototype_id', prototype.id);
        
      if (error) throw error;
      return count || 0;
    }
  });

  if (!prototype) return null;
  
  const timestamp = prototype.created_at ? parseISO(prototype.created_at) : new Date();

  const handleSelectClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onSelect) {
      onSelect(prototype);
    }
  };

  return (
    <>
      <div 
        className={cn(
          "group relative bg-card rounded-lg border hover:shadow-md transition-all duration-200",
          "hover:border-primary/20",
          isSelected && "ring-2 ring-primary ring-offset-2"
        )}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <Link 
          to={`/prototype/${prototype.id}${collectionId ? `?fromCollection=${collectionId}` : ''}`}
          className="block relative"
        >
          {/* Preview Thumbnail */}
          <div className="relative w-full h-40 rounded-t-lg overflow-hidden">
            <PrototypePreviewThumbnail prototype={prototype} />
          </div>

          {/* Selection Check - Only visible when hovering or selected */}
          {onSelect && (isHovering || isSelected) && (
            <div 
              className={cn(
                "absolute top-3 right-3 z-20 p-1.5 rounded-full cursor-pointer transition-all duration-200",
                isSelected 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
              onClick={handleSelectClick}
            >
              <Check className="w-3 h-3" />
            </div>
          )}

          {/* Edit Button - Positioned in top-right when hovering */}
          {isHovering && (
            <div 
              className="absolute top-3 left-3 z-20 transition-opacity duration-200 opacity-100"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowEditDialog(true);
              }}
            >
              <button className="p-1.5 bg-card/90 backdrop-blur-sm rounded-full border shadow-sm hover:shadow-md transition-all">
                <Edit className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          )}

          {/* Main Card Content */}
          <div className="p-5 space-y-4">
            {/* Header Section */}
            <div className="flex items-start justify-between">
              <h3 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                {prototype.name}
              </h3>
              
              {/* Status Badge */}
              {prototype.deployment_status && (
                <div className="ml-2 flex-shrink-0">
                  <PrototypeStatusBadge status={prototype.deployment_status} />
                </div>
              )}
            </div>
            
            {/* Metadata Section */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <time dateTime={timestamp.toISOString()}>
                  {format(timestamp, "MMM d, yyyy")}
                </time>
                
                {feedbackCount > 0 && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-secondary/50 rounded-full">
                    <MessageSquare className="w-3 h-3" />
                    <span>{feedbackCount}</span>
                  </div>
                )}
              </div>
              
              {/* View Link */}
              {prototype.deployment_url && prototype.deployment_status === 'deployed' && (
                <div className="flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.open(prototype.deployment_url, '_blank', 'noopener,noreferrer');
                    }}
                    className="flex items-center gap-1 text-primary hover:underline transition-colors text-xs"
                  >
                    View
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </Link>
      </div>

      <EditPrototypeDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        prototype={prototype}
      />
    </>
  );
}
