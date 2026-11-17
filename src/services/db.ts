// Clave anon pública; el acceso real se limita con RLS y tokens de sesión.
export const SUPABASE_URL = 'https://eplecjicrkylvidkdcjt.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwbGVjamljcmt5bHZpZGtkY2p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ5MTkxNzYsImV4cCI6MjExMDQ5NTE3Nn0.Adl-kFNKLEQ6N1GW-JVqgPeV9j5-8-mPMujvTtQlibo';
export async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(SUPABASE_URL + '/rest/v1/rpc/' + fn, {
      method: 'POST', headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(args), signal: controller.signal
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'No se pudo conectar con la nube.');
    return result as T;
  } catch (error) {
    if (error instanceof TypeError || (error instanceof Error && error.name === 'AbortError')) throw new Error('Sin conexión con la nube. Revisa internet e inténtalo otra vez.');
    throw error;
  } finally { window.clearTimeout(timeout); }
}
