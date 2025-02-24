import { format, parseISO } from "date-fns";
import { ArrowUpRight, FileUp } from "lucide-react";
import { Link } from "react-router-dom";
import { PrototypeStatusBadge } from "./prototype-status-badge";
import type { Prototype } from "@/types/prototype";

interface PrototypeCardProps {
  prototype: Prototype;
}

export const PrototypeCard = ({ prototype }: PrototypeCardProps) => {
  if (!prototype) return null;
  
  const timestamp = prototype.created_at ? parseISO(prototype.created_at) : new Date();
  const previewUrl = prototype.deployment_status === 'deployed' ? prototype.deployment_url : null;

  return (
    <div className="group relative bg-card rounded-lg border shadow-sm hover:shadow-md transition-shadow">
      <Link to={`/prototype/${prototype.id}`} className="block">
        <div className="aspect-video w-full bg-muted rounded-t-lg overflow-hidden relative">
          {prototype.preview_image ? (
            <img
              src={prototype.preview_image}
              alt={prototype.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <span className="text-muted-foreground">
                {prototype.deployment_status === 'pending' ? 'Processing...' : 'No preview available'}
              </span>
            </div>
          )}
          {prototype.deployment_status && (
            <div className="absolute top-2 right-2">
              <PrototypeStatusBadge status={prototype.deployment_status} />
            </div>
          )}
        </div>
        
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold group-hover:underline">{prototype.name}</h3>
          </div>
          
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            {prototype.file_path ? (
              <span
                className="px-2 py-1 bg-secondary rounded-full text-xs flex items-center gap-1"
              >
                <FileUp className="w-3 h-3" />
                Uploaded
              </span>
            ) : (
              <span
                className="px-2 py-1 bg-secondary rounded-full text-xs"
              >
                Link
              </span>
            )}
          </div>
          
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <time dateTime={timestamp.toISOString()}>
              {format(timestamp, "MMM d, yyyy")}
            </time>
            {previewUrl && prototype.deployment_status === 'deployed' && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                View
                <ArrowUpRight className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
};
