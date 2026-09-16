import { supabaseAdmin, requireAdmin } from "./supabase.ts";
import { errorResponse, handleOptions, jsonResponse } from "./cors.ts";

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return handleOptions();

    try {
        await requireAdmin(req);

        const { data, error } = await supabaseAdmin
            .from("customers_table")
            .select("id, username, email, database_id, status, created_at, last_login")
            .order("created_at", { ascending: false });

        if (error) return errorResponse(error.message, 500);

        return jsonResponse({ success: true, customers: data });
    } catch (err) {
        return errorResponse((err as Error).message, 401);
    }
});