import { supabaseAdmin, requireCustomer } from "./supabase.ts";
import { errorResponse, handleOptions, jsonResponse } from "./cors.ts";

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return handleOptions();

    try {
        const { customer } = await requireCustomer(req);
        const { sha256 } = await req.json().catch(() => ({}));

        const fileName = `${customer.database_id}.db.gz`;
        const filePath = `backups/${fileName}`;

        const { data: list, error: listErr } = await supabaseAdmin
            .storage
            .from("backups")
            .list("backups", { search: fileName });

        if (listErr) return errorResponse(listErr.message, 500);
        const entry = list?.find((f) => f.name === fileName);
        if (!entry) return errorResponse("File not found in storage", 404);

        const size = (entry.metadata as { size?: number })?.size ?? 0;

        const { data: current } = await supabaseAdmin
            .from("customers_table_database")
            .select("version")
            .eq("database_id", customer.database_id)
            .single();

        const nextVersion = (current?.version ?? 0) + 1;

        await supabaseAdmin
            .from("customers_table_database")
            .update({
                file_path: filePath,
                file_size: size,
                file_hash: sha256 ?? null,
                version: nextVersion,
                last_update: new Date().toISOString(),
            })
            .eq("database_id", customer.database_id);

        return jsonResponse({ success: true, size, version: nextVersion });
    } catch (err) {
        return errorResponse((err as Error).message, 401);
    }
});