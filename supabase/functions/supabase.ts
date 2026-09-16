import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function getUser(req: Request) {
    const auth = req.headers.get("Authorization");
    if (!auth) return null;
    const token = auth.replace("Bearer ", "");
    const { data, error } = await supabaseClient.auth.getUser(token);
    return error ? null : data.user;
}

export async function requireCustomer(req: Request) {
    const user = await getUser(req);
    if (!user) throw new Error("Unauthorized");

    const { data, error } = await supabaseAdmin
        .from("customers_table")
        .select("*")
        .eq("id", user.id)
        .single();

    if (error || !data) throw new Error("Not a customer");
    if (data.status !== "active") throw new Error("Account suspended");
    return { user, customer: data };
}

export async function requireAdmin(req: Request) {
    const user = await getUser(req);
    if (!user) throw new Error("Unauthorized");

    const { data, error } = await supabaseAdmin
        .from("admin_table")
        .select("*")
        .eq("id", user.id)
        .single();

    if (error || !data) throw new Error("Not an admin");
    return { user, admin: data };
}