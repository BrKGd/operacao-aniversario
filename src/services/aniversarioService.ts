import { supabase } from '../supabaseClient';
import { Aniversario, Categoria, MensagemTemplate } from '../types';

// --- CACHE EM MEMÓRIA & LOCALSTORAGE PARA PERFORMANCE MÁXIMA (0ms SWR) ---
const CACHE_KEYS = {
  ANIVERSARIOS: 'leao_cache_aniversarios',
  CATEGORIAS: 'leao_cache_categorias',
  TEMPLATES: 'leao_cache_templates',
  TIMESTAMP: 'leao_cache_timestamp'
};

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

async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch (e) {
    return null;
  }
}

export const aniversarioService = {
  /**
   * Limpa todos os caches locais (útil após alterações de dados ou ao fazer logout)
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
   * Retorna os dados do perfil do usuário logado e sua função no sistema (admin / user)
   */
  async getPerfilUsuario() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const email = (user.email || '').toLowerCase();

    // 1. Tenta buscar da tabela public.profiles do Supabase
    let profileRow: any = null;
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      profileRow = data;
    } catch (e) {
      console.warn('Tabela profiles não acessível:', e);
    }

    // 2. Tenta buscar o status/role salvo no banco Supabase (tabela user_settings)
    let statusBanco = 'active';
    let roleBanco = 'user';
    try {
      const { data: settingsData } = await supabase.from('user_settings').select('*').eq('user_id', user.id).maybeSingle();
      if (settingsData?.preferences) {
        const prefs = settingsData.preferences as any;
        if (prefs.status) statusBanco = prefs.status;
        if (prefs.role) roleBanco = prefs.role;
      }
    } catch (e) {
      console.warn('Tabela user_settings não acessível:', e);
    }

    // 3. Tenta buscar ajustes salvos localmente
    const RAW = localStorage.getItem('leao_users_registry');
    let listaLocal: any[] = RAW ? JSON.parse(RAW) : [];
    const itemLocal = listaLocal.find(u => u.email.toLowerCase() === email);

    const isMaster = email === 'gleidson.fig@gmail.com';
    const statusFinal = isMaster ? 'active' : (profileRow?.status || statusBanco || itemLocal?.status || user.user_metadata?.status || 'active');
    const roleFinal = isMaster ? 'admin' : (itemLocal?.role || roleBanco || user.user_metadata?.role || 'user');
    const isAdmin = isMaster || roleFinal === 'admin';

    const metadata = user.user_metadata || {};
    const nome = profileRow?.nome_completo || metadata.full_name || metadata.nome || email.split('@')[0] || 'Usuário';
    const avatar = profileRow?.avatar_url || metadata.avatar_url || metadata.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(nome)}&background=0052FF&color=fff&bold=true`;

    // Se nao existir registro na tabela public.profiles, grava automaticamente
    if (!profileRow) {
      try {
        await supabase.from('profiles').upsert({
          id: user.id,
          email: user.email,
          nome_completo: nome,
          avatar_url: avatar,
          status: statusFinal,
          updated_at: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Upsert inicial em profiles ignorado:', e);
      }
    }

    // Registra a conta no catalogo local de usuarios para o painel admin
    this.registrarUsuarioCatalogo({ id: user.id, email, nome, avatar, role: roleFinal, status: statusFinal, created_at: user.created_at });

    return {
      id: user.id,
      email,
      nome,
      avatar,
      role: roleFinal as 'admin' | 'user',
      status: statusFinal as 'active' | 'blocked',
      isAdmin,
      created_at: user.created_at
    };
  },

  /**
   * Registra/atualiza os dados de usuario no catalogo admin local
   */
  registrarUsuarioCatalogo(userItem: any) {
    try {
      const RAW = localStorage.getItem('leao_users_registry');
      let lista: any[] = RAW ? JSON.parse(RAW) : [];
      
      const idx = lista.findIndex(u => u.email.toLowerCase() === userItem.email.toLowerCase());
      if (idx >= 0) {
        lista[idx] = { ...lista[idx], ...userItem };
      } else {
        lista.push(userItem);
      }

      // Garante que o Admin Mestre gleidson.fig@gmail.com sempre existe no topo como admin ativo
      const hasMaster = lista.some(u => u.email.toLowerCase() === 'gleidson.fig@gmail.com');
      if (!hasMaster) {
        lista.unshift({
          id: 'master-admin',
          email: 'gleidson.fig@gmail.com',
          nome: 'Gleidson (Administrador Mestre)',
          avatar: 'https://ui-avatars.com/api/?name=Gleidson&background=0052FF&color=fff&bold=true',
          role: 'admin',
          status: 'active',
          created_at: new Date().toISOString()
        });
      }

      localStorage.setItem('leao_users_registry', JSON.stringify(lista));
    } catch (e) {
      console.warn('Erro ao salvar no catalogo de usuarios:', e);
    }
  },

  /**
   * Retorna a lista de todos os usuarios registrados (Acesso exclusivo Admin)
   */
  async listarTodosUsuarios(): Promise<any[]> {
    const perfil = await this.getPerfilUsuario();
    if (!perfil?.isAdmin) throw new Error("Acesso restrito ao Administrador.");

    const usuariosBaseSupabase = [
      {
        id: "f31834f4-21ca-4c67-b534-a655c7d0cb31",
        email: "gleidson.fig@gmail.com",
        nome: "Gleidson Silva (Administrador Mestre)",
        avatar: "https://ui-avatars.com/api/?name=Gleidson+Silva&background=0052FF&color=fff&bold=true",
        role: "admin",
        status: "active",
        created_at: "2026-03-25"
      },
      {
        id: "f5ffdf81-9bc8-41bf-8e5a-f37e360b9f17",
        email: "rennyjaine@gmail.com",
        nome: "Renny Jaine",
        avatar: "https://ui-avatars.com/api/?name=Renny+Jaine&background=EC4899&color=fff&bold=true",
        role: "user",
        status: "active",
        created_at: "2026-03-30"
      },
      {
        id: "89200aa0-3504-43d1-9925-ed80d50e0a30",
        email: "gleidson.figueira@gmail.com",
        nome: "Gleidson Figueira",
        avatar: "https://ui-avatars.com/api/?name=Gleidson+Figueira&background=10B981&color=fff&bold=true",
        role: "user",
        status: "active",
        created_at: "2026-07-27"
      },
      {
        id: "b7afcee0-a74c-4687-9407-419a7e5c9d66",
        email: "gleidson.silva_aut@outlook.com",
        nome: "Gleidson Silva",
        avatar: "https://ui-avatars.com/api/?name=Gleidson+Silva&background=8B5CF6&color=fff&bold=true",
        role: "user",
        status: "active",
        created_at: "2026-03-25"
      }
    ];

    let listaDb: any[] = [];
    try {
      const { data } = await supabase.from('profiles').select('*').order('nome_completo', { ascending: true });
      if (data && data.length > 0) {
        listaDb = data.map(p => ({
          id: p.id,
          email: p.email,
          nome: p.nome_completo || p.email.split('@')[0],
          avatar: p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.email)}&background=0052FF&color=fff&bold=true`,
          role: p.email.toLowerCase() === 'gleidson.fig@gmail.com' ? 'admin' : 'user',
          status: p.status || 'active',
          created_at: p.updated_at
        }));
      }
    } catch (e) {
      console.warn('Aviso ao buscar tabela profiles:', e);
    }

    const RAW = localStorage.getItem('leao_users_registry');
    let listaLocal: any[] = RAW ? JSON.parse(RAW) : [];

    const map = new Map<string, any>();
    // 1. Adiciona os usuarios base cadastrados no Supabase como fallback
    usuariosBaseSupabase.forEach(u => map.set(u.email.toLowerCase(), u));
    // 2. Mescla com os ajustes salvos em cache local
    listaLocal.forEach(u => {
      const exist = map.get(u.email.toLowerCase()) || {};
      map.set(u.email.toLowerCase(), { ...exist, ...u });
    });
    // 3. Mescla com os dados REAIS da tabela public.profiles do Supabase (Fonte da Verdade Suprema)
    listaDb.forEach(u => {
      const exist = map.get(u.email.toLowerCase()) || {};
      map.set(u.email.toLowerCase(), { 
        ...exist, 
        ...u, 
        status: u.status || exist.status || 'active' 
      });
    });

    let listaFinal = Array.from(map.values());

    return listaFinal;
  },

  /**
   * Altera a funcao (role) de um usuario (admin / user)
   */
  async atualizarRoleUsuario(emailTarget: string, novoPapel: 'admin' | 'user') {
    const perfil = await this.getPerfilUsuario();
    if (!perfil?.isAdmin) throw new Error("Apenas administradores podem alterar funcoes.");

    const RAW = localStorage.getItem('leao_users_registry');
    let lista: any[] = RAW ? JSON.parse(RAW) : [];
    let targetUser: any = null;
    
    lista = lista.map(u => {
      if (u.email.toLowerCase() === emailTarget.toLowerCase()) {
        targetUser = { ...u, role: novoPapel };
        return targetUser;
      }
      return u;
    });

    localStorage.setItem('leao_users_registry', JSON.stringify(lista));

    // Grava a preferencia no banco Supabase na tabela user_settings
    if (targetUser?.id && targetUser.id !== 'master-admin') {
      try {
        await supabase.from('user_settings').upsert({
          user_id: targetUser.id,
          updated_at: new Date().toISOString(),
          preferences: { role: novoPapel, status: targetUser.status || 'active' }
        });
      } catch (e) {
        console.warn('Aviso ao salvar role no Supabase:', e);
      }
    }
  },

  /**
   * Altera o status de um usuario (active / blocked)
   */
  async alterarStatusUsuario(emailTarget: string, novoStatus: 'active' | 'blocked') {
    const perfil = await this.getPerfilUsuario();
    if (!perfil?.isAdmin) throw new Error("Apenas administradores podem bloquear usuarios.");

    if (emailTarget.toLowerCase() === 'gleidson.fig@gmail.com') {
      throw new Error("O Administrador Mestre nao pode ser bloqueado.");
    }

    const emailNorm = emailTarget.toLowerCase().trim();

    // 1. Grava no banco Supabase na tabela public.profiles (Via RPC com SECURITY DEFINER para desviar de restrições RLS)
    let rpcOk = false;
    try {
      const { error } = await supabase.rpc('alterar_status_usuario', {
        target_email: emailNorm,
        novo_status: novoStatus
      });
      if (!error) {
        rpcOk = true;
      } else {
        console.warn('RPC alterar_status_usuario falhou ou não existe ainda no Supabase:', error.message);
      }
    } catch (e) {
      console.warn('Exceção ao chamar RPC no Supabase:', e);
    }

    // 2. Fallback Direct Update na tabela public.profiles
    if (!rpcOk) {
      const { error: errUpdate } = await supabase
        .from('profiles')
        .update({ status: novoStatus, updated_at: new Date().toISOString() })
        .eq('email', emailNorm);

      if (errUpdate) {
        console.error('Erro ao atualizar status direto na tabela profiles:', errUpdate.message);
        // Tenta atualizar por ID se encontrar
        const { data: profObj } = await supabase.from('profiles').select('id').eq('email', emailNorm).maybeSingle();
        if (profObj?.id) {
          const { error: errId } = await supabase.from('profiles').update({ status: novoStatus, updated_at: new Date().toISOString() }).eq('id', profObj.id);
          if (errId) throw new Error(`Falha ao salvar status no Supabase: ${errId.message}`);
        } else {
          throw new Error(`Falha ao atualizar status no Supabase: ${errUpdate.message}`);
        }
      }
    }

    // 3. Grava o status na tabela user_settings como backup
    try {
      const { data: profObj } = await supabase.from('profiles').select('id').eq('email', emailNorm).maybeSingle();
      if (profObj?.id) {
        await supabase.from('user_settings').upsert({
          user_id: profObj.id,
          updated_at: new Date().toISOString(),
          preferences: { status: novoStatus }
        });
      }
    } catch (e) {
      console.warn('Aviso ao salvar em user_settings:', e);
    }

    // 4. Atualiza o catalogo local
    const RAW = localStorage.getItem('leao_users_registry');
    let lista: any[] = RAW ? JSON.parse(RAW) : [];
    lista = lista.map(u => {
      if (u.email.toLowerCase() === emailNorm) {
        return { ...u, status: novoStatus };
      }
      return u;
    });
    localStorage.setItem('leao_users_registry', JSON.stringify(lista));
  },

  /**
   * Atualiza o nome e avatar do perfil do usuário na auth e na tabela public.profiles
   */
  async atualizarPerfilUsuario(dados: { nome?: string; avatar?: string }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado.");

    const user_metadata: any = {};
    if (dados.nome) user_metadata.full_name = dados.nome;
    if (dados.avatar) user_metadata.avatar_url = dados.avatar;

    const { data, error } = await supabase.auth.updateUser({ data: user_metadata });
    if (error) throw error;

    try {
      await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        nome_completo: dados.nome || user_metadata.full_name,
        avatar_url: dados.avatar || user_metadata.avatar_url,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Aviso ao atualizar tabela profiles:', e);
    }

    return data.user;
  },

  /**
   * Envia e-mail de recuperação de senha
   */
  async enviarEmailRecuperacaoSenha(email: string) {
    const redirectUrl = window.location.origin + window.location.pathname;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    });
    if (error) throw error;
  },

  /**
   * Atualiza a senha da conta
   */
  async atualizarSenha(novaSenha: string) {
    const { data, error } = await supabase.auth.updateUser({ password: novaSenha });
    if (error) throw error;
    return data.user;
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
      const userId = await getCurrentUserId();
      let res;
      
      if (userId) {
        res = await supabase
          .from('aniversarios')
          .select(`*, categorias (id, nome, icone, cor)`)
          .or(`user_id.eq.${userId},user_id.is.null`)
          .order('nome', { ascending: true });
      }

      if (!res || res.error) {
        res = await supabase
          .from('aniversarios')
          .select(`*, categorias (id, nome, icone, cor)`)
          .order('nome', { ascending: true });
      }

      if (res.error) throw res.error;

      const lista = (res.data as any[]) || [];
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
    const payload = { nome: categoria.nome, icone: categoria.icone, cor: categoria.cor };

    const { data, error } = await supabase
      .from('categorias')
      .insert([payload])
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
    const userId = await getCurrentUserId();
    const payload = {
      ...aniversario,
      user_id: userId || null,
      notificacoes_ativas: (aniversario as any).notificacoes_ativas ?? true,
      id_notificacao: (aniversario as any).id_notificacao || null
    };

    const { data, error } = await supabase
      .from('aniversarios')
      .insert([payload])
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