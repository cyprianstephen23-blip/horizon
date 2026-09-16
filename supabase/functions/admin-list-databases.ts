import { supabaseAdmin, requireAdmin } from "./supabase.ts";
import { errorResponse, handleOptions, jsonResponse } from "./cors.ts";

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return handleOptions();

    try {
        await requireAdmin(req);

        const { data, error } = await supabaseAdmin
            .from("customers_table_database")
            .select(`
        database_id,
        owner_uid,
        file_path,
        file_size,
        file_hash,
        version,
        last_update,
        customers_table ( username, email )
      `)
            .order("last_update", { ascending: false });

        if (error) return errorResponse(error.message, 500);

        return jsonResponse({ success: true, databases: data });
    } catch (err) {
        return errorResponse((err as Error).message, 401);
    }
});