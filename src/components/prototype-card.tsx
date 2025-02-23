import { format } from "date-fns";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { PrototypeStatusBadge } from "./prototype-status-badge";

interface PrototypeCardProps {
  id: string;
  title: string;
  previewUrl: string | null;
  sourceUrl: string;
  timestamp: Date;
  tags: string[];
  previewTitle?: string | null;
  previewDescription?: string | null;
  previewImage?: string | null;
  deploymentStatus?: 'pending' | 'deployed' | 'failed' | null;
  deploymentUrl?: string | null;
}

export const PrototypeCard = ({
  id,
  title,
  previewUrl,
  sourceUrl,
  timestamp,
  tags,
  previewTitle,
  previewDescription,
  previewImage,
  deploymentStatus,
  deploymentUrl,
}: PrototypeCardProps) => {
  return (
    <div className="group relative bg-card rounded-lg border shadow-sm hover:shadow-md transition-shadow">
      <Link to={`/prototype/${id}`} className="block">
        <div className="aspect-video w-full bg-muted rounded-t-lg overflow-hidden relative">
          {previewImage ? (
            <img
              src={previewImage}
              alt={previewTitle || title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <span className="text-muted-foreground">No preview available</span>
            </div>
          )}
          {deploymentStatus && (
            <div className="absolute top-2 right-2">
              <PrototypeStatusBadge status={deploymentStatus} />
            </div>
          )}
        </div>
        
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold group-hover:underline">{title}</h3>
          </div>
          
          {previewDescription && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {previewDescription}
            </p>
          )}
          
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-secondary rounded-full text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
          
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <time dateTime={timestamp.toISOString()}>
              {format(timestamp, "MMM d, yyyy")}
            </time>
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              View Source
              <ArrowUpRight className="w-4 h-4" />
            </a>
            {deploymentUrl && (
              <a
                href={deploymentUrl}
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
