export interface Categoria {
  id: string;
  nome: string;
  icone: string;
  cor: string;
  created_at?: string;
}

export interface MensagemTemplate {
  id: string;
  tipo?: string;
  titulo?: string;
  texto?: string;
  conteudo?: string;
  created_at?: string;
}

export interface Aniversario {
  id: string;
  created_at?: string;
  nome: string;
  apelido?: string; 
  data_nascimento: string;
  telefone?: string;        
  observacoes?: string;  
  frase_exibicao?: string;
  imagem_url?: string;
  categoria_id?: string;
  categorias?: Categoria;
  idadeNova?: number;
  favorito?: boolean; 
  send_msg?: boolean;
  ultimo_envio_ano?: number;
  user_id?: string;
  notificacoes_ativas?: boolean;
  id_notificacao?: string;
}

export interface Notificacao {
  id: string;
  user_id?: string;
  aniversario_id?: string;
  titulo: string;
  mensagem: string;
  data_envio: string;
  lida: boolean;
}

export type TelaDoc = 
  | 'dash' 
  | 'list' 
  | 'form' 
  | 'config' 
  | 'detalhes' 
  | 'notificacoes' 
  | 'calendario'
  | 'usuarios'
  | 'perfil';