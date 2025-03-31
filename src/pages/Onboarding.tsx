
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { useSupabase } from "@/lib/supabase-provider";
import { ProfileUpdateForm } from "@/components/profile/profile-update-form";

export default function Onboarding() {
  const { session } = useSupabase();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [profileComplete, setProfileComplete] = useState(false);
  
  useEffect(() => {
    const checkProfileCompletion = async () => {
      if (!session?.user) {
        navigate('/auth');
        return;
      }

      try {
        // Check if user profile is complete (has a name)
        const { data, error } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', session.user.id)
          .single();

        if (error) throw error;
        
        if (data?.name) {
          // Profile has a name, consider it complete
          setProfileComplete(true);
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Error checking profile completion:', error);
        toast({
          title: "Error",
          description: "Failed to check profile status",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkProfileCompletion();
  }, [session, navigate, toast]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-foreground"></div>
          <p className="text-sm text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Complete Your Profile</CardTitle>
          <CardDescription>
            Please provide some information to complete your profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileUpdateForm onComplete={() => navigate('/dashboard')} />
        </CardContent>
      </Card>
    </div>
  );
}
