
import { format } from "date-fns";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";

interface PrototypeCardProps {
  id: string;
  title: string;
  previewUrl: string | null;
  sourceUrl: string;
  timestamp: Date;
  commentCount: number;
  tags: string[];
  previewTitle?: string | null;
  previewDescription?: string | null;
  previewImage?: string | null;
}

export const PrototypeCard = ({
  id,
  title,
  previewUrl,
  sourceUrl,
  timestamp,
  commentCount,
  tags,
  previewTitle,
  previewDescription,
  previewImage,
}: PrototypeCardProps) => {
  return (
    <div className="group relative bg-card rounded-lg border shadow-sm hover:shadow-md transition-shadow">
      <Link to={`/prototype/${id}`} className="block">
        <div className="aspect-video w-full bg-muted rounded-t-lg overflow-hidden">
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
        </div>
        
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold group-hover:underline">{title}</h3>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MessageCircle className="w-4 h-4" />
              <span className="text-sm">{commentCount}</span>
            </div>
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
          
          <div className="mt-4 flex items-center justify-between text-sm">
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
          </div>
        </div>
      </Link>
    </div>
  );
};
