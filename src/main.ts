import './styles/app.css'; 
import { auth } from './config/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { aniversarioService } from './services/aniversarioService';
import { modalAlerta } from './utils/modalAlertas';
import { createIcons, icons } from 'lucide';

// Importação das páginas
import { montarTelaRegistro } from './pages/registros';
import { montarDashboard } from './pages/dashboard';
import { montarLista } from './pages/lista';
import { montarCadastro } from './pages/cadastro';
import { montarDetalhes } from './pages/detalhes';
import { montarCalendario } from './pages/calendario';
import { montarConfiguracoes } from './pages/configuracoes';
import { montarCategorias } from './pages/categorias';
import { montarPerfil } from './pages/perfil';
import { montarUsuarios } from './pages/usuarios';

// --- INICIALIZAÇÃO ---
async function inicializar() {
    // Aplica o tema salvo no localStorage imediatamente em todo o app
    const temaSalvo = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', temaSalvo);

    // Registro do Service Worker PWA com verificação instantânea de atualização
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').then((reg) => {
            console.log('[PWA] Service Worker ativo:', reg.scope);
            reg.update();
            reg.onupdatefound = () => {
                const installingWorker = reg.installing;
                if (installingWorker) {
                    installingWorker.onstatechange = () => {
                        if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('[PWA] Nova versão instalada! Recarregando...');
                            window.location.reload();
                        }
                    };
                }
            };
        }).catch((err) => {
            console.warn('[PWA] Aviso ao registrar Service Worker:', err);
        });
    }

    // Listener de Autenticação do Firebase Auth em tempo real
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            configurarLogin();
        } else {
            const perfil = await aniversarioService.getPerfilUsuario();
            if (perfil?.status === 'blocked') {
                await signOut(auth);
                aniversarioService.invalidarCache();
                exibirTelaUsuarioBloqueado(perfil.email || user.email || 'Usuário');
                return;
            }

            if (perfil?.status === 'deleted') {
                await signOut(auth);
                aniversarioService.invalidarCache();
                exibirTelaUsuarioExcluido(perfil.email || user.email || 'Usuário');
                return;
            }

            // Dispara o pré-carregamento do cache em background para 0ms de latência
            Promise.all([
                aniversarioService.listarTodos(),
                aniversarioService.listarCategorias(),
                aniversarioService.listarTemplates()
            ]).catch(err => console.warn('Aviso no pré-carregamento:', err));

            montarLayoutEstrutural();
        }
    });
}

