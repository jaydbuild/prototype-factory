
import { Bell, BellDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NotificationList } from "./notification-list";
import { NotificationPreferences } from "./notification-preferences";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNotifications } from "@/hooks/use-notifications";

export function NotificationBell() {
  const { unreadCount, markAllAsRead } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          {unreadCount > 0 ? (
            <>
              <BellDot className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 flex items-center justify-center h-4 min-w-4 rounded-full bg-primary text-[10px] text-primary-foreground">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </>
          ) : (
            <Bell className="h-5 w-5" />
          )}
          <span className="sr-only">Toggle notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-2 flex items-center justify-between">
          <h4 className="font-medium text-sm">Notifications</h4>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-xs"
              onClick={() => markAllAsRead()}
            >
              Mark all as read
            </Button>
          )}
        </div>
        <Separator />
        <Tabs defaultValue="notifications">
          <div className="px-2 pt-2">
            <TabsList className="w-full">
              <TabsTrigger value="notifications" className="flex-1 text-xs">Notifications</TabsTrigger>
              <TabsTrigger value="preferences" className="flex-1 text-xs">Preferences</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="notifications" className="mt-0 max-h-[350px] overflow-y-auto">
            <NotificationList />
          </TabsContent>
          <TabsContent value="preferences" className="mt-0 p-3">
            <NotificationPreferences />
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
