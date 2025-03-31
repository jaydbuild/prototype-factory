
import { useNotifications, Notification } from "@/hooks/use-notifications";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function NotificationList() {
  const { notifications, isLoading, markAsRead } = useNotifications();

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.seen) {
      markAsRead(notification._id);
    }
  };

  const getNotificationIcon = (notification: Notification) => {
    if (notification.payload?.type === "comment_resolved") {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (notification.payload?.type === "comment_reply") {
      return <MessageSquare className="h-5 w-5 text-blue-500" />;
    } else {
      return <AlertCircle className="h-5 w-5 text-amber-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="p-3 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <div className="text-center p-6 text-muted-foreground">
        <p>No notifications yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[350px]">
      <div className="p-1">
        {notifications.map((notification) => (
          <Link
            key={notification._id}
            to={notification.cta?.data?.url || "#"}
            onClick={() => handleNotificationClick(notification)}
            className={cn(
              "flex items-start gap-3 p-3 rounded-md transition-colors hover:bg-accent",
              !notification.seen && "bg-accent/50"
            )}
          >
            {notification.payload?.actorAvatar ? (
              <Avatar className="h-9 w-9">
                <AvatarImage src={notification.payload.actorAvatar} alt={notification.payload.actorName || ""} />
                <AvatarFallback>
                  {notification.payload.actorName?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                {getNotificationIcon(notification)}
              </div>
            )}
            <div className="space-y-1 flex-1">
              <p className={cn("text-sm", !notification.seen && "font-medium")}>
                {notification.content}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(notification.createdAt), {
                  addSuffix: true,
                })}
              </p>
            </div>
            {!notification.seen && (
              <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0"></div>
            )}
          </Link>
        ))}
      </div>
    </ScrollArea>
  );
}
