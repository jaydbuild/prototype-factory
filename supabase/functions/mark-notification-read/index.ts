
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Novu } from "npm:@novu/node";

// Set up CORS headers for the API
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Novu with the API key
const novu = new Novu(Deno.env.get("NOVU_API_KEY") || "");

serve(async (req) => {
  // Handle CORS for preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { notificationId, userId } = await req.json();
    
    if (!notificationId || !userId) {
      throw new Error("Notification ID and User ID are required");
    }

    // Mark notification as read
    const result = await novu.subscribers.markMessageSeen(userId, notificationId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in mark-notification-read function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
