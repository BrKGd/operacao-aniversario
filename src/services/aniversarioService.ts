import { supabase } from '../supabaseClient';
import { Aniversario, Categoria, MensagemTemplate } from '../types';

// --- CACHE EM MEMÓRIA & LOCALSTORAGE PARA PERFORMANCE MÁXIMA (0ms SWR) ---
const CACHE_KEYS = {
  ANIVERSARIOS: 'leao_cache_aniversarios',
  CATEGORIAS: 'leao_cache_categorias',
  TEMPLATES: 'leao_cache_templates',
  TIMESTAMP: 'leao_cache_timestamp'
};

const TTL_MS = 5 * 60 * 1000; // 5 minutos de validade antes da revalidação automatizada

let inMemoryAniversarios: Aniversario[] | null = null;
let inMemoryCategorias: Categoria[] | null = null;
let inMemoryTemplates: MensagemTemplate[] | null = null;

function salvarCacheLocal<T>(key: string, data: T) {
  try {
    let payload = data;

    // Se for a lista de aniversariantes, removemos Base64 pesados das fotos para otimizar espaço
    if (key === CACHE_KEYS.ANIVERSARIOS && Array.isArray(data)) {
      payload = data.map((item: any) => {
        if (item && item.imagem_url && item.imagem_url.startsWith('data:')) {
          const { imagem_url, ...resto } = item;
          return resto;
        }
        return item;
      }) as unknown as T;
    }

    localStorage.setItem(key, JSON.stringify(payload));
    localStorage.setItem(CACHE_KEYS.TIMESTAMP, Date.now().toString());
  } catch (e: any) {
    // Tenta limpar caches antigos se a quota for excedida
    try {
      localStorage.removeItem('fec_contatos_cache');
      localStorage.setItem(key, JSON.stringify(data));
    } catch (retryError) {
      // Se continuar excedido, mantem o cache perfeitamente em memoria RAM sem poluir o console
    }
  }
}

