import { supabase } from '../supabaseClient';
import { Aniversario, Categoria } from '../types';

export const aniversarioService = {
  /**
   * Lista aniversários filtrando por mês com os dados da categoria inclusos (JOIN).
   * @param mes - Índice do mês (0 para Janeiro, 11 para Dezembro)
   */
  async listarPorMes(mes: number): Promise<Aniversario[]> {
    const { data, error } = await supabase
      .from('aniversarios')
      .select(`
        *,
        categorias (
          id,
          nome,
          icone,
          cor
        )
      `)
      // Filtra pelo mês extraído da data_nascimento
      .filter('data_nascimento', 'raw', `extract(month from data_nascimento) = ${mes + 1}`)
      .order('nome', { ascending: true });

    if (error) {
      console.error('Erro ao buscar dados por mês:', error.message);
      return [];
    }
    
    return (data as any[]) || [];
  },

  /**
   * Busca todos os aniversariantes com o objeto de categoria completo.
   */
  async listarTodos(): Promise<Aniversario[]> {
    const { data, error } = await supabase
      .from('aniversarios')
      .select(`
        *,
        categorias (
          id,
          nome,
          icone,
          cor
        )
      `)
      .order('nome', { ascending: true });

    if (error) {
      console.error('Erro ao buscar todos os aniversariantes:', error.message);
      return [];
    }

    return (data as any[]) || [];
  },

  /**
   * Busca todas as categorias da tabela 'categorias'.
   */
  async listarCategorias(): Promise<Categoria[]> {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .order('nome', { ascending: true });

    if (error) {
      console.error('Erro ao buscar categorias:', error.message);
      return [];
    }
    return data as Categoria[];
  },

  /**
   * Cria uma nova categoria no banco de dados.
   * Usado pelo Modal no formulário de cadastro.
   */
  async adicionarCategoria(categoria: Omit<Categoria, 'id' | 'created_at'>): Promise<Categoria | null> {
    const { data, error } = await supabase
      .from('categorias')
      .insert([categoria])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar categoria:', error.message);
      throw error;
    }
    return data as Categoria;
  },

  /**
   * Registra um novo aniversariante.
   * O objeto deve conter 'categoria_id'.
   */
  async adicionar(aniversario: Omit<Aniversario, 'id' | 'created_at' | 'categorias'>): Promise<Aniversario | null> {
    const { data, error } = await supabase
      .from('aniversarios')
      .insert([aniversario])
      .select()
      .single();

    if (error) {
      console.error('Erro ao escalar novo aniversariante:', error.message);
      throw error;
    }
    
    return data;
  },

  /**
   * Atualiza os dados de um aniversariante existente.
   */
  async atualizar(id: string, dados: Partial<Aniversario>): Promise<Aniversario | null> {
    // Removemos 'categorias' (objeto do join) antes de enviar o update se ele existir
    const { categorias, ...dadosParaEnvio } = dados as any;

    const { data, error } = await supabase
      .from('aniversarios')
      .update(dadosParaEnvio)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar registro:', error.message);
      throw error;
    }

    return data;
  },

  /**
   * Remove um registro permanentemente.
   */
  async excluir(id: string): Promise<void> {
    const { error } = await supabase
      .from('aniversarios')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao remover registro:', error.message);
      throw error;
    }
  }
};