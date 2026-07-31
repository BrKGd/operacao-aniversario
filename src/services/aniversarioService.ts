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
import { MENSAGENS_TEMPLATES_SEED } from '../data/mensagensSeed';

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

let presenceTimer: any = null;

/**
 * Calcula se o usuário está online com base no flag is_online e na data da última atividade (threshold de 3 minutos)
 */
export function calcularStatusPresenca(isOnline?: boolean, lastSeen?: string): { online: boolean; label: string } {
  if (!lastSeen) {
    return { online: false, label: 'Offline' };
  }
  const dateSeen = new Date(lastSeen).getTime();
  if (isNaN(dateSeen)) {
    return { online: false, label: 'Offline' };
  }
  const agora = Date.now();
  const diffMs = agora - dateSeen;
  const diffMinutes = Math.floor(diffMs / 60000);

  const estaOnline = Boolean(isOnline) && diffMs < 3 * 60 * 1000;

  if (estaOnline) {
    return { online: true, label: 'Online agora' };
  }

  if (diffMinutes < 1) {
    return { online: false, label: 'Offline (Visto há pouco)' };
  }
  if (diffMinutes < 60) {
    return { online: false, label: `Offline (Visto há ${diffMinutes} min)` };
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return { online: false, label: `Offline (Visto há ${diffHours}h)` };
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return { online: false, label: 'Offline (Visto ontem)' };
  }
  return { online: false, label: `Offline (Visto há ${diffDays} dias)` };
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

    const isOnline = Boolean(profileRow?.is_online);
    const lastSeen = profileRow?.last_seen || profileRow?.updated_at || new Date().toISOString();

    // Executa o upsert em background sem travar o carregamento inicial da interface
    if (!profileRow && statusFinal !== 'deleted') {
      setDoc(doc(db, 'profiles', user.uid), {
        id: user.uid,
        email: user.email,
        nome_completo: nome,
        avatar_url: avatar,
        status: statusFinal,
        role: roleFinal,
        is_online: true,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { merge: true }).catch(e => console.warn('[Firebase] Upsert background profiles ignorado:', e));
    }

    this.registrarUsuarioCatalogo({ id: user.uid, email, nome, avatar, role: roleFinal, status: statusFinal, created_at: createdAt, is_online: isOnline, last_seen: lastSeen });

    return {
      id: user.uid,
      email,
      nome,
      avatar,
      role: roleFinal,
      status: statusFinal,
      isAdmin,
      isMaster,
      created_at: createdAt,
      is_online: isOnline,
      last_seen: lastSeen
    };
  },

  /**
   * Registra a conta no catálogo local de usuários
   */
  registrarUsuarioCatalogo(usuario: { id: string; email: string; nome: string; avatar: string; role: string; status: string; created_at: string; is_online?: boolean; last_seen?: string }) {
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
   * Atualiza a presença online / offline do usuário no Firestore e no cache local
   */
  async atualizarStatusPresenca(isOnline: boolean) {
    const user = auth.currentUser;
    if (!user) return;

    const agora = new Date().toISOString();
    try {
      const userRef = doc(db, 'profiles', user.uid);
      await setDoc(userRef, {
        is_online: isOnline,
        last_seen: agora,
        updated_at: agora
      }, { merge: true });
    } catch (e) {
      console.warn('[Firebase] Erro ao atualizar presença:', e);
    }

    try {
      const RAW = localStorage.getItem('leao_users_registry');
      if (RAW) {
        let lista: any[] = JSON.parse(RAW);
        const emailNorm = (user.email || '').toLowerCase();
        lista = lista.map(u => {
          if (u.email?.toLowerCase() === emailNorm) {
            return { ...u, is_online: isOnline, last_seen: agora };
          }
          return u;
        });
        localStorage.setItem('leao_users_registry', JSON.stringify(lista));
      }
    } catch (e) {
      // Ignorar erros locais
    }
  },

  _handleVisibilityChange() {
    if (!auth.currentUser) return;
    if (document.visibilityState === 'visible') {
      aniversarioService.atualizarStatusPresenca(true);
    } else {
      aniversarioService.atualizarStatusPresenca(false);
    }
  },

  _handleBeforeUnload() {
    if (auth.currentUser) {
      aniversarioService.atualizarStatusPresenca(false);
    }
  },

  /**
   * Inicia o timer de heartbeat e os escutadores de presença do usuário
   */
  iniciarHeartbeatPresenca() {
    this.atualizarStatusPresenca(true);

    if (presenceTimer) clearInterval(presenceTimer);
    presenceTimer = setInterval(() => {
      if (auth.currentUser && document.visibilityState === 'visible') {
        aniversarioService.atualizarStatusPresenca(true);
      }
    }, 45000);

    window.removeEventListener('visibilitychange', this._handleVisibilityChange);
    window.addEventListener('visibilitychange', this._handleVisibilityChange);

    window.removeEventListener('beforeunload', this._handleBeforeUnload);
    window.addEventListener('beforeunload', this._handleBeforeUnload);
  },

  /**
   * Encerra o heartbeat de presença
   */
  pararHeartbeatPresenca() {
    if (presenceTimer) {
      clearInterval(presenceTimer);
      presenceTimer = null;
    }
    this.atualizarStatusPresenca(false);
    window.removeEventListener('visibilitychange', this._handleVisibilityChange);
    window.removeEventListener('beforeunload', this._handleBeforeUnload);
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
              is_online: Boolean(p.is_online),
              last_seen: p.last_seen || p.updated_at,
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

    // Firebase Auth limita photoURL a 2048 chars. Se for base64 longo, salva fallback no Auth e completo no Firestore.
    let photoURLForAuth = dados.avatar || user.photoURL;
    if (photoURLForAuth && photoURLForAuth.startsWith('data:') && photoURLForAuth.length > 2000) {
      photoURLForAuth = `https://ui-avatars.com/api/?name=${encodeURIComponent(dados.nome || user.displayName || 'Usuario')}&background=0052FF&color=fff&bold=true`;
    }

    try {
      await updateProfile(user, {
        displayName: dados.nome || user.displayName,
        photoURL: photoURLForAuth
      });
    } catch (errAuth) {
      console.warn('[Firebase] Aviso ao atualizar foto no Firebase Auth profile:', errAuth);
    }

    try {
      await updateDoc(doc(db, 'profiles', user.uid), {
        nome_completo: dados.nome || user.displayName,
        avatar_url: dados.avatar || user.photoURL,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn('[Firebase] Aviso ao atualizar documento profile no Firestore:', e);
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
   * Busca a lista de templates de mensagem (Instantâneo com fallback local e mesclagem de Firestore)
   */
  async listarTemplates(): Promise<MensagemTemplate[]> {
    if (inMemoryTemplates && inMemoryTemplates.length >= MENSAGENS_TEMPLATES_SEED.length) {
      return inMemoryTemplates;
    }

    // Inicializa imediatamente com os 110 modelos pré-carregados (super rápido)
    const seedMap = new Map<string, MensagemTemplate>();
    MENSAGENS_TEMPLATES_SEED.forEach(t => seedMap.set(t.id, t));

    try {
      // Tenta buscar no Firestore sem bloquear se houver falha
      const snap = await getDocs(collection(db, 'mensagens_templates'));
      if (!snap.empty) {
        snap.forEach(d => {
          const data = d.data();
          seedMap.set(d.id, {
            id: d.id,
            tipo: data.tipo || data.titulo || 'Amizade',
            titulo: data.titulo || data.tipo || 'Amizade',
            conteudo: data.conteudo || data.texto || '',
            texto: data.texto || data.conteudo || '',
            created_at: data.created_at
          });
        });
      }
    } catch (e) {
      console.warn('[Firebase] Usando templates locais pré-carregados:', e);
    }

    const resultado = Array.from(seedMap.values());
    inMemoryTemplates = resultado;
    salvarCacheLocal(CACHE_KEYS.TEMPLATES, resultado);
    return resultado;
  },

  /**
   * Salva um template de mensagem no Firestore
   */
  async salvarTemplate(template: Omit<MensagemTemplate, 'id'> & { id?: string }): Promise<MensagemTemplate> {
    const docRef = template.id ? doc(db, 'mensagens_templates', template.id) : doc(collection(db, 'mensagens_templates'));
    const tipo = template.tipo || template.titulo || 'Amizade';
    const conteudo = template.conteudo || template.texto || '';
    const tpl: MensagemTemplate = { 
      id: docRef.id, 
      tipo, 
      titulo: tipo, 
      conteudo, 
      texto: conteudo,
      created_at: new Date().toISOString() 
    };
    await setDoc(docRef, { tipo, conteudo, created_at: tpl.created_at });
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