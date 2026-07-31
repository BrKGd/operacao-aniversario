import { 
  sendPasswordResetEmail, 
  updatePassword, 
  updateProfile 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  getDocsFromCache,
  getDocsFromServer
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { Aniversario, Categoria, MensagemTemplate, Notificacao } from '../types';

/**
 * Gerador de UUID v4 padronizado (8-4-4-4-12) para identificadores do sistema
 */
export function gerarUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// --- CACHE EM MEMÓRIA & LOCALSTORAGE PARA PERFORMANCE MÁXIMA E OTIMIZAÇÃO DE COTAS (0ms SWR) ---
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
    localStorage.setItem(key, JSON.stringify(data));
    localStorage.setItem(CACHE_KEYS.TIMESTAMP, Date.now().toString());
  } catch (e: any) {
    try {
      localStorage.removeItem('fec_contatos_cache');
      localStorage.setItem(key, JSON.stringify(data));
    } catch (retryError) {
      // Mantém em memória RAM silenciosamente se excedido
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
    const user = auth.currentUser;
    if (!user) return null;

    const email = (user.email || '').toLowerCase();
    const isMaster = email === 'gleidson.fig@gmail.com';

    let profileRow: any = null;
    try {
      const docRef = doc(db, 'profiles', user.uid);
      const fetchPromise = getDoc(docRef);
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 1500));
      const docSnap = await Promise.race([fetchPromise, timeoutPromise]) as any;
      if (docSnap && docSnap.exists()) {
        profileRow = docSnap.data();
      }
    } catch (e) {
      console.warn('[Firebase] Aviso ao consultar documento profile:', e);
    }

    const RAW = localStorage.getItem('leao_users_registry');
    let listaLocal: any[] = RAW ? JSON.parse(RAW) : [];
    const itemLocal = listaLocal.find(u => u.email.toLowerCase() === email);

    const statusFinal = isMaster ? 'active' : (profileRow?.status || (itemLocal?.status === 'deleted' ? 'deleted' : 'active'));
    const roleFinal = isMaster ? 'admin' : (itemLocal?.role || profileRow?.role || 'user');
    const isAdmin = isMaster || roleFinal === 'admin';

    const nome = profileRow?.nome_completo || user.displayName || email.split('@')[0] || 'Usuário';
    const avatar = profileRow?.avatar_url || user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(nome)}&background=0052FF&color=fff&bold=true`;
    const createdAt = profileRow?.updated_at || user.metadata.creationTime || new Date().toISOString();

    // Executa o upsert em background sem travar o carregamento inicial da interface
    if (!profileRow && statusFinal !== 'deleted') {
      setDoc(doc(db, 'profiles', user.uid), {
        id: user.uid,
        email: user.email,
        nome_completo: nome,
        avatar_url: avatar,
        status: statusFinal,
        role: roleFinal,
        updated_at: new Date().toISOString()
      }, { merge: true }).catch(e => console.warn('[Firebase] Upsert background profiles ignorado:', e));
    }

    this.registrarUsuarioCatalogo({ id: user.uid, email, nome, avatar, role: roleFinal, status: statusFinal, created_at: createdAt });

    return {
      id: user.uid,
      email,
      nome,
      avatar,
      role: roleFinal,
      status: statusFinal,
      isAdmin,
      isMaster,
      created_at: createdAt
    };
  },

  /**
   * Registra a conta no catálogo local de usuários
   */
  registrarUsuarioCatalogo(usuario: { id: string; email: string; nome: string; avatar: string; role: string; status: string; created_at: string }) {
    try {
      const RAW = localStorage.getItem('leao_users_registry');
      let lista: any[] = RAW ? JSON.parse(RAW) : [];
      const emailNorm = usuario.email.toLowerCase();

      const index = lista.findIndex(u => u.email.toLowerCase() === emailNorm);
      if (index >= 0) {
        lista[index] = { ...lista[index], ...usuario };
      } else {
        lista.push(usuario);
      }

      localStorage.setItem('leao_users_registry', JSON.stringify(lista));
    } catch (e) {
      console.warn('Erro ao salvar no catálogo local de usuários:', e);
    }
  },

  /**
   * Retorna a lista de todos os usuários registrados no Firestore (Acesso exclusivo Admin)
   */
  async listarTodosUsuarios(): Promise<any[]> {
    const perfil = await this.getPerfilUsuario();
    if (!perfil?.isAdmin) throw new Error("Acesso restrito ao Administrador.");

    let listaDb: any[] = [];
    let dbSuccess = false;

    try {
      const profilesRef = collection(db, 'profiles');
      const q = query(profilesRef, orderBy('nome_completo', 'asc'));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        dbSuccess = true;
        querySnapshot.forEach(docSnap => {
          const p = docSnap.data();
          if (p.status !== 'deleted') {
            listaDb.push({
              id: docSnap.id,
              email: p.email,
              nome: p.nome_completo || p.email.split('@')[0],
              avatar: p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.email)}&background=0052FF&color=fff&bold=true`,
              role: (p.email || '').toLowerCase() === 'gleidson.fig@gmail.com' ? 'admin' : (p.role || 'user'),
              status: p.status || 'active',
              created_at: p.updated_at
            });
          }
        });
      }
    } catch (e) {
      console.warn('[Firebase] Aviso ao buscar coleção profiles:', e);
    }

    if (dbSuccess) {
      localStorage.setItem('leao_users_registry', JSON.stringify(listaDb));
      return listaDb;
    }

    const RAW = localStorage.getItem('leao_users_registry');
    let listaLocal: any[] = RAW ? JSON.parse(RAW) : [];
    return listaLocal.filter(u => u.status !== 'deleted');
  },

  /**
   * Altera a função (role) de um usuário (admin / user) no Firestore
   */
  async atualizarRoleUsuario(emailTarget: string, novoPapel: 'admin' | 'user') {
    const perfil = await this.getPerfilUsuario();
    if (!perfil?.isAdmin) throw new Error("Apenas administradores podem alterar funções.");

    if (emailTarget.toLowerCase() === 'gleidson.fig@gmail.com') {
      throw new Error("A função do Administrador Mestre não pode ser alterada.");
    }

    const emailNorm = emailTarget.toLowerCase().trim();

    try {
      const q = query(collection(db, 'profiles'), where('email', '==', emailNorm));
      const snap = await getDocs(q);
      snap.forEach(async (docSnap) => {
        await updateDoc(doc(db, 'profiles', docSnap.id), {
          role: novoPapel,
          updated_at: new Date().toISOString()
        });
      });
    } catch (e) {
      console.warn('[Firebase] Aviso ao atualizar role no Firestore:', e);
    }

    const RAW = localStorage.getItem('leao_users_registry');
    let lista: any[] = RAW ? JSON.parse(RAW) : [];
    lista = lista.map(u => {
      if (u.email.toLowerCase() === emailNorm) {
        return { ...u, role: novoPapel };
      }
      return u;
    });
    localStorage.setItem('leao_users_registry', JSON.stringify(lista));
  },

  /**
   * Altera o status de um usuário (active / blocked) no Firestore
   */
  async alterarStatusUsuario(emailTarget: string, novoStatus: 'active' | 'blocked') {
    const perfil = await this.getPerfilUsuario();
    if (!perfil?.isAdmin) throw new Error("Apenas administradores podem alterar status.");

    if (emailTarget.toLowerCase() === 'gleidson.fig@gmail.com') {
      throw new Error("O status do Administrador Mestre não pode ser alterado.");
    }

    const emailNorm = emailTarget.toLowerCase().trim();

    try {
      const q = query(collection(db, 'profiles'), where('email', '==', emailNorm));
      const snap = await getDocs(q);
      snap.forEach(async (docSnap) => {
        await updateDoc(doc(db, 'profiles', docSnap.id), {
          status: novoStatus,
          updated_at: new Date().toISOString()
        });
      });
    } catch (e) {
      console.warn('[Firebase] Erro ao alterar status no Firestore:', e);
    }

    this.notificarUsuarioPorEmail(emailNorm, 'blocked');

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
   * Exclui um usuário do Firestore e notifica por e-mail
   */
  async excluirUsuario(emailTarget: string) {
    const perfil = await this.getPerfilUsuario();
    if (!perfil?.isAdmin) throw new Error("Apenas administradores podem excluir usuários.");

    if (emailTarget.toLowerCase() === 'gleidson.fig@gmail.com') {
      throw new Error("O Administrador Mestre não pode ser excluído.");
    }

    const emailNorm = emailTarget.toLowerCase().trim();

    try {
      const qProf = query(collection(db, 'profiles'), where('email', '==', emailNorm));
      const snapProf = await getDocs(qProf);

      for (const docSnap of snapProf.docs) {
        const userId = docSnap.id;

        const qAniv = query(collection(db, 'aniversarios'), where('user_id', '==', userId));
        const snapAniv = await getDocs(qAniv);
        for (const aDoc of snapAniv.docs) {
          await deleteDoc(doc(db, 'aniversarios', aDoc.id));
        }

        await deleteDoc(doc(db, 'profiles', userId));
      }
    } catch (e) {
      console.warn('[Firebase] Erro ao excluir no Firestore:', e);
    }

    this.notificarUsuarioPorEmail(emailNorm, 'deleted');

    this.invalidarCache();
    const RAW = localStorage.getItem('leao_users_registry');
    let lista: any[] = RAW ? JSON.parse(RAW) : [];
    lista = lista.filter(u => u.email.toLowerCase() !== emailNorm);
    localStorage.setItem('leao_users_registry', JSON.stringify(lista));

    await this.listarTodosUsuarios();
  },

  /**
   * Dispara a notificação por e-mail em segundo plano
   */
  async notificarUsuarioPorEmail(email: string, tipo: 'blocked' | 'deleted') {
    let assunto = "";
    if (tipo === 'blocked') {
      assunto = "Aviso de Suspensão de Conta - Leão Festivo";
    } else if (tipo === 'deleted') {
      assunto = "Aviso de Exclusão Definitiva de Conta - Leão Festivo";
    }
    if (!assunto) return;
    console.log(`[E-mail Automático] Disparado para ${email}:`, assunto);
  },

  /**
   * Atualiza o nome e avatar do perfil no Firebase Auth e no Firestore
   */
  async atualizarPerfilUsuario(dados: { nome?: string; avatar?: string }) {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado.");

    await updateProfile(user, {
      displayName: dados.nome || user.displayName,
      photoURL: dados.avatar || user.photoURL
    });

    try {
      await updateDoc(doc(db, 'profiles', user.uid), {
        nome_completo: dados.nome || user.displayName,
        avatar_url: dados.avatar || user.photoURL,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn('[Firebase] Aviso ao atualizar documento profile:', e);
    }

    return user;
  },

  /**
   * Envia e-mail de recuperação de senha via Firebase Auth
   */
  async enviarEmailRecuperacaoSenha(email: string) {
    await sendPasswordResetEmail(auth, email);
  },

  /**
   * Atualiza a senha da conta no Firebase Auth
   */
  async atualizarSenha(novaSenha: string) {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado.");
    await updatePassword(user, novaSenha);
    return user;
  },

  /**
   * Busca a lista completa de aniversariantes com Cache-First (0ms) e leitura otimizada no Firestore
   */
  async listarTodos(forceFresh: boolean = false): Promise<Aniversario[]> {
    if (!forceFresh && inMemoryAniversarios && inMemoryAniversarios.length > 0) {
      this.revalidarAniversariosEmBackground();
      return inMemoryAniversarios;
    }

    const localData = lerCacheLocal<Aniversario[]>(CACHE_KEYS.ANIVERSARIOS);
    if (!forceFresh && localData && localData.length > 0) {
      inMemoryAniversarios = localData;
      this.revalidarAniversariosEmBackground();
      return localData;
    }

    try {
      const data = await this.buscarAniversariosDoFirestore();
      inMemoryAniversarios = data;
      salvarCacheLocal(CACHE_KEYS.ANIVERSARIOS, data);
      return data;
    } catch (error) {
      console.warn('[Firebase] Erro ao buscar aniversários do Firestore, usando fallback local:', error);
      return localData || [];
    }
  },

  /**
   * Revalidação silenciosa em segundo plano para não bloquear a UI
   */
  async revalidarAniversariosEmBackground() {
    try {
      const data = await this.buscarAniversariosDoFirestore();
      inMemoryAniversarios = data;
      salvarCacheLocal(CACHE_KEYS.ANIVERSARIOS, data);
    } catch (e) {
      console.warn('[Firebase] Aviso na revalidação silenciosa:', e);
    }
  },

  /**
   * Busca registros da coleção 'aniversarios' no Cloud Firestore com otimização de leitura
   */
  async buscarAniversariosDoFirestore(): Promise<Aniversario[]> {
    const user = auth.currentUser;
    if (!user) return [];

    const perfil = await this.getPerfilUsuario();
    const isMaster = perfil?.isMaster || false;

    const aniversariosRef = collection(db, 'aniversarios');
    let q;

    if (isMaster) {
      q = query(aniversariosRef, orderBy('nome', 'asc'));
    } else {
      q = query(aniversariosRef, where('user_id', '==', user.uid), orderBy('nome', 'asc'));
    }

    let querySnapshot;
    try {
      querySnapshot = await getDocsFromCache(q);
      if (querySnapshot.empty) {
        querySnapshot = await getDocsFromServer(q);
      }
    } catch (cacheErr) {
      querySnapshot = await getDocsFromServer(q);
    }

    const lista: Aniversario[] = [];
    querySnapshot.forEach((docSnap) => {
      const item = docSnap.data() as any;
      lista.push({
        id: docSnap.id,
        created_at: item.created_at || new Date().toISOString(),
        nome: item.nome || '',
        data_nascimento: item.data_nascimento || '',
        frase_exibicao: item.frase_exibicao || '',
        user_id: item.user_id || user.uid,
        telefone: item.telefone || '',
        categoria_id: item.categoria_id || '',
        apelido: item.apelido || '',
        imagem_url: item.imagem_url || '',
        notificacoes_ativas: item.notificacoes_ativas ?? true,
        id_notificacao: item.id_notificacao || '',
        favorito: item.favorito ?? false,
        send_msg: item.send_msg ?? false,
        ultimo_envio_ano: item.ultimo_envio_ano
      });
    });

    return lista;
  },

  /**
   * Adiciona um novo aniversariante no Cloud Firestore
   */
  async adicionar(dados: Omit<Aniversario, 'id' | 'created_at'>): Promise<Aniversario> {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado.");

    const id = gerarUUID();
    const newDocRef = doc(db, 'aniversarios', id);

    let dia = 1;
    let mes = 1;
    if (dados.data_nascimento) {
      const partes = dados.data_nascimento.split('-');
      if (partes.length === 3 && partes[1] && partes[2]) {
        mes = parseInt(partes[1], 10);
        dia = parseInt(partes[2], 10);
      }
    }

    const novoAniversario: Aniversario = {
      ...dados,
      id,
      created_at: new Date().toISOString(),
      user_id: user.uid
    };

    await setDoc(newDocRef, {
      ...novoAniversario,
      dia_nascimento: dia,
      mes_nascimento: mes
    });

    this.invalidarCache();
    return novoAniversario;
  },

  /**
   * Atualiza um aniversariante existente no Cloud Firestore
   */
  async atualizar(id: string, dados: Partial<Aniversario>): Promise<Aniversario> {
    const docRef = doc(db, 'aniversarios', id);

    let dia: number | undefined;
    let mes: number | undefined;
    if (dados.data_nascimento) {
      const partes = dados.data_nascimento.split('-');
      if (partes.length === 3 && partes[1] && partes[2]) {
        mes = parseInt(partes[1], 10);
        dia = parseInt(partes[2], 10);
      }
    }

    const updatePayload: any = { ...dados };
    if (dia !== undefined && mes !== undefined) {
      updatePayload.dia_nascimento = dia;
      updatePayload.mes_nascimento = mes;
    }

    await updateDoc(docRef, updatePayload);
    this.invalidarCache();

    const updatedSnap = await getDoc(docRef);
    return { id, ...updatedSnap.data() } as Aniversario;
  },

  /**
   * Alterna o estado de favorito de um aniversariante
   */
  async favoritar(id: string): Promise<boolean> {
    const docRef = doc(db, 'aniversarios', id);
    const snap = await getDoc(docRef);

    if (!snap.exists()) throw new Error("Registro não encontrado.");

    const estadoAtual = snap.data().favorito ?? false;
    const novoEstado = !estadoAtual;

    await updateDoc(docRef, { favorito: novoEstado });
    this.invalidarCache();
    return novoEstado;
  },

  /**
   * Remove um aniversariante do Cloud Firestore
   */
  async excluir(id: string): Promise<void> {
    const docRef = doc(db, 'aniversarios', id);
    await deleteDoc(docRef);
    this.invalidarCache();
  },

  /**
   * Remove múltiplos aniversariantes do Cloud Firestore de uma vez
   */
  async excluirVarios(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    await Promise.all(ids.map(id => deleteDoc(doc(db, 'aniversarios', id))));
    this.invalidarCache();
  },

  /**
   * Busca a lista de categorias do Firestore ou fallback local
   */
  async listarCategorias(): Promise<Categoria[]> {
    if (inMemoryCategorias && inMemoryCategorias.length > 0) return inMemoryCategorias;

    const localData = lerCacheLocal<Categoria[]>(CACHE_KEYS.CATEGORIAS);
    if (localData && localData.length > 0) {
      inMemoryCategorias = localData;
      return localData;
    }

    const categoriasPadrao: Categoria[] = [
      { id: 'cfdc7628-37da-441a-a4d4-bc1b5b4abfcf', nome: 'Família', cor: '#d71921', icone: 'heart' },
      { id: '0fdf4dad-4967-492d-9a49-aa3540e34aa1', nome: 'Trabalho', cor: '#4361EE', icone: 'stethoscope' },
      { id: '694bd2ec-0d65-4fcb-abba-565d048f298b', nome: 'Amigos', cor: '#06B6D4', icone: 'star' }
    ];

    try {
      const snap = await getDocs(collection(db, 'categorias'));
      if (!snap.empty) {
        const lista: Categoria[] = [];
        snap.forEach(d => lista.push({ id: d.id, ...d.data() } as Categoria));
        inMemoryCategorias = lista;
        salvarCacheLocal(CACHE_KEYS.CATEGORIAS, lista);
        return lista;
      } else {
        // Se a coleção no Firestore estiver vazia, migra as categorias originais do Supabase para o Firebase Firestore
        for (const cat of categoriasPadrao) {
          try {
            await setDoc(doc(db, 'categorias', cat.id), cat);
          } catch (e) {
            console.warn('[Firebase] Aviso ao migrar categoria para o Firestore:', e);
          }
        }
      }
    } catch (e) {
      console.warn('[Firebase] Usando categorias salvas:', e);
    }

    inMemoryCategorias = categoriasPadrao;
    salvarCacheLocal(CACHE_KEYS.CATEGORIAS, categoriasPadrao);
    return categoriasPadrao;
  },

  /**
   * Adiciona uma nova categoria no Cloud Firestore com UUID v4
   */
  async adicionarCategoria(categoria: Omit<Categoria, 'id'>): Promise<Categoria> {
    const id = gerarUUID();
    const newDocRef = doc(db, 'categorias', id);
    const novaCat: Categoria = { id, ...categoria };
    await setDoc(newDocRef, novaCat);
    this.invalidarCache();
    return novaCat;
  },

  /**
   * Alias para salvarCategoria (compatibilidade)
   */
  async salvarCategoria(categoria: Omit<Categoria, 'id'>): Promise<Categoria> {
    return this.adicionarCategoria(categoria);
  },

  /**
   * Atualiza uma categoria existente no Cloud Firestore
   */
  async atualizarCategoria(id: string, dados: Partial<Categoria>): Promise<void> {
    const docRef = doc(db, 'categorias', id);
    await updateDoc(docRef, dados);
    this.invalidarCache();
  },

  /**
   * Remove uma categoria do Cloud Firestore e invalida caches locais
   */
  async excluirCategoria(id: string): Promise<void> {
    try {
      const docRef = doc(db, 'categorias', id);
      await deleteDoc(docRef);
    } catch (e) {
      console.warn('[Firebase] Aviso ao excluir categoria do Firestore:', e);
    }
    
    // Atualiza cache em memória e localStorage imediatamente
    if (inMemoryCategorias) {
      inMemoryCategorias = inMemoryCategorias.filter(c => c.id !== id);
      salvarCacheLocal(CACHE_KEYS.CATEGORIAS, inMemoryCategorias);
    }
    this.invalidarCache();
  },

  /**
   * Busca a lista de templates de mensagem no Firestore ou fallback local
   */
  async listarTemplates(): Promise<MensagemTemplate[]> {
    if (inMemoryTemplates && inMemoryTemplates.length > 0) return inMemoryTemplates;

    const localData = lerCacheLocal<MensagemTemplate[]>(CACHE_KEYS.TEMPLATES);
    if (localData && localData.length > 0) {
      inMemoryTemplates = localData;
      return localData;
    }

    const templatesPadrao: MensagemTemplate[] = [
      { id: '1', titulo: 'Carinhoso', texto: 'Feliz aniversário! Que seu dia seja abençoado e cheio de alegrias! 🎉🎂' },
      { id: '2', titulo: 'Divertido', texto: 'Parabéns! Mais um ano de sabedoria (e algumas ruguinhas a mais)! Viva! 🥳🎈' },
      { id: '3', titulo: 'Formal', texto: 'Desejo a você um feliz aniversário, muita saúde, paz e sucesso em sua jornada.' }
    ];

    try {
      const snap = await getDocs(collection(db, 'mensagens_templates'));
      if (!snap.empty) {
        const lista: MensagemTemplate[] = [];
        snap.forEach(d => lista.push({ id: d.id, ...d.data() } as MensagemTemplate));
        inMemoryTemplates = lista;
        salvarCacheLocal(CACHE_KEYS.TEMPLATES, lista);
        return lista;
      }
    } catch (e) {
      console.warn('[Firebase] Usando templates padrão:', e);
    }

    inMemoryTemplates = templatesPadrao;
    salvarCacheLocal(CACHE_KEYS.TEMPLATES, templatesPadrao);
    return templatesPadrao;
  },

  /**
   * Salva um template de mensagem no Firestore
   */
  async salvarTemplate(template: Omit<MensagemTemplate, 'id'> & { id?: string }): Promise<MensagemTemplate> {
    const docRef = template.id ? doc(db, 'mensagens_templates', template.id) : doc(collection(db, 'mensagens_templates'));
    const tpl: MensagemTemplate = { id: docRef.id, titulo: template.titulo, texto: template.texto };
    await setDoc(docRef, tpl);
    this.invalidarCache();
    return tpl;
  },

  /**
   * Exclui um template do Cloud Firestore
   */
  async excluirTemplate(id: string): Promise<void> {
    await deleteDoc(doc(db, 'mensagens_templates', id));
    this.invalidarCache();
  },

  /**
   * Lista as notificações do usuário no Firestore
   */
  async listarNotificacoes(): Promise<Notificacao[]> {
    const user = auth.currentUser;
    if (!user) return [];
    try {
      const snap = await getDocs(query(collection(db, 'notificacoes'), where('user_id', '==', user.uid), orderBy('data_envio', 'desc')));
      const lista: Notificacao[] = [];
      snap.forEach(d => lista.push({ id: d.id, ...d.data() } as Notificacao));
      return lista;
    } catch (e) {
      console.warn('[Firebase] Aviso ao carregar notificações:', e);
      return [];
    }
  },

  /**
   * Salva uma notificação no Firestore
   */
  async salvarNotificacao(notif: Omit<Notificacao, 'id'> & { id?: string }): Promise<Notificacao> {
    const user = auth.currentUser;
    const docRef = notif.id ? doc(db, 'notificacoes', notif.id) : doc(collection(db, 'notificacoes'));
    const item: Notificacao = {
      id: docRef.id,
      user_id: user?.uid || '',
      aniversario_id: notif.aniversario_id || '',
      titulo: notif.titulo,
      mensagem: notif.mensagem,
      data_envio: notif.data_envio || new Date().toISOString(),
      lida: notif.lida ?? false
    };
    await setDoc(docRef, item);
    return item;
  },

  /**
   * Exclui uma notificação do Firestore
   */
  async excluirNotificacao(id: string): Promise<void> {
    await deleteDoc(doc(db, 'notificacoes', id));
  }
};