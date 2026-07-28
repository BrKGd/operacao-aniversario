import './styles/app.css'; 
import { supabase } from './supabaseClient';
import { aniversarioService } from './services/aniversarioService';
import { modalAlerta } from './utils/modalAlertas';
import { createIcons, icons } from 'lucide';

// Importação das páginas
import { montarTelaRegistro } from './pages/registros';
import { montarDashboard } from './pages/dashboard';
import { montarLista } from './pages/lista';
import { montarCadastro } from './pages/cadastro';
import { montarNotificacoes } from './pages/notificacoes';
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

    // Registro do Service Worker PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').then((reg) => {
            console.log('[PWA] Service Worker ativo:', reg.scope);
        }).catch((err) => {
            console.warn('[PWA] Aviso ao registrar Service Worker:', err);
        });
    }

    // Verificar se é retorno de e-mail de recuperação de senha (Supabase Auth callback)
    const hash = window.location.hash;
    if (hash.includes('type=recovery') || hash.includes('access_token')) {
        configurarRedefinicaoSenha();
        return;
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        configurarLogin();
    } else {
        const perfil = await aniversarioService.getPerfilUsuario();
        if (perfil?.status === 'blocked') {
            await supabase.auth.signOut();
            aniversarioService.invalidarCache();
            configurarLogin();
            modalAlerta.show({ 
                title: "Acesso Suspenso", 
                message: "Sua conta de usuário foi temporariamente bloqueada pelo Administrador do sistema.", 
                type: "error" 
            });
            return;
        }

        // Dispara o aquecimento do cache em background para 0ms de latencia
        Promise.all([
            aniversarioService.listarTodos(),
            aniversarioService.listarCategorias(),
            aniversarioService.listarTemplates()
        ]).catch(err => console.warn('Aviso no pré-carregamento:', err));

        montarLayoutEstrutural();
    }
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

                    <div style="text-align: right; margin-top: -8px; margin-bottom: 18px;">
                        <a href="#" id="linkEsqueciSenha" style="color: #0052FF; font-size: 0.82rem; font-weight: 700; text-decoration: none;">Esqueci minha senha</a>
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

        const { error } = await supabase.auth.signInWithPassword({ 
            email: emailEl.value, 
            password: passEl.value 
        });

        if (error) {
            if (errEl) {
                errEl.innerText = "E-mail ou senha incorretos.";
                errEl.style.display = 'block';
            }
            btn.disabled = false;
            btn.innerHTML = originalContent;
            recarregarIcones();
        } else {
            window.location.hash = '#dash';
            window.location.reload();
        }
    });
}

// MODAL PARA SOLICITAR RECUPERAÇÃO DE SENHA POR E-MAIL
function abrirModalRecuperacaoSenha(emailInicial: string) {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'fec-modal-overlay active';
    
    modalOverlay.innerHTML = `
        <div class="fec-modal-box modal-type-info">
            <div class="fec-modal-icon info">
                <i data-lucide="mail"></i>
            </div>
            <div class="fec-modal-title">Recuperar Senha</div>
            <div class="fec-modal-message">Informe seu e-mail para receber as instruções de redefinição de senha</div>

            <input type="email" class="catg-input-text" id="inEmailReset" value="${emailInicial}" placeholder="seu@email.com..." style="margin-bottom: 20px;">

            <div class="fec-modal-footer">
                <button class="btn-modal btn-modal-secondary" id="btnCancelReset">Cancelar</button>
                <button class="btn-modal btn-modal-primary" id="btnConfirmReset">Enviar E-mail</button>
            </div>
        </div>
    `;

    document.body.appendChild(modalOverlay);
    recarregarIcones();

    modalOverlay.querySelector('#btnCancelReset')?.addEventListener('click', () => modalOverlay.remove());
    modalOverlay.querySelector('#btnConfirmReset')?.addEventListener('click', async () => {
        const email = (modalOverlay.querySelector('#inEmailReset') as HTMLInputElement).value.trim();
        if (!email || !email.includes('@')) {
            return modalAlerta.show({ message: "Digite um e-mail válido.", type: "warning" });
        }

        modalAlerta.showLoading("Enviando e-mail...");
        try {
            await aniversarioService.enviarEmailRecuperacaoSenha(email);
            modalAlerta.close();
            modalOverlay.remove();
            modalAlerta.show({ 
                title: "E-mail Enviado!",
                message: "Enviamos as instruções para o seu e-mail. Verifique a caixa de entrada para redefinir a senha.", 
                type: "success" 
            });
        } catch (e: any) {
            modalAlerta.close();
            modalAlerta.show({ message: e.message || "Erro ao enviar e-mail de recuperação.", type: "error" });
        }
    });
}

