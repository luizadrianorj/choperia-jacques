import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

// Cliente único para o navegador. Os valores reais vêm das variáveis de
// ambiente configuradas na Vercel (Settings > Environment Variables).
// Os "placeholder" só evitam erro durante o build quando as chaves ainda
// não estão presentes — nunca são usados em produção.
export const supabase = createClient(url, anon);
