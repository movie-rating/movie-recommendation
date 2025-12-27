// Environment variable validation
// Runs on server startup only

function validateEnvVar(name: string, value: string | undefined, options?: {
  isUrl?: boolean;
  minLength?: number;
}): string | null {
  if (!value || value.trim() === '') {
    return `${name} is required but not set`;
  }

  if (options?.minLength && value.length < options.minLength) {
    return `${name} appears invalid (too short)`;
  }

  if (options?.isUrl) {
    try {
      new URL(value);
    } catch {
      return `${name} is not a valid URL`;
    }
  }

  return null;
}

if (typeof window === 'undefined') {
  const errors: string[] = [];

  // Validate required environment variables
  const geminiError = validateEnvVar('GEMINI_API_KEY', process.env.GEMINI_API_KEY, { minLength: 10 });
  if (geminiError) errors.push(geminiError);

  const tmdbError = validateEnvVar('TMDB_API_KEY', process.env.TMDB_API_KEY, { minLength: 10 });
  if (tmdbError) errors.push(tmdbError);

  const supabaseUrlError = validateEnvVar('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL, { isUrl: true });
  if (supabaseUrlError) errors.push(supabaseUrlError);

  const supabaseKeyError = validateEnvVar('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { minLength: 10 });
  if (supabaseKeyError) errors.push(supabaseKeyError);

  if (errors.length > 0) {
    console.error('Environment validation failed:');
    errors.forEach(err => console.error(`  - ${err}`));
    console.error('Please check your .env.local file');

    // In production, throw to prevent startup with invalid config
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing or invalid environment variables: ${errors.join('; ')}`);
    }
  }
}

