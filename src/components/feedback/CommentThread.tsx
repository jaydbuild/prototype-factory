import React, { useState } from 'react';
import { FeedbackPoint as FeedbackPointType, FeedbackUser } from '@/types/feedback';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageSquare, 
  AlertCircle, 
  Clock, 
  CheckCircle, 
  XCircle,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface CommentThreadProps {
  feedback: FeedbackPointType;
  onClose: (e: React.MouseEvent) => void;
  onUpdateStatus: (status: FeedbackPointType['status'], e?: React.MouseEvent) => void;
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
  const [replyContent, setReplyContent] = useState('');
  
  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusLabel = (status: FeedbackPointType['status']) => {
    switch (status) {
      case 'open': return { label: 'Open', icon: <AlertCircle className="h-4 w-4" />, color: 'bg-orange-100 text-orange-800' };
      case 'in_progress': return { label: 'In Progress', icon: <Clock className="h-4 w-4" />, color: 'bg-blue-100 text-blue-800' };
      case 'resolved': return { label: 'Resolved', icon: <CheckCircle className="h-4 w-4" />, color: 'bg-green-100 text-green-800' };
      case 'closed': return { label: 'Closed', icon: <XCircle className="h-4 w-4" />, color: 'bg-gray-100 text-gray-800' };
    }
  };

  const statusInfo = getStatusLabel(feedback.status);

  // Handle status update with explicit event stopping
  const handleStatusUpdate = (status: FeedbackPointType['status'], e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onUpdateStatus(status, e);
  };

  // Handle reply submission with explicit event stopping
  const handleSubmitReply = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (replyContent.trim()) {
      onAddReply(replyContent, e);
      setReplyContent('');
    }
  };

  // Handle close with explicit event stopping
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onClose(e);
  };

  // Handle textarea change with explicit event stopping
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    setReplyContent(e.target.value);
  };

  return (
    <Card className="w-80 shadow-lg" onClick={(e) => e.stopPropagation()}>
      <CardHeader className="p-3 flex flex-row items-start justify-between space-y-0">
        <div className="flex items-center space-x-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={creator?.avatar_url || undefined} />
            <AvatarFallback>{getInitials(creator?.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium leading-none">{creator?.name || 'Anonymous'}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(feedback.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
        <Badge 
          variant="outline" 
          className={`flex items-center gap-1 px-1.5 py-0.5 text-xs ${statusInfo.color}`}
          onClick={(e) => e.stopPropagation()}
        >
          {statusInfo.icon}
          <span>{statusInfo.label}</span>
        </Badge>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <p className="text-sm">{feedback.content}</p>
        
        <div className="flex flex-wrap gap-1 mt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 text-xs gap-1" 
            onClick={(e) => handleStatusUpdate('open', e)}
          >
            <AlertCircle className="h-3 w-3" />
            Open
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 text-xs gap-1" 
            onClick={(e) => handleStatusUpdate('in_progress', e)}
          >
            <Clock className="h-3 w-3" />
            In Progress
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 text-xs gap-1" 
            onClick={(e) => handleStatusUpdate('resolved', e)}
          >
            <CheckCircle className="h-3 w-3" />
            Resolved
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 text-xs gap-1" 
            onClick={(e) => handleStatusUpdate('closed', e)}
          >
            <XCircle className="h-3 w-3" />
            Closed
          </Button>
        </div>
      </CardContent>
      <CardFooter className="p-3 pt-0 flex flex-col items-stretch gap-2">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <ThumbsUp className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <ThumbsDown className="h-4 w-4" />
            </Button>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8" 
            onClick={handleClose}
          >
            Close
          </Button>
        </div>
        
        <div className="flex flex-col gap-2">
          <Textarea 
            placeholder="Add a reply..." 
            className="min-h-[60px] text-sm" 
            value={replyContent}
            onChange={handleTextareaChange}
            onClick={(e) => e.stopPropagation()}
          />
          <Button 
            size="sm" 
            onClick={handleSubmitReply}
            disabled={!replyContent.trim()}
          >
            Submit
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
