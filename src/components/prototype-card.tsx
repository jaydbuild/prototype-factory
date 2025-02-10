
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { MessageCircle, Link as LinkIcon, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PrototypeCardProps {
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
  title,
  previewUrl,
  sourceUrl,
  timestamp,
  commentCount,
  previewTitle,
  previewDescription,
  previewImage,
}: PrototypeCardProps) => {
  const handleCardClick = () => {
    window.open(sourceUrl, '_blank');
  };

  return (
    <Card
      className="group overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer animate-fade-in"
      onClick={handleCardClick}
    >
      <CardHeader className="p-0">
        <div className="relative aspect-video overflow-hidden bg-muted">
          {previewImage ? (
            <img 
              src={previewImage} 
              alt={previewTitle || title}
              className="w-full h-full object-cover"
            />
          ) : previewUrl ? (
            <iframe
              src={previewUrl}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <LinkIcon className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-2">
          <h3 className="font-medium text-lg line-clamp-1">
            {title}
          </h3>
          {previewTitle && previewTitle !== title && (
            <h4 className="text-sm text-muted-foreground line-clamp-1">
              {previewTitle}
            </h4>
          )}
          {previewDescription && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {previewDescription}
            </p>
          )}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 text-sm text-muted-foreground flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span>{formatDistanceToNow(timestamp, { addSuffix: true })}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <MessageCircle className="w-4 h-4" />
            <span>{commentCount}</span>
          </div>
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="hover:text-foreground transition-colors"
          >
            <LinkIcon className="w-4 h-4" />
          </a>
        </div>
      </CardFooter>
    </Card>
  );
};
