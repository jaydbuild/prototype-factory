
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Novu } from "npm:@novu/node";

// Set up CORS headers for the API
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Novu with the API key
const novu = new Novu(Deno.env.get("NOVU_API_KEY") || "");
const applicationIdentifier = "pGu4iA9YYPiQ";

interface NotificationRequest {
  // The user ID of the recipient (subscriber)
  recipientUserId: string;
  // The type of notification (comment, reply, resolve)
  type: "new_comment" | "comment_reply" | "comment_resolved";
  // The user who triggered the notification
  actorUserId: string;
  // Additional data for the notification
  payload: {
    prototypeId?: string;
    prototypeName?: string;
    commentId?: string;
    commentContent?: string;
    [key: string]: any;
  };
}

// Check if the user has enabled notifications of this type
async function checkNotificationPreferences(
  supabase: any,
  userId: string,
  notificationType: string
): Promise<{ inApp: boolean; email: boolean; push: boolean }> {
  try {
    const { data, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error fetching notification preferences:", error);
      return { inApp: true, email: true, push: false };
    }

    if (!data) {
      return { inApp: true, email: true, push: false };
    }

    return {
      inApp: data.in_app_enabled && data[notificationType],
      email: data.email_enabled && data[notificationType],
      push: data.push_enabled && data[notificationType],
    };
  } catch (err) {
    console.error("Error checking notification preferences:", err);
    return { inApp: true, email: true, push: false };
  }
}

async function getUserProfile(supabase: any, userId: string) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("name, avatar_url")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching user profile:", error);
      return { name: "User", avatar_url: null };
    }

    return { name: data.name || "User", avatar_url: data.avatar_url };
  } catch (err) {
    console.error("Error fetching user profile:", err);
    return { name: "User", avatar_url: null };
  }
}

// Handle subscriber creation/update
async function ensureSubscriber(userId: string, supabase: any) {
  try {
    const userProfile = await getUserProfile(supabase, userId);
    
    // Create or update the subscriber in Novu
    await novu.subscribers.identify(userId, {
      firstName: userProfile.name,
      avatar: userProfile.avatar_url,
    });
    
    return true;
  } catch (error) {
    console.error("Error ensuring subscriber:", error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS for preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipientUserId, type, actorUserId, payload } = await req.json() as NotificationRequest;
    
    // Create Supabase client (we need to create it here as it's in the edge function context)
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://lilukmlnbrzyjrksteay.supabase.co";
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbHVrbWxuYnJ6eWpya3N0ZWF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2NTIwMzAsImV4cCI6MjA1NDIyODAzMH0.HP3oMkQ8RFFzRiklzOBrxcQ-PzX9HTlICqC5FkHNR6M";
    
    const { createClient } = await import("npm:@supabase/supabase-js");
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Check if the user has enabled notifications for this type
    const notificationKey = type === "new_comment" 
      ? "prototype_comments" 
      : type === "comment_reply" 
        ? "comment_replies" 
        : "comment_resolved";
    
    const preferences = await checkNotificationPreferences(supabase, recipientUserId, notificationKey);
    
    if (!preferences.inApp && !preferences.email && !preferences.push) {
      return new Response(JSON.stringify({ message: "Notifications disabled for this type" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure both recipient and actor are subscribers in Novu
    await ensureSubscriber(recipientUserId, supabase);
    await ensureSubscriber(actorUserId, supabase);
    
    // Get actor profile for notification content
    const actorProfile = await getUserProfile(supabase, actorUserId);
    
    // Construct the notification
    let notificationTitle = "";
    let notificationContent = "";
    let notificationUrl = "";
    
    if (type === "new_comment") {
      notificationTitle = "New comment on your prototype";
      notificationContent = `${actorProfile.name} commented on your prototype "${payload.prototypeName}"`;
      notificationUrl = `/prototype/${payload.prototypeId}`;
    } else if (type === "comment_reply") {
      notificationTitle = "New reply to your comment";
      notificationContent = `${actorProfile.name} replied to your comment`;
      notificationUrl = `/prototype/${payload.prototypeId}`;
    } else if (type === "comment_resolved") {
      notificationTitle = "Your comment was resolved";
      notificationContent = `${actorProfile.name} resolved your comment`;
      notificationUrl = `/prototype/${payload.prototypeId}`;
    }
    
    // Determine which channels to use
    const channels = [];
    if (preferences.inApp) channels.push("in_app");
    if (preferences.email) channels.push("email");
    if (preferences.push) channels.push("push");
    
    // Send the notification via Novu
    const result = await novu.trigger(type, {
      to: {
        subscriberId: recipientUserId,
      },
      payload: {
        ...payload,
        actorName: actorProfile.name,
        actorAvatar: actorProfile.avatar_url,
        title: notificationTitle,
        content: notificationContent,
        url: notificationUrl,
      },
    });

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in send-notification function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
