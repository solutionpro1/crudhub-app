import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ufouplayrpestuekhvph.supabase.co';
const supabaseAnonKey = 'sb_publishable_ULeaBbNDKlddfAaBF9OifA__kHbM4zB';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
