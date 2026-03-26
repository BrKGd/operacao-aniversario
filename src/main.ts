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
    // Fundo sólido imediato para evitar tela branca
    document.body.style.backgroundColor = "#fcfcfd";
    document.body.style.margin = "0";
    document.body.style.padding = "0";

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        configurarLogin();
    } else {
        montarLayoutEstrutural();
    }
}

// --- TELA DE ACESSO (LAYOUT TELA CHEIA - SEM CARDS) ---
function configurarLogin() {
    // CSS Crítico injetado para ocupar a tela toda e estilizar inputs instantaneamente
    const style = document.createElement('style');
    style.innerHTML = `
        .auth-full-wrapper { 
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; 
            display: flex; flex-direction: column; align-items: center; justify-content: center; 
            background: #fcfcfd; z-index: 9999; opacity: 0; transition: opacity 0.5s ease;
            padding: 24px; box-sizing: border-box;
        }
        .auth-content-area { width: 100%; max-width: 400px; }
        .auth-header { text-align: center; margin-bottom: 40px; }
        .auth-header h1 { font-size: 2.5rem; margin: 0; color: #003366; letter-spacing: -1px; }
        
        .input-group { position: relative; margin-bottom: 20px; width: 100%; }
        .input-group i { 
            position: absolute; left: 18px; top: 50%; transform: translateY(-50%); 
            color: #94a3b8; z-index: 10; width: 20px; 
        }
        .input-group input { 
            width: 100%; height: 52px; border-radius: 12px; border: 1.5px solid #e2e8f0;
            padding: 0 20px 0 58px; font-size: 16px; outline: none; background: white;
            box-sizing: border-box; transition: border-color 0.2s;
        }
        .input-group input:focus { border-color: #003366; }
        .input-group input::placeholder { color: #94a3b8; text-align: left; }

        .btn-login-main { 
            width: 100%; height: 56px; border-radius: 12px; border: none;
            background: #003366; color: white; font-weight: 700; font-size: 1rem;
            cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;
            box-shadow: 0 4px 12px rgba(0, 51, 102, 0.15);
        }
        .error-msg { color: #b0151a; font-size: 0.85rem; margin-top: 10px; text-align: center; }
        .auth-footer { margin-top: 30px; text-align: center; color: #64748b; }
        .auth-footer a { color: #003366; text-decoration: none; font-weight: 600; }
    `;
    document.head.appendChild(style);

    document.body.innerHTML = `
        <div class="auth-full-wrapper" id="auth-viewport">
            <div class="auth-content-area">
                <div class="auth-header">
                    <i data-lucide="sparkles" style="color: #d4af37; width: 48px; height: 48px; margin-bottom: 10px;"></i>
                    <h1>Leão Festivo</h1>
                    <p>Sua curadoria de momentos especiais</p>
                </div>

                <div class="auth-form">
                    <div class="input-group">
                        <i data-lucide="user"></i>
                        <input type="email" id="email" placeholder="Seu e-mail" autocomplete="email">
                    </div>
                    
                    <div class="input-group">
                        <i data-lucide="lock-keyhole"></i>
                        <input type="password" id="password" placeholder="Sua senha" autocomplete="current-password">
                    </div>
                    
                    <button id="btnAuthAction" class="btn-login-main">
                        <span>Acessar Celebrações</span>
                        <i data-lucide="party-popper"></i>
                    </button>
                    
                    <div id="auth-error" class="error-msg" style="display:none;"></div>

                    <div class="auth-footer">
                        <p>Ainda não faz parte? <a href="#" id="linkIrParaRegistro">Criar conta</a></p>
                    </div>
                </div>
            </div>
        </div>
    `;

    recarregarIcones();
    
    const viewport = document.getElementById('auth-viewport');
    if (viewport) {
        requestAnimationFrame(() => viewport.style.opacity = '1');
    }

    const emailEl = document.getElementById('email') as HTMLInputElement;
    const passEl = document.getElementById('password') as HTMLInputElement;
    const btn = document.getElementById('btnAuthAction') as HTMLButtonElement;

    const realizarLogin = async () => {
        if (btn.disabled) return;
        btn.disabled = true;
        btn.innerHTML = `<span>Carregando...</span>`;

        const { error } = await supabase.auth.signInWithPassword({ 
            email: emailEl.value, 
            password: passEl.value 
        });

        if (error) {
            const errEl = document.getElementById('auth-error');
            if (errEl) {
                errEl.innerText = "E-mail ou senha incorretos.";
                errEl.style.display = 'block';
            }
            btn.disabled = false;
            btn.innerHTML = `<span>Acessar Celebrações</span><i data-lucide="party-popper"></i>`;
            recarregarIcones();
        } else {
            window.location.reload();
        }
    };

    btn.addEventListener('click', realizarLogin);
    passEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') realizarLogin();
    });

    document.getElementById('linkIrParaRegistro')?.addEventListener('click', (e) => {
        e.preventDefault();
        montarTelaRegistro();
    });
}

// --- LAYOUT ESTRUTURAL (DASHBOARD) ---
function montarLayoutEstrutural() {
    document.body.innerHTML = `
        <div id="app-container">
            <header id="app-header">
                <div class="header-content">
                    <div class="header-branding">
                        <i data-lucide="sparkles" class="header-icon-gold"></i>
                        <span class="app-title-header">Leão Festivo</span>
                    </div>
                    <button id="btnLogoutTop" class="btn-logout-minimal">
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
    irPara(window.location.hash.replace('#', '') || 'dash'); 
}

// --- NAVEGAÇÃO ---
function renderizarNavegacao() {
    const nav = document.getElementById('app-nav');
    if (!nav) return;

    nav.innerHTML = `
        <div class="nav-bottom-container">
            <div class="tab-bar-scrollable">
                <button class="nav-item" data-route="dash" id="nav-dash">
                    <i data-lucide="layout-grid"></i>
                    <span>Início</span>
                </button>
                <button class="nav-item" data-route="list" id="nav-list">
                    <i data-lucide="contact-2"></i>
                    <span>Pessoas</span>
                </button>
                <div class="fab-item-wrapper">
                    <button class="fab-button" id="nav-form">
                        <i data-lucide="plus"></i>
                    </button>
                </div>
                <button class="nav-item" data-route="calendario" id="nav-calendario">
                    <i data-lucide="calendar-heart"></i>
                    <span>Datas</span>
                </button>
                <button class="nav-item" data-route="config" id="nav-config">
                    <i data-lucide="settings-2"></i>
                    <span>Ajustes</span>
                </button>
            </div>
        </div>
    `;

    document.getElementById('nav-dash')?.addEventListener('click', () => irPara('dash'));
    document.getElementById('nav-list')?.addEventListener('click', () => irPara('list'));
    document.getElementById('nav-form')?.addEventListener('click', () => irPara('form'));
    document.getElementById('nav-calendario')?.addEventListener('click', () => irPara('calendario'));
    document.getElementById('nav-config')?.addEventListener('click', () => irPara('config'));

    recarregarIcones();
}

// --- ROTAS ---
export async function irPara(tela: string, params?: any) {
    const container = document.getElementById('main-content');
    if (!container) return;

    window.location.hash = tela;
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-route="${tela}"]`)?.classList.add('active');

    container.innerHTML = `<div class="fec-center-wrapper"><div class="fec-loader-minimal">Organizando eventos...</div></div>`;

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