function lerCacheLocal<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export const aniversarioService = {
  /**
   * Limpa todos os caches locais (útil após alterações de dados)
   */
  invalidarCache() {
    inMemoryAniversarios = null;
    inMemoryCategorias = null;
    inMemoryTemplates = null;
    localStorage.removeItem(CACHE_KEYS.ANIVERSARIOS);
    localStorage.removeItem(CACHE_KEYS.CATEGORIAS);
    localStorage.removeItem(CACHE_KEYS.TEMPLATES);
  },

  /**
   * Busca a lista completa de aniversariantes.
   * Retorna instantaneamente se houver cache local (SWR pattern) e revalida em background.
   */
  async listarTodos(forceFresh: boolean = false): Promise<Aniversario[]> {
    // 1. Se tiver memória, retorna instantaneamente (0ms)
    if (!forceFresh && inMemoryAniversarios && inMemoryAniversarios.length > 0) {
      this.revalidarAniversariosEmBackground();
      return inMemoryAniversarios;
    }

    // 2. Se tiver no localStorage, carrega e retorna instantaneamente (0ms)
    const local = lerCacheLocal<Aniversario[]>(CACHE_KEYS.ANIVERSARIOS);
    if (!forceFresh && local && local.length > 0) {
      inMemoryAniversarios = local;
      this.revalidarAniversariosEmBackground();
      return local;
    }

    // 3. Se não tiver cache, faz a busca na rede
    return await this.revalidarAniversariosEmBackground();
  },

  /**
   * Revalidação silenciosa em background
   */
  async revalidarAniversariosEmBackground(): Promise<Aniversario[]> {
    try {
      const { data, error } = await supabase
        .from('aniversarios')
        .select(`*, categorias (id, nome, icone, cor)`)
        .order('nome', { ascending: true });

      if (error) throw error;

      const lista = (data as any[]) || [];
      inMemoryAniversarios = lista;
      salvarCacheLocal(CACHE_KEYS.ANIVERSARIOS, lista);
      return lista;
    } catch (error: any) {
      console.error('Erro ao revalidar aniversariantes:', error.message || error);
      return inMemoryAniversarios || lerCacheLocal<Aniversario[]>(CACHE_KEYS.ANIVERSARIOS) || [];
    }
  },

  async listarPorMes(mes: number): Promise<Aniversario[]> {
    const todos = await this.listarTodos();
    return todos.filter(p => {
      if (!p.data_nascimento) return false;
      const parts = p.data_nascimento.split('-');
      if (parts.length < 2 || !parts[1]) return false;
      return parseInt(parts[1], 10) - 1 === mes;
    });
  },

  /**
   * Busca a lista de categorias com cache instantâneo
   */
  async listarCategorias(forceFresh: boolean = false): Promise<Categoria[]> {
    if (!forceFresh && inMemoryCategorias && inMemoryCategorias.length > 0) {
      return inMemoryCategorias;
    }

    const local = lerCacheLocal<Categoria[]>(CACHE_KEYS.CATEGORIAS);
    if (!forceFresh && local && local.length > 0) {
      inMemoryCategorias = local;
      return local;
    }

    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      const lista = (data as Categoria[]) || [];
      inMemoryCategorias = lista;
      salvarCacheLocal(CACHE_KEYS.CATEGORIAS, lista);
      return lista;
    } catch (error: any) {
      console.error('Erro ao buscar categorias:', error.message || error);
      return inMemoryCategorias || lerCacheLocal<Categoria[]>(CACHE_KEYS.CATEGORIAS) || [];
    }
  },

  /**
   * Busca os templates de mensagem com cache instantâneo
   */
  async listarTemplates(forceFresh: boolean = false): Promise<MensagemTemplate[]> {
    if (!forceFresh && inMemoryTemplates && inMemoryTemplates.length > 0) {
      return inMemoryTemplates;
    }

    const local = lerCacheLocal<MensagemTemplate[]>(CACHE_KEYS.TEMPLATES);
    if (!forceFresh && local && local.length > 0) {
      inMemoryTemplates = local;
      return local;
    }

    try {
      const { data, error } = await supabase
        .from('mensagens_templates')
        .select('*')
        .order('tipo', { ascending: true });

      if (error) throw error;
      const lista = (data as MensagemTemplate[]) || [];
      inMemoryTemplates = lista;
      salvarCacheLocal(CACHE_KEYS.TEMPLATES, lista);
      return lista;
    } catch (error: any) {
      console.error('Erro ao buscar templates:', error.message || error);
      return inMemoryTemplates || lerCacheLocal<MensagemTemplate[]>(CACHE_KEYS.TEMPLATES) || [];
    }
  },

  async salvarCategoria(categoria: Omit<Categoria, 'id' | 'created_at'>): Promise<Categoria | null> {
    const { data, error } = await supabase
      .from('categorias')
      .insert([categoria])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar categoria:', error.message);
      throw error;
    }
    const catCriada = data as Categoria;
    if (inMemoryCategorias) {
      inMemoryCategorias.push(catCriada);
      salvarCacheLocal(CACHE_KEYS.CATEGORIAS, inMemoryCategorias);
    } else {
      this.invalidarCache();
    }
    return catCriada;
  },

  async atualizarCategoria(id: string, dados: Partial<Categoria>): Promise<Categoria | null> {
    // Atualizacao otimista em memoria
    if (inMemoryCategorias) {
      inMemoryCategorias = inMemoryCategorias.map(c => c.id === id ? { ...c, ...dados } : c);
      salvarCacheLocal(CACHE_KEYS.CATEGORIAS, inMemoryCategorias);
    }

    const { data, error } = await supabase
      .from('categorias')
      .update(dados)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar categoria:', error.message);
      this.invalidarCache();
      throw error;
    }
    return data as Categoria;
  },

  async excluirCategoria(id: string): Promise<void> {
    // Atualizacao otimista em memoria para 0ms de delay
    if (inMemoryCategorias) {
      inMemoryCategorias = inMemoryCategorias.filter(c => c.id !== id);
      salvarCacheLocal(CACHE_KEYS.CATEGORIAS, inMemoryCategorias);
    }

    const { error } = await supabase
      .from('categorias')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir categoria:', error.message);
      this.invalidarCache();
      throw error;
    }
  },

  async adicionar(aniversario: Omit<Aniversario, 'id' | 'created_at' | 'categorias'>): Promise<Aniversario | null> {
    const { data, error } = await supabase
      .from('aniversarios')
      .insert([
        {
          ...aniversario,
          notificacoes_ativas: (aniversario as any).notificacoes_ativas ?? true,
          id_notificacao: (aniversario as any).id_notificacao || null
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Erro ao escalar novo aniversariante:', error.message);
      throw error;
    }

    if (inMemoryAniversarios) {
      inMemoryAniversarios.unshift(data);
      salvarCacheLocal(CACHE_KEYS.ANIVERSARIOS, inMemoryAniversarios);
    } else {
      this.invalidarCache();
    }

    return data;
  },

  async atualizar(id: string, dados: Partial<Aniversario>): Promise<Aniversario | null> {
    const { categorias, ...dadosParaEnvio } = dados as any;

    if (inMemoryAniversarios) {
      inMemoryAniversarios = inMemoryAniversarios.map(a => a.id === id ? { ...a, ...dadosParaEnvio } : a);
      salvarCacheLocal(CACHE_KEYS.ANIVERSARIOS, inMemoryAniversarios);
    }

    const { data, error } = await supabase
      .from('aniversarios')
      .update(dadosParaEnvio)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar registro:', error.message);
      this.invalidarCache();
      throw error;
    }
    return data;
  },

  async excluir(id: string): Promise<void> {
    // Exclusao instantanea otimista em memoria
    if (inMemoryAniversarios) {
      inMemoryAniversarios = inMemoryAniversarios.filter(a => a.id !== id);
      salvarCacheLocal(CACHE_KEYS.ANIVERSARIOS, inMemoryAniversarios);
    }

    const { error } = await supabase
      .from('aniversarios')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao remover registro:', error.message);
      this.invalidarCache();
      throw error;
    }
  },

  async listarNotificacoes() {
    const { data, error } = await supabase
      .from('notificacoes')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao buscar notificações:', error.message);
      return [];
    }
    return data || [];
  },

  async salvarNotificacao(notificacao: { dias: number; hora: string; alvo: string; grupos_especificos?: string[] }) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('Utilizador não autenticado');
      throw new Error('Você precisa estar logado para salvar notificações.');
    }

    const { data, error } = await supabase
      .from('notificacoes')
      .insert([
        { 
          ...notificacao, 
          user_id: user.id 
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Erro ao salvar notificação:', error.message);
      throw error;
    }
    return data;
  },

  async excluirNotificacao(id: string) {
    const { error } = await supabase
      .from('notificacoes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir notificação:', error.message);
      throw error;
    }
  }
};