// SAFE P0 patch — shared admin authorization for privileged edge functions.
//
// Two independent layers protect these endpoints:
//   1. Gateway:  verify_jwt = true in supabase/config.toml  -> "is the token valid at all?"
//   2. In code:  getUser(token) + has_role(user.id,'admin') -> "is this caller an admin?"
//
// verify_jwt alone lets ANY signed-in user through, so the role check below is mandatory
// and is never replaced by the gateway setting. A service_role client must only ever be
// created AFTER requireAdmin() has returned ok.
//
// Migration note (Timeweb): this is a plain "Bearer token -> user -> role" check and maps
// 1:1 onto any REST backend. Nothing Supabase-specific is introduced here.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export type AdminAuthResult =
  | { ok: true; userId: string }
  | { ok: false; response: Response };

/**
 * Verifies that the caller is a signed-in user holding the 'admin' role.
 * 401 - missing / malformed / invalid token
 * 403 - valid user without the admin role
 */
export async function requireAdmin(req: Request): Promise<AdminAuthResult> {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false, response: jsonResponse({ error: 'Unauthorized: missing bearer token' }, 401) };
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return { ok: false, response: jsonResponse({ error: 'Unauthorized: empty bearer token' }, 401) };
  }

  const authClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData?.user) {
    return { ok: false, response: jsonResponse({ error: 'Unauthorized: invalid token' }, 401) };
  }

  const userId = userData.user.id;

  const { data: isAdmin, error: roleError } = await authClient.rpc('has_role', {
    _user_id: userId,
    _role: 'admin',
  });

  if (roleError) {
    console.error('has_role check failed:', roleError.message);
    return { ok: false, response: jsonResponse({ error: 'Authorization check failed' }, 500) };
  }

  if (!isAdmin) {
    return { ok: false, response: jsonResponse({ error: 'Forbidden: admin role required' }, 403) };
  }

  return { ok: true, userId };
}

/** Service-role client. Only call this after requireAdmin() succeeded. */
export function createServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
}
