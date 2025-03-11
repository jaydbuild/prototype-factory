
import { format, parseISO } from "date-fns";
import { MessageSquare, Edit, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { PrototypeStatusBadge } from "./prototype-status-badge";
import { useState } from "react";
import { EditPrototypeDialog } from "./edit-prototype-dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Prototype } from "@/types/prototype";

interface PrototypeCardProps {
  prototype: Prototype;
  onSelect?: (prototype: Prototype) => void;
  isSelected?: boolean;
  collectionId?: string;
}

export function PrototypeCard({ prototype, onSelect, isSelected, collectionId }: PrototypeCardProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  
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

  return (
    <>
      <div className="group relative bg-card rounded-lg border shadow-sm hover:shadow-md transition-shadow">
        <Link 
          to={`/prototype/${prototype.id}${collectionId ? `?fromCollection=${collectionId}` : ''}`}
          className="block relative p-4"
        >
          <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity top-2 right-2 z-10">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowEditDialog(true);
              }}
              className="p-1.5 bg-background/80 backdrop-blur-sm rounded-full border shadow-sm hover:shadow-md"
            >
              <Edit className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="flex items-start justify-between gap-2 mb-4">
            <h3 className="font-semibold group-hover:underline">{prototype.name}</h3>
            {prototype.deployment_status && (
              <PrototypeStatusBadge status={prototype.deployment_status} />
            )}
          </div>
          
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <time dateTime={timestamp.toISOString()}>
              {format(timestamp, "MMM d, yyyy")}
            </time>
            {feedbackCount > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <MessageSquare className="w-4 h-4" />
                {feedbackCount}
              </div>
            )}
          </div>
          
          {prototype.deployment_url && prototype.deployment_status === 'deployed' && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(prototype.deployment_url, '_blank', 'noopener,noreferrer');
                }}
                className="flex items-center gap-1 text-primary hover:underline cursor-pointer text-sm"
              >
                View
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          )}
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
