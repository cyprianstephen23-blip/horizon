import { supabaseAdmin, requireCustomer } from "./supabase.ts";
import { errorResponse, handleOptions, jsonResponse } from "./cors.ts";

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return handleOptions();

    try {
        const { customer } = await requireCustomer(req);

        const { data: dbRow, error: dbErr } = await supabaseAdmin
            .from("customers_table_database")
            .select("*")
            .eq("database_id", customer.database_id)
            .single();

        if (dbErr || !dbRow || !dbRow.file_path) {
            return errorResponse("No backup found", 404);
        }

        const { data: signed, error } = await supabaseAdmin
            .storage
            .from("backups")
            .createSignedUrl(dbRow.file_path, 900);

        if (error) return errorResponse(error.message, 500);

        return jsonResponse({
            success: true,
            download_url: signed.signedUrl,
            file_name: `${customer.database_id}.db.gz`,
            size: dbRow.file_size,
            sha256: dbRow.file_hash,
            version: dbRow.version,
            last_update: dbRow.last_update,
            expires_in: 900,
        });
    } catch (err) {
        return errorResponse((err as Error).message, 401);
    }
});