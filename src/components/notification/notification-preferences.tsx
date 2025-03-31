
import { useNotifications } from "@/hooks/use-notifications";
import type { NotificationPreferences as NotificationPrefsType } from "@/hooks/use-notifications";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

export function NotificationPreferences() {
  const { preferences, updatePreferences } = useNotifications();

  if (!preferences) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  const handleToggleChange = (key: keyof NotificationPrefsType, value: boolean) => {
    updatePreferences({ [key]: value });
  };

  return (
    <ScrollArea className="h-[300px]">
      <div className="p-4 space-y-6">
        <div className="space-y-2">
          <h4 className="font-medium">Delivery Methods</h4>
          <p className="text-sm text-muted-foreground">
            Choose how you want to receive notifications
          </p>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">In-app notifications</Label>
              <p className="text-xs text-muted-foreground">
                Receive notifications within the application
              </p>
            </div>
            <Switch 
              checked={preferences.in_app_enabled} 
              onCheckedChange={(value) => handleToggleChange('in_app_enabled', value)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Email notifications</Label>
              <p className="text-xs text-muted-foreground">
                Receive notifications via email
              </p>
            </div>
            <Switch 
              checked={preferences.email_enabled} 
              onCheckedChange={(value) => handleToggleChange('email_enabled', value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Push notifications</Label>
              <p className="text-xs text-muted-foreground">
                Receive push notifications (coming soon)
              </p>
            </div>
            <Switch 
              checked={preferences.push_enabled} 
              onCheckedChange={(value) => handleToggleChange('push_enabled', value)}
              disabled={true}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-medium">Notification Types</h4>
          <p className="text-sm text-muted-foreground">
            Select which types of notifications you want to receive
          </p>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Prototype comments</Label>
              <p className="text-xs text-muted-foreground">
                When someone comments on your prototype
              </p>
            </div>
            <Switch 
              checked={preferences.prototype_comments} 
              onCheckedChange={(value) => handleToggleChange('prototype_comments', value)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Comment replies</Label>
              <p className="text-xs text-muted-foreground">
                When someone replies to your comment
              </p>
            </div>
            <Switch 
              checked={preferences.comment_replies} 
              onCheckedChange={(value) => handleToggleChange('comment_replies', value)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Resolved comments</Label>
              <p className="text-xs text-muted-foreground">
                When your comment is marked as resolved
              </p>
            </div>
            <Switch 
              checked={preferences.comment_resolved} 
              onCheckedChange={(value) => handleToggleChange('comment_resolved', value)}
            />
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