// TELA DE CRIAÇÃO DE NOVA SENHA (APÓS CLICAR NO LINK DO E-MAIL)
function configurarRedefinicaoSenha() {
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
                        <button id="btnConfigTop" title="Painel de Ajustes" class="btn-logout-minimal">
                            <i data-lucide="settings-2"></i>
                        </button>
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

    document.getElementById('btnConfigTop')?.addEventListener('click', () => {
        irPara('config');
    });

    document.getElementById('btnPerfilTop')?.addEventListener('click', () => {
        irPara('perfil');
    });

    document.getElementById('btnLogoutTop')?.addEventListener('click', async () => {
        aniversarioService.invalidarCache();
        await supabase.auth.signOut();
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

/**
 * Extrai a rota e o ID da URL de forma segura para o TypeScript
 */
function processarRotaAtual() {
    const hashCompleto = window.location.hash.replace('#', '') || 'dash';
    const partes = hashCompleto.split('?');
    
    const tela = partes[0] as string; 
    const query = partes[1] || '';
    
    const paramsURL = new URLSearchParams(query);
    const id = paramsURL.get('id'); 

    irPara(tela, id ?? undefined);
}

// --- NAVEGAÇÃO ---
function renderizarNavegacao() {
    const nav = document.getElementById('app-nav');
    if (!nav) return;

    nav.innerHTML = `
        <div class="nav-bottom-container">
            <div class="tab-bar-scrollable">
                <button class="nav-item" data-route="dash" onclick="window.navegar('dash')">
                    <i data-lucide="layout-grid"></i>
                    <span>Início</span>
                </button>
                
                <button class="nav-item" data-route="list" onclick="window.navegar('list')">
                    <i data-lucide="contact-2"></i>
                    <span>Pessoas</span>
                </button>

                <button class="nav-item" data-route="calendario" onclick="window.navegar('calendario')">
                    <i data-lucide="calendar-heart"></i>
                    <span>Datas</span>
                </button>

                <button class="nav-item" data-route="config" onclick="window.navegar('config')">
                    <i data-lucide="settings-2"></i>
                    <span>Ajustes</span>
                </button>

                <button class="nav-item" data-route="perfil" onclick="window.navegar('perfil')">
                    <i data-lucide="user"></i>
                    <span>Perfil</span>
                </button>
            </div>
        </div>
    `;

    // @ts-ignore
    window.navegar = (tela: string, id?: string) => {
        window.location.hash = id ? `${tela}?id=${id}` : tela;
    };

    recarregarIcones();
}

// --- RENDERIZADOR DE TELAS ---
export async function irPara(tela: string, params?: any) {
    const container = document.getElementById('main-content');
    if (!container) return;

    // Atualiza estado visual da navegação
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`[data-route="${tela}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    container.innerHTML = `
        <div class="fec-center-wrapper">
            <div class="fec-loader-minimal">Organizando eventos...</div>
        </div>
    `;

    // Roteamento
    switch (tela) {
        case 'dash': await montarDashboard(container); break;
        case 'list': await montarLista(container); break;
        case 'form': await montarCadastro(container, params); break;
        case 'notificacoes': await montarNotificacoes(container); break;
        case 'detalhes': await montarDetalhes(container, params); break;
        case 'calendario': await montarCalendario(container); break;
        case 'config': await montarConfiguracoes(container); break;
        case 'categorias': await montarCategorias(container); break;
        case 'perfil': await montarPerfil(container); break;
        case 'usuarios': await montarUsuarios(container); break;
        default: await montarDashboard(container);
    }

    recarregarIcones();
}

function recarregarIcones() {
    // @ts-ignore
    if (typeof createIcons === 'function') {
        createIcons({ icons });
    }
}

// --- PWA PROMPT HANDLER ---
let pwaInstallPrompt: any = null;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    pwaInstallPrompt = e;
});

export function dispararInstalacaoPWA(cbStatus?: (sucesso: boolean) => void) {
    if (pwaInstallPrompt) {
        pwaInstallPrompt.prompt();
        pwaInstallPrompt.userChoice.then((choiceResult: any) => {
            const aceitou = choiceResult.outcome === 'accepted';
            if (cbStatus) cbStatus(aceitou);
            pwaInstallPrompt = null;
        });
    } else if (cbStatus) {
        cbStatus(false);
    }
}

document.addEventListener('DOMContentLoaded', inicializar);