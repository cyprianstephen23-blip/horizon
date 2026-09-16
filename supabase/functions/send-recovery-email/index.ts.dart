// supabase/functions/send-recovery-email/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { SmtpClient } from 'https://deno.land/x/smtp@v0.7.0/mod.ts';

const SMTP_USERNAME = Deno.env.get('SMTP_USERNAME')!;
const SMTP_PASSWORD = Deno.env.get('SMTP_PASSWORD')!;
const FROM_NAME = Deno.env.get('FROM_NAME') ?? 'Horizon Business';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
  'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
// Handle CORS preflight
if (req.method === 'OPTIONS') {
return new Response('ok', { headers: corsHeaders });
}

try {
const { toEmail, username, code, validMinutes = 30 } =
await req.json();

if (!toEmail || !code) {
return new Response(
JSON.stringify({ error: 'Missing toEmail or code' }),
{
status: 400,
headers: {
...corsHeaders,
'Content-Type': 'application/json',
},
},
);
}

const client = new SmtpClient();

await client.connectTLS({
hostname: 'smtp.gmail.com',
port: 465,
username: SMTP_USERNAME,
password: SMTP_PASSWORD,
});

await client.send({
from: SMTP_USERNAME,
to: toEmail,
subject: 'Horizon Controller — Password Reset Code',
content: `
Hello ${username},

You requested a password reset for your Horizon Controller account.

Your recovery code is:

${code}

This code expires in ${validMinutes} minutes and can only be used once.

If you did not request this, you can safely ignore this email.

— ${FROM_NAME}
`.trim(),
});

await client.close();

return new Response(
JSON.stringify({ ok: true }),
{
status: 200,
headers: {
...corsHeaders,
'Content-Type': 'application/json',
},
},
);
} catch (e) {
console.error('SMTP error:', e);
return new Response(
JSON.stringify({
error: e instanceof Error ? e.message : 'Failed to send email',
}),
{
status: 500,
headers: {
...corsHeaders,
'Content-Type': 'application/json',
},
},
);
}
});