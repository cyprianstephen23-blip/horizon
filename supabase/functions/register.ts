import { supabaseAdmin } from "./supabase.ts";
import { errorResponse, handleOptions, jsonResponse } from "./cors.ts";

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return handleOptions();

    try {
        const { email, password, username } = await req.json();
        if (!email || !password || !username) {
            return errorResponse("email, password, username required");
        }

        const { data: created, error: createErr } =
            await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { username },
            });

        if (createErr) return errorResponse(createErr.message);

        const { data: customer } = await supabaseAdmin
            .from("customers_table")
            .select("id, username, email, database_id")
            .eq("id", created.user.id)
            .single();

        return jsonResponse({ success: true, user: customer });
    } catch (err) {
        return errorResponse((err as Error).message, 500);
    }
});