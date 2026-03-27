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
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        configurarLogin();
    } else {
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

// --- LAYOUT ESTRUTURAL ---
function montarLayoutEstrutural() {
    document.body.innerHTML = `
        <div id="app-container">
            <header id="app-header">
                <div class="header-content">
                    <div class="header-branding">
                        <i data-lucide="sparkles" class="header-icon-gold"></i>
                        <span class="app-title-header">leão festivo</span>
                    </div>
                    <button id="btnLogoutTop" title="Sair" class="btn-logout-minimal">
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
        window.location.hash = '';
        window.location.reload();
    });

    renderizarNavegacao();
    
    // Escutador de mudança de URL (Botão voltar/avançar e cliques)
    window.addEventListener('hashchange', () => {
        processarRotaAtual();
    });

    // Inicializa a primeira tela
    processarRotaAtual(); 
}

/**
 * Extrai a rota e o ID da URL de forma segura para o TypeScript
 */
function processarRotaAtual() {
    const hashCompleto = window.location.hash.replace('#', '') || 'dash';
    const [tela, query] = hashCompleto.split('?');
    
    const paramsURL = new URLSearchParams(query || '');
    const id = paramsURL.get('id'); 

    // O uso de 'id ?? undefined' resolve o erro 2345:
    // Converte null (do navegador) para undefined (do parâmetro opcional)
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

                <div class="fab-item-wrapper">
                    <button class="fab-button" onclick="window.navegar('form')">
                        <i data-lucide="plus"></i>
                    </button>
                </div>

                <button class="nav-item" data-route="calendario" onclick="window.navegar('calendario')">
                    <i data-lucide="calendar-heart"></i>
                    <span>Datas</span>
                </button>

                <button class="nav-item" data-route="config" onclick="window.navegar('config')">
                    <i data-lucide="settings-2"></i>
                    <span>Ajustes</span>
                </button>
            </div>
        </div>
    `;

    // Atualiza a URL e deixa o evento 'hashchange' disparar a renderização
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

    // Roteamento baseado no nome da tela
    switch (tela) {
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