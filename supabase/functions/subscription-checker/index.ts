import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

serve(async (req) => {
  // 1. Initialize Supabase Admin Client
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 2. Calculate the exact dates for "Today" and "In 3 Days"
  const today = new Date();
  const inThreeDays = new Date();
  inThreeDays.setDate(today.getDate() + 3);

  // Format as YYYY-MM-DD to match the database cleanly
  const todayStr = today.toISOString().split("T")[0];
  const threeDaysStr = inThreeDays.toISOString().split("T")[0];

  // 3. Fetch all active merchants
  const { data: merchants, error } = await supabase
    .from("merchants")
    .select("*")
    .eq("status", "active");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const notifications = [];

  // 4. Check each merchant's expiration date
  for (const merchant of merchants) {
    if (!merchant.subscription_end_date) continue;

    const endDateStr = new Date(merchant.subscription_end_date).toISOString().split("T")[0];
    
    // Check if it expires in exactly 3 days
    if (endDateStr === threeDaysStr) {
      notifications.push({
        merchant: merchant.business_name,
        phone: merchant.phone_number,
        type: "warning",
        message: `Hello ${merchant.business_name}, your Crudhub subscription expires in 3 days. Please renew to keep your store online. (Monthly: ₦1,400 | Yearly: ₦13,440)`
      });
    } 
    // Check if it expires TODAY
    else if (endDateStr === todayStr) {
      notifications.push({
        merchant: merchant.business_name,
        phone: merchant.phone_number,
        type: "expired",
        message: `Hello ${merchant.business_name}, your Crudhub subscription expires TODAY. Please renew immediately to avoid your storefront going offline. (Monthly: ₦1,400 | Yearly: ₦13,440)`
      });
    }
  }

  // 5. PROCESS NOTIFICATIONS
  // Note: This is where you connect your WhatsApp API (like UltraMsg, Twilio, or Meta API)
  // For now, the robot will log them perfectly so you can verify it works.
  console.log("CRON JOB RUNNING - Notifications to send:", notifications);

  return new Response(
    JSON.stringify({ 
      success: true, 
      notifications_sent: notifications.length,
      details: notifications 
    }), 
    { headers: { "Content-Type": "application/json" } }
  );
});
