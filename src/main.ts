import './styles/app.css'; 
import { supabase } from './supabaseClient';

// ✅ Forma correta do Lucide (vanilla)
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

// --- INICIALIZAÇÃO ---
async function inicializar() {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        configurarLogin();
    } else {
        montarLayoutEstrutural();
    }
}

// --- TELA DE LOGIN ---
function configurarLogin() {
    document.body.innerHTML = `
        <div class="auth-container">
            <div class="auth-card">
                <div class="auth-header">
                    <img src="./escudo-fec.png" alt="Fortaleza EC" class="auth-logo"> 
                    <h1>Operação Aniversário</h1>
                    <p>Acesso restrito à convocação</p>
                </div>

                <div class="auth-form">
                    <div class="input-group">
                        <i data-lucide="mail"></i>
                        <input type="email" id="email" placeholder="E-mail oficial">
                    </div>
                    
                    <div class="input-group">
                        <i data-lucide="lock"></i>
                        <input type="password" id="password" placeholder="Sua senha">
                    </div>
                    
                    <button id="btnAuthAction" class="btn-login-main">
                        <span>Entrar no Campo</span>
                        <i data-lucide="chevron-right"></i>
                    </button>
                    
                    <div id="auth-error" class="error-msg" style="display:none;"></div>

                    <div class="auth-footer" style="margin-top: 20px; font-size: 0.9rem;">
                        <p>Novo integrante? <a href="#" id="linkIrParaRegistro" style="color: var(--fec-blue); font-weight: bold;">Solicitar Acesso</a></p>
                    </div>
                </div>
            </div>
        </div>
    `;

    recarregarIcones();

    document.getElementById('linkIrParaRegistro')?.addEventListener('click', (e) => {
        e.preventDefault();
        montarTelaRegistro();
    });

    document.getElementById('btnAuthAction')?.addEventListener('click', async () => {
        const emailEl = document.getElementById('email') as HTMLInputElement;
        const passEl = document.getElementById('password') as HTMLInputElement;
        const btn = document.getElementById('btnAuthAction') as HTMLButtonElement;
        
        btn.disabled = true;
        btn.innerHTML = `<span>Entrando...</span>`;

        const { error } = await supabase.auth.signInWithPassword({ 
            email: emailEl.value, 
            password: passEl.value 
        });

        if (error) {
            const errEl = document.getElementById('auth-error');
            if (errEl) {
                errEl.innerText = "Credenciais inválidas.";
                errEl.style.display = 'block';
            }
            btn.disabled = false;
            btn.innerHTML = `<span>Entrar no Campo</span><i data-lucide="chevron-right"></i>`;
            recarregarIcones();
        } else {
            window.location.reload();
        }
    });
}

// --- LAYOUT ---
function montarLayoutEstrutural() {
    document.body.innerHTML = `
        <div id="app-container">
            <header id="app-header">
                <div class="header-content">
                    <img src="./assets/favicon.ico" class="mini-logo">
                    <span class="app-title-header">Leão Festivo</span>
                    <button id="btnLogoutTop" class="btn-logout-minimal" title="Sair">
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
    irPara('dash'); 
}

// --- NAVEGAÇÃO ---
function renderizarNavegacao() {
    const nav = document.getElementById('app-nav');
    if (!nav) return;

    nav.innerHTML = `
        <div class="nav-bottom-container">
            <div class="tab-bar-scrollable">

                <button class="nav-item" data-route="dash" onclick="window.navegar('dash')">
                    <i data-lucide="layout-dashboard"></i>
                    <span>Início</span>
                </button>
                
                <button class="nav-item" data-route="list" onclick="window.navegar('list')">
                    <i data-lucide="users"></i>
                    <span>Elenco</span>
                </button>

                <button class="nav-item" data-route="detalhes" onclick="window.navegar('detalhes')">
                    <i data-lucide="user"></i>
                    <span>Perfil</span>
                </button>

                <div class="fab-item-wrapper">
                    <button class="fab-button" onclick="window.navegar('form')">
                        <i data-lucide="plus"></i>
                    </button>
                </div>

                <button class="nav-item" data-route="calendario" onclick="window.navegar('calendario')">
                    <i data-lucide="calendar-days"></i>
                    <span>Agenda</span>
                </button>

                <button class="nav-item" data-route="notificacoes" onclick="window.navegar('notificacoes')">
                    <i data-lucide="bell"></i>
                    <span>Avisos</span>
                </button>

                <button class="nav-item" data-route="config" onclick="window.navegar('config')">
                    <i data-lucide="settings"></i>
                    <span>Ajustes</span>
                </button>

            </div>
        </div>
    `;

    // @ts-ignore
    window.navegar = (t, p) => irPara(t, p);

    recarregarIcones();
}

// --- ROTAS ---
export async function irPara(tela: string, params?: any) {
    const container = document.getElementById('main-content');
    if (!container) return;

    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-route="${tela}"]`)?.classList.add('active');

    container.innerHTML = `<div class="loading">Carregando tática...</div>`;

    switch (tela) {
        case 'dash': await montarDashboard(container); break;
        case 'list': await montarLista(container); break;
        case 'form': await montarCadastro(container, params); break;
        case 'notificacoes': await montarNotificacoes(container); break;
        case 'detalhes': await montarDetalhes(container, params); break;
        case 'calendario': await montarCalendario(container); break;
        case 'config': await montarConfiguracoes(container); break;
        default: await montarDashboard(container);
    }

    recarregarIcones();
}

// ✅ Função correta e simples
function recarregarIcones() {
    createIcons({ icons });
}

document.addEventListener('DOMContentLoaded', inicializar);
