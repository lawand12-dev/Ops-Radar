import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseClient } from "<npm>/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Save to Supabase
    const supabase = getServerSupabaseClient();
    
    const { data, error } = await supabase
      .from("coming_soon_signups")
      .insert({
        email: email.toLowerCase(),
        signed_up_at: new Date().toISOString(),
      })
      .select();

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }

    console.log("Coming soon signup saved:", email);

    return NextResponse.json(
      { success: true, message: "Email saved", data },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in coming-soon-signup:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