// --- TELA DE ACESSO ---
function configurarLogin() {
    document.body.innerHTML = `
        <div class="auth-full-page">
            <div class="auth-content-wrapper">
                <header class="auth-hero">
                    <i data-lucide="sparkles" class="hero-icon"></i>
                    <h1>Leão Festivo</h1>
                    <p>Sua curadoria de momentos especiais</p>
                </header>

                <div class="auth-form-main">
                    <div id="auth-error" class="error-msg-toast" style="display:none; margin-bottom: 20px;"></div>

                    <div class="input-modern-group">
                        <i data-lucide="user"></i>
                        <input type="email" id="email" placeholder="Seu e-mail" spellcheck="false">
                    </div>
                    
                    <div class="input-modern-group">
                        <i data-lucide="lock-keyhole"></i>
                        <input type="password" id="password" placeholder="Sua senha">
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: -6px; margin-bottom: 20px; font-size: 0.85rem;">
                        <span style="opacity: 0.85;">Esqueceu sua senha?</span>
                        <a href="#" id="linkEsqueciSenha" style="color: #FFCC00; font-weight: 700; text-decoration: underline; cursor: pointer;">Recuperar Acesso</a>
                    </div>
                    
                    <button id="btnAuthAction" class="btn-auth-submit">
                        <span>Acessar Celebrações</span>
                        <i data-lucide="party-popper"></i>
                    </button>

                    <div class="auth-links-footer">
                        <p>Ainda não faz parte? <a href="#" id="linkIrParaRegistro">Criar conta</a></p>
                    </div>
                </div>
            </div>
        </div>
    `;

    recarregarIcones();

    const emailEl = document.getElementById('email') as HTMLInputElement;
    const passEl = document.getElementById('password') as HTMLInputElement;
    const errEl = document.getElementById('auth-error');

    const limparErro = () => {
        if (errEl && errEl.style.display !== 'none') {
            errEl.style.display = 'none';
            errEl.innerText = "";
        }
    };

    emailEl?.addEventListener('input', limparErro);
    passEl?.addEventListener('input', limparErro);

    document.getElementById('linkIrParaRegistro')?.addEventListener('click', (e) => {
        e.preventDefault();
        montarTelaRegistro();
    });

    // ESQUECI MINHA SENHA
    document.getElementById('linkEsqueciSenha')?.addEventListener('click', (e) => {
        e.preventDefault();
        abrirModalRecuperacaoSenha(emailEl?.value || '');
    });

    document.getElementById('btnAuthAction')?.addEventListener('click', async () => {
        const btn = document.getElementById('btnAuthAction') as HTMLButtonElement;
        
        btn.disabled = true;
        const originalContent = btn.innerHTML;
        btn.innerHTML = `<span>Autenticando...</span>`;

        try {
            await signInWithEmailAndPassword(auth, emailEl.value.trim(), passEl.value);
            const perfil = await aniversarioService.getPerfilUsuario();
            if (perfil?.status === 'blocked') {
                await signOut(auth);
                aniversarioService.invalidarCache();
                exibirTelaUsuarioBloqueado(emailEl.value || perfil.email || 'Usuário');
                return;
            }
            if (perfil?.status === 'deleted') {
                await signOut(auth);
                aniversarioService.invalidarCache();
                exibirTelaUsuarioExcluido(emailEl.value || perfil.email || 'Usuário');
                return;
            }
            window.location.hash = '#dash';
            window.location.reload();
        } catch (error: any) {
            if (errEl) {
                let msg = "E-mail ou senha incorretos.";
                if (error.code === 'auth/api-key-not-valid') {
                    msg = "⚠️ Credenciais do Firebase não configuradas! Cole sua API Key real no arquivo .env.";
                } else if (error.code === 'auth/configuration-not-found' || error.code === 'auth/operation-not-allowed') {
                    msg = "⚠️ O método de login por E-mail/Senha precisa ser ativado no Firebase Console (Autenticação -> Métodos de login -> E-mail/senha -> Ativar -> Salvar).";
                } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                    msg = "E-mail ou senha incorretos. Se ainda não se cadastrou, clique em 'Criar conta' abaixo.";
                } else if (error.message) {
                    msg = error.message;
                }
                errEl.innerText = msg;
                errEl.style.display = 'block';
            }
            btn.disabled = false;
            btn.innerHTML = originalContent;
            recarregarIcones();
        }
    });
}

