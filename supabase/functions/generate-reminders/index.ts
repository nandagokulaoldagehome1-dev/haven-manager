import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();

    console.log(`Running reminder generation for ${today.toISOString()}`);

    // Fetch all active residents
    const { data: residents, error: residentsError } = await supabase
      .from("residents")
      .select("id, full_name, date_of_birth")
      .eq("status", "active");

    if (residentsError) {
      console.error("Error fetching residents:", residentsError);
      throw residentsError;
    }

    console.log(`Found ${residents?.length || 0} active residents`);

    const remindersToCreate: any[] = [];

    // Process birthday reminders (30 days before)
    for (const resident of residents || []) {
      if (!resident.date_of_birth) continue;

      const dob = new Date(resident.date_of_birth);
      const birthMonth = dob.getMonth();
      const birthDay = dob.getDate();

      // Calculate this year's birthday
      let birthdayThisYear = new Date(currentYear, birthMonth, birthDay);
      
      // If birthday already passed this year, check next year's birthday
      if (birthdayThisYear < today) {
        birthdayThisYear = new Date(currentYear + 1, birthMonth, birthDay);
      }

      // Calculate days until birthday
      const daysUntilBirthday = Math.ceil(
        (birthdayThisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Create reminder if birthday is within 30 days
      if (daysUntilBirthday <= 30 && daysUntilBirthday > 0) {
        const birthdayYear = birthdayThisYear.getFullYear();
        const age = birthdayYear - dob.getFullYear();
        
        // Check if reminder already exists for this birthday
        const { data: existingReminder } = await supabase
          .from("reminders")
          .select("id")
          .eq("resident_id", resident.id)
          .eq("reminder_type", "birthday")
          .gte("due_date", `${birthdayYear}-01-01`)
          .lte("due_date", `${birthdayYear}-12-31`)
          .single();

        if (!existingReminder) {
          remindersToCreate.push({
            title: `${resident.full_name}'s Birthday`,
            description: `${resident.full_name} will turn ${age} years old`,
            reminder_type: "birthday",
            due_date: birthdayThisYear.toISOString().split("T")[0],
            resident_id: resident.id,
            status: "pending",
          });
          console.log(`Creating birthday reminder for ${resident.full_name}, turning ${age}`);
        }
      }
    }

    // Process payment reminders based on resident's initial payment date
    // Get all residents with their first payment date
    const { data: paymentData, error: paymentError } = await supabase
      .from("payments")
      .select("resident_id, payment_date")
      .order("payment_date", { ascending: true })
      .limit(1000);

    if (paymentError) {
      console.error("Error fetching payment data:", paymentError);
      throw paymentError;
    }

    // Group payments by resident and get their earliest payment date
    const residentPaymentDateMap = new Map<string, Date>();
    paymentData?.forEach(payment => {
      if (!residentPaymentDateMap.has(payment.resident_id)) {
        residentPaymentDateMap.set(payment.resident_id, new Date(payment.payment_date));
      }
    });

    // Generate reminders based on the payment day of the month
    for (const resident of residents || []) {
      const firstPaymentDate = residentPaymentDateMap.get(resident.id);
      
      if (!firstPaymentDate) {
        console.log(`No payment history found for resident ${resident.full_name}`);
        continue;
      }

      const paymentDayOfMonth = firstPaymentDate.getDate();
      const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const reminderDay = Math.min(paymentDayOfMonth, daysInCurrentMonth);

      // Check if today is the reminder day
      if (currentDay === reminderDay) {
        // Check if reminder already exists for this month
        const { data: existingPaymentReminder } = await supabase
          .from("reminders")
          .select("id")
          .eq("resident_id", resident.id)
          .eq("reminder_type", "payment")
          .gte("due_date", `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`)
          .lte("due_date", `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${daysInCurrentMonth}`)
          .single();

        if (!existingPaymentReminder) {
          const monthYear = `${today.toLocaleString("en-US", { month: "long" })} ${currentYear}`;
          remindersToCreate.push({
            title: `Payment Due - ${resident.full_name}`,
            description: `Monthly payment due for ${monthYear}. Based on payment cycle starting on ${paymentDayOfMonth}${['st', 'nd', 'rd'][((paymentDayOfMonth % 10) - 1)] || 'th'} of month.`,
            reminder_type: "payment",
            due_date: `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(reminderDay).padStart(2, "0")}`,
            resident_id: resident.id,
            status: "pending",
          });
          console.log(`Creating payment reminder for ${resident.full_name} on day ${reminderDay}`);
        }
      }
    }

    // Insert all reminders
    if (remindersToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from("reminders")
        .insert(remindersToCreate);

      if (insertError) {
        console.error("Error inserting reminders:", insertError);
        throw insertError;
      }
      console.log(`Successfully created ${remindersToCreate.length} reminders`);
    } else {
      console.log("No new reminders to create");
    }

    return new Response(
      JSON.stringify({
        success: true,
        remindersCreated: remindersToCreate.length,
        message: `Created ${remindersToCreate.length} reminders`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in generate-reminders function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
