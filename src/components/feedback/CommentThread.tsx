
import React from 'react';
import { FeedbackPoint, FeedbackStatus, FeedbackUser } from '@/types/feedback';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X, Check, Clock, AlertCircle, Smartphone, Tablet, Monitor } from 'lucide-react';
import { format } from 'date-fns';

interface CommentThreadProps {
  feedback: FeedbackPoint;
  onClose: (e: React.MouseEvent) => void;
  onUpdateStatus: (status: FeedbackStatus, e?: React.MouseEvent) => void;
  onAddReply: (content: string, e?: React.MouseEvent) => void;
  currentUser?: FeedbackUser;
  creator?: FeedbackUser;
}

export function CommentThread({
  feedback,
  onClose,
  onUpdateStatus,
  onAddReply,
  currentUser,
  creator
}: CommentThreadProps) {
  const [replyContent, setReplyContent] = React.useState('');
  
  const statusColors = {
    open: 'bg-blue-100 text-blue-800 border-blue-200',
    in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    resolved: 'bg-green-100 text-green-800 border-green-200',
    closed: 'bg-gray-100 text-gray-800 border-gray-200'
  };
  
  const statusTexts = {
    open: 'Open',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    closed: 'Closed'
  };
  
  const statusIcons = {
    open: <AlertCircle className="h-3.5 w-3.5 mr-1" />,
    in_progress: <Clock className="h-3.5 w-3.5 mr-1" />,
    resolved: <Check className="h-3.5 w-3.5 mr-1" />,
    closed: <X className="h-3.5 w-3.5 mr-1" />
  };

  const getDeviceIcon = (deviceType?: string) => {
    switch(deviceType) {
      case 'mobile':
        return <Smartphone className="h-3.5 w-3.5 mr-1" />;
      case 'tablet':
        return <Tablet className="h-3.5 w-3.5 mr-1" />;
      case 'desktop':
      default:
        return <Monitor className="h-3.5 w-3.5 mr-1" />;
    }
  };

  return (
    <Card className="w-80 max-w-md shadow-lg z-50">
      <CardHeader className="px-3 py-2 flex flex-row items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={creator?.avatar_url || ''} />
            <AvatarFallback>{creator?.name?.charAt(0) || '?'}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{creator?.name || 'Anonymous'}</span>
        </div>
        <div className="flex items-center gap-1">
          <Badge 
            className={`text-xs px-1.5 py-0 h-5 ${statusColors[feedback.status]} flex items-center`}
            variant="outline"
          >
            {statusIcons[feedback.status]}
            {statusTexts[feedback.status]}
          </Badge>
          {feedback.device_type && (
            <Badge
              className="text-xs px-1.5 py-0 h-5 bg-gray-100 text-gray-800 border-gray-200 ml-1 flex items-center"
              variant="outline"
            >
              {getDeviceIcon(feedback.device_type)}
              {feedback.device_type.charAt(0).toUpperCase() + feedback.device_type.slice(1)}
            </Badge>
          )}
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-6 w-6 ml-1 rounded-full"
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <div className="text-sm mb-3 whitespace-pre-wrap">
          {feedback.content}
        </div>
        <div className="text-xs text-muted-foreground">
          {format(new Date(feedback.created_at), 'MMM d, yyyy h:mm a')}
        </div>
        {/* Additional replies would go here */}
      </CardContent>
      <CardFooter className="px-3 pt-0 pb-3 flex-col gap-2">
        <Textarea
          placeholder="Add a reply..."
          value={replyContent}
          onChange={(e) => setReplyContent(e.target.value)}
          className="min-h-[60px] text-sm"
        />
        <div className="flex justify-between w-full">
          <div className="flex gap-1">
            <Button 
              size="sm" 
              variant={feedback.status === 'in_progress' ? 'default' : 'outline'} 
              className="h-7 px-2 text-xs"
              onClick={(e) => onUpdateStatus('in_progress', e)}
            >
              <Clock className="h-3 w-3 mr-1" />
              In Progress
            </Button>
            <Button 
              size="sm" 
              variant={feedback.status === 'resolved' ? 'default' : 'outline'} 
              className="h-7 px-2 text-xs"
              onClick={(e) => onUpdateStatus('resolved', e)}
            >
              <Check className="h-3 w-3 mr-1" />
              Resolve
            </Button>
          </div>
          <Button 
            size="sm" 
            className="h-7 px-2 text-xs"
            disabled={!replyContent.trim()}
            onClick={(e) => {
              if (replyContent.trim()) {
                onAddReply(replyContent, e);
                setReplyContent('');
              }
            }}
          >
            Reply
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
