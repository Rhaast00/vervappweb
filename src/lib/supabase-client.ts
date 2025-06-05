'use client';

import { createClient } from '@supabase/supabase-js';

// Kesin sabit URL ve anahtar değerlerini kullanıyoruz
const supabaseUrl = 'https://umoygrnvpvnnygpinals.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtb3lncm52cHZubnlncGluYWxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxNDA4NjgsImV4cCI6MjA2NDcxNjg2OH0.6edinGRnz50nSc6pwb_SuIkEeom_6PBdA4Q3RHYdy5A';

// Supabase istemcisini oluştur
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  }
}); 