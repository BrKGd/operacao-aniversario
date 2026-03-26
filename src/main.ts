import './styles/app.css'; 
import { supabase } from './supabaseClient';
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

// --- INICIALIZAÇÃO ---
async function inicializar() {
    // Define a cor de fundo padrão imediatamente para evitar a tela branca
    document.body.style.backgroundColor = "#fcfcfd"; 
    
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        configurarLogin();
    } else {
        montarLayoutEstrutural();
    }
}

// --- TELA DE ACESSO (CONVITE DE GALA - TELA CHEIA) ---
function configurarLogin() {
    // Injetamos o HTML com opacidade 0 para uma transição suave após o carregamento
    document.body.innerHTML = `
        <div class="auth-container" id="auth-viewport" style="opacity: 0; transition: opacity 0.3s ease-in-out;">
            <div class="auth-card">
                <div class="auth-header">
                    <div class="auth-icon-wrapper">
                        <i data-lucide="sparkles" class="icon-gold-lg"></i>
                    </div>
                    <h1>Aniversários</h1>
                    <p>Sua curadoria exclusiva de celebrações</p>
                </div>

                <div class="auth-form">
                    <div class="input-group">
                        <i data-lucide="mail"></i>
                        <input type="email" id="email" placeholder="E-mail de acesso" autocomplete="email">
                    </div>
                    
                    <div class="input-group">
                        <i data-lucide="fingerprint"></i>
                        <input type="password" id="password" placeholder="Sua chave pessoal" autocomplete="current-password">
                    </div>
                    
                    <button id="btnAuthAction" class="btn-login-main">
                        <span>Entrar</span>
                        <i data-lucide="arrow-right"></i>
                    </button>
                    
                    <div id="auth-error" class="error-msg" style="display:none;"></div>

                    <div class="auth-footer">
                        <p>Ainda não é membro? <a href="#" id="linkIrParaRegistro">Cadastre-se</a></p>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Renderiza ícones e torna a tela visível instantaneamente
    recarregarIcones();
    requestAnimationFrame(() => {
        const viewport = document.getElementById('auth-viewport');
        if (viewport) viewport.style.opacity = '1';
    });

    const emailEl = document.getElementById('email') as HTMLInputElement;
    const passEl = document.getElementById('password') as HTMLInputElement;
    const btn = document.getElementById('btnAuthAction') as HTMLButtonElement;

    // --- LÓGICA DE LOGIN ---
    const executarLogin = async () => {
        if (btn.disabled) return;
        
        const email = emailEl.value.trim();
        const password = passEl.value;

        if (!email || !password) return;

        btn.disabled = true;
        btn.innerHTML = `<span>Preparando o salão...</span>`;

        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            const errEl = document.getElementById('auth-error');
            if (errEl) {
                errEl.innerText = "Credenciais não reconhecidas.";
                errEl.style.display = 'block';
            }
            btn.disabled = false;
            btn.innerHTML = `<span>Entrar</span><i data-lucide="arrow-right"></i>`;
            recarregarIcones();
        } else {
            window.location.reload();
        }
    };

    // Evento de Clique
    btn.addEventListener('click', executarLogin);

    // Evento de Tecla Enter no campo de senha
    passEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') executarLogin();
    });

    document.getElementById('linkIrParaRegistro')?.addEventListener('click', (e) => {
        e.preventDefault();
        montarTelaRegistro();
    });
}

// --- LAYOUT ESTRUTURAL (AMBIENTE SOFISTICADO) ---
function montarLayoutEstrutural() {
    document.body.innerHTML = `
        <div id="app-container">
            <header id="app-header">
                <div class="header-content">
                    <div class="header-branding">
                        <i data-lucide="gift" class="header-icon-gold"></i>
                        <span class="app-title-header">Leão Festivo</span>
                    </div>
                    <button id="btnLogoutTop" class="btn-logout-minimal" title="Encerrar Sessão">
                        <i data-lucide="log-out"></i>
                    </button>
                </div>
            </header>
            
            <main id="main-content" class="main-content"></main>
            
            <nav id="app-nav" class="nav-bottom-container"></nav>
        </div>
    `;

    document.getElementById('btnLogoutTop')?.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.reload();
    });

    renderizarNavegacao();
    
    const rotaInicial = window.location.hash.replace('#', '') || 'dash';
    irPara(rotaInicial); 
}

// --- NAVEGAÇÃO ---
function renderizarNavegacao() {
    const nav = document.getElementById('app-nav');
    if (!nav) return;

    nav.innerHTML = `
        <div class="tab-bar-scrollable">
            <button class="nav-item" data-route="dash" id="nav-dash">
                <i data-lucide="layout-dashboard"></i>
                <span>Painel</span>
            </button>
            
            <button class="nav-item" data-route="list" id="nav-list">
                <i data-lucide="party-popper"></i>
                <span>Celebrantes</span>
            </button>

            <div class="fab-item-wrapper">
                <button class="fab-button" id="nav-form" title="Novo Homenageado">
                    <i data-lucide="plus-circle"></i>
                </button>
            </div>

            <button class="nav-item" data-route="calendario" id="nav-calendario">
                <i data-lucide="calendar-days"></i>
                <span>Agenda</span>
            </button>

            <button class="nav-item" data-route="config" id="nav-config">
                <i data-lucide="settings"></i>
                <span>Ajustes</span>
            </button>
        </div>
    `;

    // Listeners de navegação modernos
    document.getElementById('nav-dash')?.addEventListener('click', () => irPara('dash'));
    document.getElementById('nav-list')?.addEventListener('click', () => irPara('list'));
    document.getElementById('nav-form')?.addEventListener('click', () => irPara('form'));
    document.getElementById('nav-calendario')?.addEventListener('click', () => irPara('calendario'));
    document.getElementById('nav-config')?.addEventListener('click', () => irPara('config'));

    window.addEventListener('hashchange', () => {
        const rota = window.location.hash.replace('#', '');
        if (rota) irPara(rota);
    });

    recarregarIcones();
}

// --- GESTOR DE FLUXO ---
export async function irPara(tela: string, params?: any) {
    const container = document.getElementById('main-content');
    if (!container) return;

    window.location.hash = tela;
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-route="${tela}"]`)?.classList.add('active');

    container.innerHTML = `
        <div class="loading">
            <div class="loader-elegant"></div>
            <span>Organizando sua agenda...</span>
        </div>
    `;

    const rotaLimpa = tela.split('?')[0];

    switch (rotaLimpa) {
        case 'dash': await montarDashboard(container); break;
        case 'list': await montarLista(container); break;
        case 'form': await montarCadastro(container, params); break;
        case 'notificacoes': await montarNotificacoes(container); break;
        case 'detalhes': await montarDetalhes(container, params); break;
        case 'calendario': await montarCalendario(container); break;
        case 'config': await montarConfiguracoes(container); break;
        case 'categorias': await montarCategorias(container); break;
        default: await montarDashboard(container);
    }

    recarregarIcones();
}

function recarregarIcones() {
    createIcons({ icons });
}

document.addEventListener('DOMContentLoaded', inicializar);