import { createClient } from '@supabase/supabase-js';

// Usamos import.meta.env para o Vite carregar as chaves do arquivo .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error("Erro de Configuração: As chaves do Supabase não foram encontradas no arquivo .env");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Interface Central de Dados
 * Reflete exatamente a estrutura da tabela 'aniversarios' no Postgres
 */
export interface Aniversario {
    id: string;
    nome: string;
    data_nascimento: string; // Formato 'YYYY-MM-DD'
    frase_exibicao: string;   // Mudamos de 'frase_tatica' para algo mais civil
    created_at?: string;
    user_id?: string;
}