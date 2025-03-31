
import { Bell } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { NotificationList } from "./notification-list";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function NotificationBell() {
  const { unreadCount, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && unreadCount > 0) {
      // Mark all as read when opening the notification list
      markAllAsRead();
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 rounded-full hover:bg-accent transition-colors"
          aria-label="Notifications"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px]"
              variant="destructive"
            >
              {unreadCount}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <NotificationList onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
