/*  Contém a identidade visual (cor e ícone) para o estilo Cartoon. | */
export interface Categoria {
  id: string;
  nome: string;
  icone: string;
  cor: string;
  created_at?: string;
}

export interface MensagemTemplate {
  id: string;
  tipo: string;
  conteudo: string;
  created_at?: string;
}

/* | Interface principal de Aniversariantes. | */
export interface Aniversario {
  id: string;
  created_at?: string;
  nome: string;
  apelido: string; 
  data_nascimento: string;
  telefone?: string;        
  observacoes?: string;  
  frase_exibicao?: string;
  imagem_url?: string;
  categoria_id: string;
  categorias?: Categoria;
  idadeNova: number;
  favorito: boolean; 
  send_msg: boolean;
  ultimo_envio_ano?: number; 
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