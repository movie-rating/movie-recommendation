import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

// Allowed redirect paths to prevent open redirect vulnerability
const ALLOWED_REDIRECT_PATHS = [
  '/',
  '/protected',
  '/recommendations',
  '/onboarding',
];

function isValidRedirectPath(path: string): boolean {
  // Must start with / (relative path only - no external URLs)
  if (!path.startsWith('/')) {
    return false;
  }
  // Check against allowlist (prefix match to allow subpaths)
  return ALLOWED_REDIRECT_PATHS.some(allowed =>
    path === allowed || path.startsWith(allowed + '/')
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next") ?? "/";

  // Validate redirect path to prevent open redirect attacks
  const next = isValidRedirectPath(nextParam) ? nextParam : "/";

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      // redirect user to specified redirect URL or root of app
      redirect(next);
    } else {
      // redirect the user to an error page with instructions
      // Use error code instead of message to avoid exposing sensitive details
      redirect('/auth/error?code=verification_failed');
    }
  }

  // redirect the user to an error page with instructions
  redirect('/auth/error?code=invalid_request');
}
