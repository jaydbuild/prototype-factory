import { format, parseISO } from "date-fns";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { PrototypeStatusBadge } from "./prototype-status-badge";

interface PrototypeCardProps {
  prototype: {
    id: string;
    name: string;
    type: 'link' | 'file';
    url?: string;
    file_path?: string;
    preview_url?: string;
    deployment_status: 'pending' | 'deployed' | 'failed';
    deployment_url?: string;
    created_at: string;
  };
}

export const PrototypeCard = ({ prototype }: PrototypeCardProps) => {
  const timestamp = parseISO(prototype.created_at);

  return (
    <div className="group relative bg-card rounded-lg border shadow-sm hover:shadow-md transition-shadow">
      <Link to={`/prototype/${prototype.id}`} className="block">
        <div className="aspect-video w-full bg-muted rounded-t-lg overflow-hidden relative">
          {prototype.preview_url ? (
            <img
              src={prototype.preview_url}
              alt={prototype.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <span className="text-muted-foreground">No preview available</span>
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
            {prototype.type === 'link' ? (
              <span
                className="px-2 py-1 bg-secondary rounded-full text-xs"
              >
                Link
              </span>
            ) : (
              <span
                className="px-2 py-1 bg-secondary rounded-full text-xs"
              >
                File
              </span>
            )}
          </div>
          
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <time dateTime={timestamp.toISOString()}>
              {format(timestamp, "MMM d, yyyy")}
            </time>
            {prototype.url && (
              <a
                href={prototype.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                View Source
                <ArrowUpRight className="w-4 h-4" />
              </a>
            )}
            {prototype.deployment_url && (
              <a
                href={prototype.deployment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center hover:text-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                View Live <ArrowUpRight className="ml-1 h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
};
