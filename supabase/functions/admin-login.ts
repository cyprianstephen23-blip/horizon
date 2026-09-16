import { supabaseClient, supabaseAdmin } from "./supabase.ts";
import { errorResponse, handleOptions, jsonResponse } from "./cors.ts";

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return handleOptions();

    try {
        const { email, password } = await req.json();
        if (!email || !password) return errorResponse("email and password required");

        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password,
        });
        if (error) return errorResponse(error.message, 401);

        const { data: admin } = await supabaseAdmin
            .from("admin_table")
            .select("id, username, email")
            .eq("id", data.user.id)
            .single();

        if (!admin) return errorResponse("Not an admin account", 403);

        await supabaseAdmin
            .from("admin_table")
            .update({ last_login: new Date().toISOString() })
            .eq("id", data.user.id);

        return jsonResponse({ success: true, session: data.session, admin });
    } catch (err) {
        return errorResponse((err as Error).message, 500);
    }
});