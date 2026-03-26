/**
 * Interface que reflete a tabela 'categorias' no Supabase.
 * Contém a identidade visual (cor e ícone) para o estilo Cartoon.
 */
export interface Categoria {
  id: string;      // UUID
  nome: string;    // Ex: "Família", "Igreja"
  icone: string;   // Nome do ícone do Lucide (ex: 'heart')
  cor: string;     // Hexadecimal (ex: '#d71921')
  created_at?: string;
}

/**
 * Interface principal de Aniversariantes.
 * Atualizada para usar 'categoria_id' como chave estrangeira.
 */
export interface Aniversario {
  id: string;               // UUID gerado pelo Supabase
  created_at?: string;      // Data de criação automática
  nome: string;             // Nome do aniversariante
  data_nascimento: string;  // Formato YYYY-MM-DD
  telefone?: string;        // Opcional: (85) 9....
  observacoes?: string;     // Opcional: Algum detalhe extra
  
  // Relacionamento
  categoria_id: string;     // FK para a tabela categorias
  
  /*Contém o objeto completo da categoria vinculada.*/
  categorias?: Categoria; 
}

/*Tipos para as rotas e navegação do App */
export type TelaDoc = 
  | 'dash' 
  | 'list' 
  | 'form' 
  | 'config' 
  | 'detalhes' 
  | 'notificacoes' 
  | 'calendario';