// --- TELA VISUAL DE USUÁRIO BLOQUEADO OU SUSPENSO ---
function exibirTelaUsuarioBloqueado(emailTarget: string) {
    document.body.innerHTML = `
        <div class="auth-full-page" style="background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%);">
            <div class="auth-content-wrapper" style="max-width: 440px;">
                <div class="blocked-card-icon" style="margin-bottom: 24px;">
                    <div style="width: 84px; height: 84px; margin: 0 auto; background: rgba(239, 68, 68, 0.15); border: 2px solid #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 30px rgba(239, 68, 68, 0.3);">
                        <i data-lucide="shield-alert" style="width: 44px; height: 44px; color: #ef4444;"></i>
                    </div>
                </div>

                <div class="blocked-badge" style="display: inline-flex; align-items: center; gap: 6px; background: rgba(239, 68, 68, 0.2); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.4); padding: 6px 16px; border-radius: 30px; font-size: 0.82rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;">
                    <i data-lucide="lock" style="width: 14px; height: 14px; color: #ef4444;"></i> Acesso Restrito / Bloqueado
                </div>

                <h2 style="font-size: 1.8rem; font-weight: 800; color: #ffffff; margin: 0 0 12px 0;">Conta Suspensa</h2>
                
                <p style="font-size: 0.95rem; color: #cbd5e1; line-height: 1.6; margin-bottom: 24px;">
                    A conta referente ao e-mail <strong style="color: #ffffff;">${emailTarget}</strong> está temporariamente bloqueada ou desativada pelo Administrador do sistema.
                </p>

                <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 18px; text-align: left; margin-bottom: 24px;">
                    <div style="display: flex; align-items: center; gap: 10px; color: #fbbf24; font-weight: 600; font-size: 0.88rem; margin-bottom: 6px;">
                        <i data-lucide="info" style="width: 18px; height: 18px;"></i> Como proceder?
                    </div>
                    <p style="font-size: 0.82rem; color: #94a3b8; margin: 0; line-height: 1.5;">
                        Se você acredita que isso foi um engano ou precisa solicitar a reativação do seu acesso, entre em contato com a equipe de administração do sistema.
                    </p>
                </div>

                <button id="btnVoltarLoginBloqueado" class="btn-auth-submit" style="background: rgba(255,255,255,0.1); color: #ffffff; border: 1px solid rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <i data-lucide="arrow-left"></i>
                    <span>Voltar à Tela de Login</span>
                </button>
            </div>
        </div>
    `;

    recarregarIcones();

    document.getElementById('btnVoltarLoginBloqueado')?.addEventListener('click', async () => {
        await signOut(auth);
        aniversarioService.invalidarCache();
        configurarLogin();
    });
}

