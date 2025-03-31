
import { useNotifications, NotificationPreferences } from "@/hooks/use-notifications";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export function NotificationPreferences() {
  const { preferences, updatePreferences } = useNotifications();

  if (!preferences) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-5 w-10" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const handleToggleChange = (field: keyof NotificationPreferences) => {
    updatePreferences({
      [field]: !preferences[field],
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Notification Channels</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="in-app" className="flex-1 text-sm">In-app notifications</Label>
            <Switch 
              id="in-app" 
              checked={preferences.in_app_enabled} 
              onCheckedChange={() => handleToggleChange('in_app_enabled')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="email" className="flex-1 text-sm">Email notifications</Label>
            <Switch 
              id="email" 
              checked={preferences.email_enabled} 
              onCheckedChange={() => handleToggleChange('email_enabled')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="push" className="flex-1 text-sm">Push notifications</Label>
            <Switch 
              id="push" 
              checked={preferences.push_enabled} 
              onCheckedChange={() => handleToggleChange('push_enabled')}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium">Notification Types</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="comment-replies" className="flex-1 text-sm">Comment replies</Label>
            <Switch 
              id="comment-replies" 
              checked={preferences.comment_replies} 
              onCheckedChange={() => handleToggleChange('comment_replies')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="comment-resolved" className="flex-1 text-sm">Comment resolutions</Label>
            <Switch 
              id="comment-resolved" 
              checked={preferences.comment_resolved} 
              onCheckedChange={() => handleToggleChange('comment_resolved')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="prototype-comments" className="flex-1 text-sm">New prototype comments</Label>
            <Switch 
              id="prototype-comments" 
              checked={preferences.prototype_comments} 
              onCheckedChange={() => handleToggleChange('prototype_comments')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
