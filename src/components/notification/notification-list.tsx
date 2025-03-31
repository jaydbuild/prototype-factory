
import { useNotifications, Notification } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { formatDistanceToNow } from "date-fns";
import { Settings, Bell, Inbox, AlertCircle } from "lucide-react";
import { NotificationPreferences } from "./notification-preferences";
import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface NotificationListProps {
  onClose?: () => void;
}

export function NotificationList({ onClose }: NotificationListProps) {
  const { notifications, isLoading, error, markAsRead } = useNotifications();
  const [activeTab, setActiveTab] = useState("notifications");

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.seen) {
      markAsRead(notification._id);
    }
    
    // Navigate to the notification target if available
    if (notification.cta?.data?.url) {
      window.location.href = notification.cta.data.url;
      if (onClose) onClose();
    }
  };

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className="w-full"
    >
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <h3 className="font-medium">Notifications</h3>
        <TabsList className="grid w-auto grid-cols-2">
          <TabsTrigger value="notifications">
            <Bell size={16} className="mr-1" />
            <span className="sr-only sm:not-sr-only sm:ml-1">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings size={16} className="mr-1" />
            <span className="sr-only sm:not-sr-only sm:ml-1">Settings</span>
          </TabsTrigger>
        </TabsList>
      </div>
      
      <TabsContent value="notifications" className="m-0">
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="h-5 w-5 border-t-2 border-b-2 border-primary rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <AlertCircle className="h-8 w-8 text-destructive mb-2" />
              <p className="text-sm font-medium text-destructive">Error fetching notifications</p>
              <p className="text-xs text-muted-foreground mt-1">Please try again later</p>
            </div>
          ) : notifications && notifications.length > 0 ? (
            <div className="flex flex-col">
              {notifications.map((notification) => (
                <button
                  key={notification._id}
                  className={`flex items-start p-3 gap-3 text-left hover:bg-accent/50 transition-colors ${
                    !notification.seen ? "bg-accent/20" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <ProfileAvatar
                    fallbackUrl={notification.payload.actorAvatar}
                    size="sm"
                    className="mt-0.5"
                    editable={false}
                  />
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium line-clamp-2">
                      {notification.title || notification.content}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {notification.content}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {!notification.seen && (
                    <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <Inbox className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          )}
        </ScrollArea>
      </TabsContent>
      
      <TabsContent value="settings" className="m-0">
        <NotificationPreferences />
      </TabsContent>
      
      <Separator />
      
      <div className="p-2 flex justify-end">
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    </Tabs>
  );
}
