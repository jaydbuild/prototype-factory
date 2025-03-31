
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
    const { userId } = await req.json();
    
    if (!userId) {
      throw new Error("User ID is required");
    }

    // Get subscriber's notifications from Novu
    const result = await novu.subscribers.getNotificationsFeed(userId, {
      page: 0,
      limit: 10,
    });

    return new Response(JSON.stringify({ 
      notifications: result.data?.data || [],
      totalCount: result.data?.totalCount || 0,
      pageSize: result.data?.pageSize || 10,
      page: result.data?.page || 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in get-notifications function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
