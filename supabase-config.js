/* ================= CONFIGURAÇÃO SUPABASE =================
   Usado tanto pelo site (script.js) quanto pelo admin (admin.js).
   Só existe UMA vez aqui pra não repetir a chave em vários arquivos. */

const SUPABASE_URL = "https://kvhckfdadnlzrstphbhe.supabase.co";
const SUPABASE_KEY = "sb_publishable_7MxoYVX-eRI8CGa1S34qqQ_ZRphLbkR";

// "supabase" aqui é o objeto global que vem do CDN carregado no HTML
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
