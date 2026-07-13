import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const SUPABASE_URL = 'https://nlsnycwlmoukxgojrkpe.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sc255Y3dsbW91a3hnb2pya3BlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MzQ5NjIsImV4cCI6MjA5NjUxMDk2Mn0.Q_5R8vel8YmExTY3ztk3toHBuW1xLKUjVFzKeBbIwE4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});
