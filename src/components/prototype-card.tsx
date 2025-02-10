
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { MessageCircle, Link as LinkIcon, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PrototypeCardProps {
  title: string;
  previewUrl: string;
  sourceUrl: string;
  timestamp: Date;
  commentCount: number;
  tags: string[];
  onClick: () => void;
}

export const PrototypeCard = ({
  title,
  previewUrl,
  sourceUrl,
  timestamp,
  commentCount,
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
          <iframe
            src={previewUrl}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
            loading="lazy"
          />
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-medium text-lg line-clamp-1">{title}</h3>
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
