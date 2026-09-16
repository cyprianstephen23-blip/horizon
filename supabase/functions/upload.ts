import { supabaseAdmin, requireCustomer } from "./supabase.ts";
import { errorResponse, handleOptions, jsonResponse } from "./cors.ts";

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return handleOptions();

    try {
        const { customer } = await requireCustomer(req);
        const filePath = `backups/${customer.database_id}.db.gz`;

        const { data: signed, error } = await supabaseAdmin
            .storage
            .from("backups")
            .createSignedUploadUrl(filePath, { upsert: true });

        if (error) return errorResponse(error.message, 500);

        return jsonResponse({
            success: true,
            upload_url: signed.signedUrl,
            token: signed.token,
            file_path: filePath,
            database_id: customer.database_id,
        });
    } catch (err) {
        return errorResponse((err as Error).message, 401);
    }
});