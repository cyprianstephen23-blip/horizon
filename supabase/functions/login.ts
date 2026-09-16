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

        const { data: customer } = await supabaseAdmin
            .from("customers_table")
            .select("id, username, database_id, status")
            .eq("id", data.user.id)
            .single();

        if (!customer) return errorResponse("Not a customer account", 403);
        if (customer.status !== "active") return errorResponse("Account suspended", 403);

        await supabaseAdmin
            .from("customers_table")
            .update({ last_login: new Date().toISOString() })
            .eq("id", data.user.id);

        return jsonResponse({ success: true, session: data.session, user: customer });
    } catch (err) {
        return errorResponse((err as Error).message, 500);
    }
});