// --- TELA VISUAL DE USUÁRIO EXCLUÍDO ---
function exibirTelaUsuarioExcluido(emailTarget: string) {
    document.body.innerHTML = `
        <div class="auth-full-page" style="background: linear-gradient(135deg, #27272a 0%, #09090b 100%);">
            <div class="auth-content-wrapper" style="max-width: 440px;">
                <div class="blocked-card-icon" style="margin-bottom: 24px;">
                    <div style="width: 84px; height: 84px; margin: 0 auto; background: rgba(244, 63, 94, 0.15); border: 2px solid #f43f5e; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 30px rgba(244, 63, 94, 0.3);">
                        <i data-lucide="user-x" style="width: 44px; height: 44px; color: #f43f5e;"></i>
                    </div>
                </div>

                <div class="blocked-badge" style="display: inline-flex; align-items: center; gap: 6px; background: rgba(244, 63, 94, 0.2); color: #fecdd3; border: 1px solid rgba(244, 63, 94, 0.4); padding: 6px 16px; border-radius: 30px; font-size: 0.82rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;">
                    <i data-lucide="trash-2" style="width: 14px; height: 14px; color: #f43f5e;"></i> Conta Encerrada / Excluída
                </div>

                <h2 style="font-size: 1.8rem; font-weight: 800; color: #ffffff; margin: 0 0 12px 0;">Conta Excluída</h2>
                
                <p style="font-size: 0.95rem; color: #d4d4d8; line-height: 1.6; margin-bottom: 24px;">
                    A conta vinculada ao e-mail <strong style="color: #ffffff;">${emailTarget}</strong> foi permanentemente excluída do sistema.
                </p>

                <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 18px; text-align: left; margin-bottom: 24px;">
                    <div style="display: flex; align-items: center; gap: 10px; color: #f87171; font-weight: 600; font-size: 0.88rem; margin-bottom: 6px;">
                        <i data-lucide="alert-circle" style="width: 18px; height: 18px;"></i> O que isto significa?
                    </div>
                    <p style="font-size: 0.82rem; color: #a1a1aa; margin: 0; line-height: 1.5;">
                        Seu cadastro foi removido da plataforma. Caso ache que isto ocorreu por engano ou deseja criar uma nova conta, utilize as opções abaixo.
                    </p>
                </div>

                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <button id="btnCriarNovaContaExcluido" class="btn-auth-submit" style="background: #0052FF; color: #ffffff; border: none; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <i data-lucide="user-plus"></i>
                        <span>Criar Nova Conta</span>
                    </button>

                    <button id="btnVoltarLoginExcluido" class="btn-auth-submit" style="background: rgba(255,255,255,0.08); color: #ffffff; border: 1px solid rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <i data-lucide="log-out"></i>
                        <span>Voltar à Tela de Login</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    recarregarIcones();

    document.getElementById('btnCriarNovaContaExcluido')?.addEventListener('click', async () => {
        await signOut(auth);
        aniversarioService.invalidarCache();
        montarTelaRegistro();
    });

    document.getElementById('btnVoltarLoginExcluido')?.addEventListener('click', async () => {
        await signOut(auth);
        aniversarioService.invalidarCache();
        configurarLogin();
    });
}

// MODAL PARA SOLICITAR RECUPERAÇÃO DE SENHA POR E-MAIL
function abrirModalRecuperacaoSenha(emailInicial: string) {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'fec-modal-overlay active';
    
    modalOverlay.innerHTML = `
        <div class="fec-modal-box modal-type-info" style="max-width: 420px; border-top: 4px solid #0052FF;">
            <div class="fec-modal-icon info" style="background: rgba(0, 82, 255, 0.12); color: #0052FF;">
                <i data-lucide="key-round"></i>
            </div>
            <div class="fec-modal-title" style="font-size: 1.35rem; font-weight: 800;">Recuperação de Acesso</div>
            <div class="fec-modal-message" style="margin-bottom: 20px; font-size: 0.9rem; line-height: 1.5; color: var(--fec-text-muted);">
                Informe seu e-mail cadastrado para receber o link seguro de redefinição de senha.
            </div>

            <div class="input-modern-group" style="margin-bottom: 24px; border: 1px solid rgba(0,0,0,0.12);">
                <i data-lucide="mail"></i>
                <input type="email" id="inEmailReset" value="${emailInicial}" placeholder="seu@email.com..." spellcheck="false" style="width: 100%; border: none; outline: none; background: transparent; padding: 14px 10px; font-size: 0.95rem;">
            </div>

            <div class="fec-modal-footer" style="display: flex; gap: 10px;">
                <button class="btn-modal btn-modal-secondary" id="btnCancelReset" style="flex: 1;">Cancelar</button>
                <button class="btn-modal btn-modal-primary" id="btnConfirmReset" style="flex: 1.4; background: #0052FF; color: #fff; font-weight: 700;">Enviar Link</button>
            </div>
        </div>
    `;

    document.body.appendChild(modalOverlay);
    recarregarIcones();

    modalOverlay.querySelector('#btnCancelReset')?.addEventListener('click', () => modalOverlay.remove());
    modalOverlay.querySelector('#btnConfirmReset')?.addEventListener('click', async () => {
        const email = (modalOverlay.querySelector('#inEmailReset') as HTMLInputElement).value.trim();
        if (!email || !email.includes('@')) {
            return modalAlerta.show({ message: "Por favor, digite um e-mail válido.", type: "warning" });
        }

        modalAlerta.showLoading("Enviando e-mail de recuperação...");
        try {
            await aniversarioService.enviarEmailRecuperacaoSenha(email);
            modalAlerta.close();
            modalOverlay.remove();
            modalAlerta.show({ 
                title: "E-mail Enviado!",
                message: `Enviamos o link de redefinição de senha para ${email}. Verifique sua caixa de entrada ou spam.`, 
                type: "success" 
            });
        } catch (e: any) {
            modalAlerta.close();
            modalAlerta.show({ message: e.message || "Erro ao enviar e-mail de recuperação.", type: "error" });
        }
    });
}

// TELA DE CRIAÇÃO DE NOVA SENHA (APÓS CLICAR NO LINK DO E-MAIL)
export function configurarRedefinicaoSenha() {
    document.body.innerHTML = `
        <div class="auth-full-page">
            <div class="auth-content-wrapper">
                <header class="auth-hero">
                    <i data-lucide="sparkles" class="hero-icon"></i>
                    <h1>Leão Festivo</h1>
                    <p>Redefinição de Senha de Acesso</p>
                </header>

                <div class="auth-form-main">
                    <div id="auth-error" class="error-msg-toast" style="display:none; margin-bottom: 20px;"></div>

                    <div class="input-modern-group">
                        <i data-lucide="lock-keyhole"></i>
                        <input type="password" id="novaSenhaInput" placeholder="Sua nova senha (mínimo 6 caracteres)">
                    </div>

                    <div class="input-modern-group">
                        <i data-lucide="shield-check"></i>
                        <input type="password" id="confirmaNovaSenhaInput" placeholder="Confirme a nova senha">
                    </div>
                    
                    <button id="btnSalvarNovaSenha" class="btn-auth-submit">
                        <span>Salvar Nova Senha</span>
                        <i data-lucide="check"></i>
                    </button>
                </div>
            </div>
        </div>
    `;

    recarregarIcones();

    const pass1 = document.getElementById('novaSenhaInput') as HTMLInputElement;
    const pass2 = document.getElementById('confirmaNovaSenhaInput') as HTMLInputElement;
    const errEl = document.getElementById('auth-error');

    document.getElementById('btnSalvarNovaSenha')?.addEventListener('click', async () => {
        if (!pass1.value || pass1.value.length < 6) {
            if (errEl) { errEl.innerText = "A senha deve conter no mínimo 6 caracteres."; errEl.style.display = 'block'; }
            return;
        }
        if (pass1.value !== pass2.value) {
            if (errEl) { errEl.innerText = "As senhas não coincidem."; errEl.style.display = 'block'; }
            return;
        }

        modalAlerta.showLoading("Atualizando senha...");
        try {
            await aniversarioService.atualizarSenha(pass1.value);
            modalAlerta.close();
            await modalAlerta.show({ title: "Senha Atualizada!", message: "Sua senha foi redefinida com sucesso. Faça login para continuar.", type: "success" });
            window.location.hash = '';
            window.location.reload();
        } catch (e: any) {
            modalAlerta.close();
            if (errEl) { errEl.innerText = e.message || "Erro ao redefinir senha."; errEl.style.display = 'block'; }
        }
    });
}

// --- LAYOUT ESTRUTURAL ---
function montarLayoutEstrutural() {
    document.body.innerHTML = `
        <div id="app-container">
            <header id="app-header">
                <div class="header-content">
                    <div class="header-branding" onclick="window.navegar('dash')" style="cursor: pointer;">
                        <i data-lucide="sparkles" class="header-icon-gold"></i>
                        <span class="app-title-header">leão festivo</span>
                    </div>
                    <div style="display: flex; gap: 6px; align-items: center;">
                        <button id="btnPerfilTop" title="Perfil do Usuário" class="btn-logout-minimal">
                            <i data-lucide="user"></i>
                        </button>
                        <button id="btnLogoutTop" title="Sair" class="btn-logout-minimal">
                            <i data-lucide="log-out"></i>
                        </button>
                    </div>
                </div>
            </header>
            
            <main id="main-content" class="main-content"></main>

            <!-- BOTÃO FLUTUANTE DE ADICIONAR (FAB) COM ANIMAÇÃO DE ROTAÇÃO NO CANTO INFERIOR DIREITO -->
            <button id="fabAddFloating" class="fab-floating-btn" title="Adicionar Aniversariante" onclick="window.navegar('form')">
                <i data-lucide="plus"></i>
            </button>
            
            <nav id="app-nav" class="nav-bottom-container"></nav>
        </div>
    `;

    document.getElementById('btnPerfilTop')?.addEventListener('click', () => {
        irPara('perfil');
    });

    document.getElementById('btnLogoutTop')?.addEventListener('click', async () => {
        aniversarioService.invalidarCache();
        await signOut(auth);
        window.location.hash = '';
        window.location.reload();
    });

    renderizarNavegacao();
    
    // Listener de Hash para suportar o botão "Voltar" do navegador
    window.addEventListener('hashchange', () => {
        processarRotaAtual();
    });

    // Processamento da rota inicial
    processarRotaAtual(); 
}

function processarRotaAtual() {
    const hashCompleto = window.location.hash.replace('#', '') || 'dash';
    let pagina = hashCompleto;
    let idParam = '';

    if (hashCompleto.includes('/')) {
        const partes = hashCompleto.split('/');
        pagina = partes[0] || 'dash';
        idParam = partes[1] || '';
    }

    rotacionarBotaoAdd(pagina);
    atualizarTabAtivaUI(pagina);

    const container = document.getElementById('main-content');
    if (!container) return;

    switch (pagina) {
        case 'dash':
            montarDashboard(container);
            break;
        case 'lista':
            montarLista(container);
            break;
        case 'form':
            montarCadastro(container, idParam);
            break;
        case 'detalhes':
            montarDetalhes(container, idParam);
            break;
        case 'calendario':
            montarCalendario(container);
            break;
        case 'config':
            montarConfiguracoes(container);
            break;
        case 'categorias':
            montarCategorias(container);
            break;
        case 'perfil':
            montarPerfil(container);
            break;
        case 'usuarios':
            montarUsuarios(container);
            break;
        default:
            montarDashboard(container);
    }

    recarregarIcones();
    window.scrollTo(0, 0);
}

function rotacionarBotaoAdd(pagina: string) {
    const fab = document.getElementById('fabAddFloating');
    if (!fab) return;

    if (pagina === 'form') {
        fab.classList.add('active-form');
    } else {
        fab.classList.remove('active-form');
    }
}

function renderizarNavegacao() {
    const nav = document.getElementById('app-nav');
    if (!nav) return;

    nav.innerHTML = `
        <div class="tab-bar-scrollable">
            <button class="nav-item" data-route="dash">
                <i data-lucide="layout-grid"></i>
                <span>Painel</span>
            </button>
            <button class="nav-item" data-route="lista">
                <i data-lucide="users"></i>
                <span>Lista</span>
            </button>
            <button class="nav-item" data-route="calendario">
                <i data-lucide="calendar"></i>
                <span>Agenda</span>
            </button>
            <button class="nav-item" data-route="config">
                <i data-lucide="settings-2"></i>
                <span>Ajustes</span>
            </button>
        </div>
    `;

    nav.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const route = (btn as HTMLElement).dataset.route;
            if (route) irPara(route);
        });
    });

    recarregarIcones();
}

function atualizarTabAtivaUI(pagina: string) {
    document.querySelectorAll('.nav-item').forEach(btn => {
        const route = (btn as HTMLElement).dataset.route;
        if (route === pagina) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function irPara(pagina: string, paramOrId?: string) {
    if (paramOrId) {
        window.location.hash = `#${pagina}/${paramOrId}`;
    } else {
        window.location.hash = `#${pagina}`;
    }
}

(window as any).navegar = irPara;

function recarregarIcones() {
    try {
        createIcons({ icons });
    } catch (e) {
        console.warn('Aviso na renderização de ícones:', e);
    }
}

let deferredPromptPWA: any = null;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPromptPWA = e;
});

export function dispararInstalacaoPWA(callback?: (aceitou: boolean) => void) {
    if (deferredPromptPWA) {
        deferredPromptPWA.prompt();
        deferredPromptPWA.userChoice.then((choiceResult: any) => {
            if (callback) callback(choiceResult.outcome === 'accepted');
            deferredPromptPWA = null;
        });
    } else {
        if (callback) callback(false);
    }
}

// Inicia a aplicação no carregamento do DOM
document.addEventListener('DOMContentLoaded', inicializar);