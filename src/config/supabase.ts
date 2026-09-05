import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

// Created once at module scope, not per request.
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
