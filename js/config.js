// Supabase kapcsolat (a publikus "anon" kulcs nyugodtan lehet a böngészőben, a védelmet az RLS adja)
export const SUPA_URL = 'https://dsughfunhecvnwzztfsu.supabase.co';
export const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzdWdoZnVuaGVjdm53enp0ZnN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNzYwNDAsImV4cCI6MjEwODk1MjA0MH0.wqoqbvF2vZAvs_CKRn4alJkwkYlLdR0tOlbbUWt9KVg';

export const sb = window.supabase.createClient(SUPA_URL, SUPA_KEY);

// Térkép alapnézet: Vajdaság
export const MAP_CENTER = [45.45, 20.1];
export const MAP_ZOOM = 8;
