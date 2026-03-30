import '../styles/dashboard.css';
import whatsappIcon from '../assets/whatsapp.png';
import { aniversarioService } from '../services/aniversarioService';
import { Aniversario, MensagemTemplate } from '../types';
import { 
    createIcons, 
    Send, 
    TrendingUp, 
    Calendar, 
    MessageCircle, 
    ChevronRight,
    Star,
    Sparkles,
    LogOut,
    LayoutGrid,
    Contact2,
    Plus,
    CalendarHeart,
    Settings2,
    User,
    X,
    Filter
} from 'lucide';

const DASHBOARD_ICONS = { 
    Send, TrendingUp, Calendar, MessageCircle, ChevronRight, Star,
    Sparkles, LogOut, LayoutGrid, Contact2, Plus, CalendarHeart, Settings2, User, X, Filter
};

let templatesGlobais: MensagemTemplate[] = [];

// Configuração de Previsão
const DIAS_PREVISAO = 15;

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

export async function montarDashboard(container: HTMLElement) {
    container.innerHTML = `
        <div class="dash-loader-container">
            <div class="fec-loader-minimal">A carregar painel...</div>
        </div>
    `;

    try {
        const hoje = new Date();
        const todos: Aniversario[] = await aniversarioService.listarTodos();
        templatesGlobais = await aniversarioService.listarTemplates();
        
        const aniversariantesHoje = todos.filter((p: Aniversario) => {
            if (!p.data_nascimento) return false;
            const d = new Date(p.data_nascimento + 'T00:00:00');
            return d.getDate() === hoje.getDate() && d.getMonth() === hoje.getMonth();
        });

        const proximosEventos = todos.map(p => {
            if (!p.data_nascimento) return null;
            const d = new Date(p.data_nascimento + 'T00:00:00');
            const niverEsteAno = new Date(hoje.getFullYear(), d.getMonth(), d.getDate());
            
            if (niverEsteAno < hoje && (hoje.getDate() !== d.getDate() || hoje.getMonth() !== d.getMonth())) {
                niverEsteAno.setFullYear(hoje.getFullYear() + 1);
            }

            const diffTime = niverEsteAno.getTime() - hoje.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const idadeNova = niverEsteAno.getFullYear() - d.getFullYear();

            return { ...p, diffDays, dataObj: d, idadeNova };
        })
        .filter((p): p is (Aniversario & { diffDays: number; dataObj: Date; idadeNova: number }) => 
            p !== null && p.diffDays > 0 && p.diffDays <= DIAS_PREVISAO
        )
        .sort((a, b) => a.diffDays - b.diffDays);

        const temAniversariante = aniversariantesHoje.length > 0;

        container.innerHTML = `
            <div class="dash-container">
                <header class="dash-header">
                    <div class="user-welcome">
                        <h1>Painel de Controle</h1>
                        <p>${capitalize(hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }))}</p>
                    </div>
                    <div class="dash-actions">
                        <div class="badge-total-mes" title="Total do mês">
                            <i data-lucide="calendar-heart"></i>
                            <span>${todos.filter(p => p.data_nascimento && new Date(p.data_nascimento + 'T00:00:00').getMonth() === hoje.getMonth()).length}</span>
                        </div>
                    </div>
                </header>

                <section class="hero-section">
                    <div class="hero-stack-container" id="heroStack" style="touch-action: pan-y;">
                        ${temAniversariante ? aniversariantesHoje.map((p, index) => {
                            const templateSorteado = templatesGlobais.length > 0 
                                ? templatesGlobais[Math.floor(Math.random() * templatesGlobais.length)]
                                : null;
                            const msgCard = templateSorteado?.conteudo || "Desejamos um excelente dia e um feliz aniversário!";

                            return `
                            <div class="hero-card-stacked" style="--index: ${index}; --total: ${aniversariantesHoje.length}">
                                <span class="hero-tag">Hoje é o dia de</span>
                                <div class="hero-main-info">
                                    <div class="hero-avatar-wrapper" onclick="window.navegar('detalhes', '${p.id}')">
                                        <img src="${p.imagem_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.nome || 'U')}&background=ffffff&color=003399&bold=true&size=128`}" class="hero-img">
                                        <div class="hero-crown">👑</div>
                                    </div>
                                    <div class="hero-text-data">
                                        <h2 class="hero-nome">${(p.nome || 'Usuário').split(' ')[0]}</h2>
                                        <div class="hero-msg-row">
                                            <p class="hero-sub">"${msgCard}"</p>
                                            <button class="btn-send-quick" title="Enviar esta frase" 
                                                onclick="window.enviarZapDireto('${p.telefone || ''}', '${msgCard}')">
                                                <img src="${whatsappIcon}" alt="WhatsApp" style="width: 20px; height: 20px;">
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <button class="btn-parabens-hero" onclick="window.abrirSeletorDash('${p.nome}', '${p.telefone || ''}')">
                                    <img src="${whatsappIcon}" alt="WhatsApp" style="width: 24px; height: 24px;"> ESCOLHER MENSAGEM
                                </button>
                                <div class="hero-pattern"></div>
                            </div>
                        `; }).join('') : `
                            <div class="hero-card-stacked empty">
                                <span class="hero-tag">SEM EVENTOS</span>
                                <div class="hero-empty-state">
                                    <div style="text-align: center; padding: 20px;">
                                        <i data-lucide="user" style="width: 40px; height: 40px; opacity: 0.2; margin-bottom: 10px;"></i>
                                        <p>Tudo tranquilo por aqui hoje.</p>
                                    </div>
                                </div>
                            </div>
                        `}
                    </div>
                </section>

                <section class="proximos-section">
                    <div class="section-header">
                        <h3 class="section-title"><i data-lucide="calendar"></i> Próximos ${DIAS_PREVISAO} dias</h3>
                        <span class="count-badge">
                        ${proximosEventos.length} 
                        ${proximosEventos.length === 1 ? 'agendado' : 'agendados'}
                        </span>
                    </div>
                    
                    <div class="proximos-list">
                        ${proximosEventos.length > 0 ? proximosEventos.map(p => `
                            <div class="card-atleta-modern" onclick="window.navegar('detalhes', '${p.id}')">
                                <div class="atleta-card-3x4">
                                    ${p.imagem_url 
                                        ? `<img src="${p.imagem_url}" alt="Foto" class="cat-thumb">` 
                                        : `<span class="cat-placeholder">${p.nome?.substring(0,2).toUpperCase() || 'AN'}</span>`
                                    }
                                    <div class="date-overlay">
                                        <span class="mes">
                                            ${p.dataObj.getDate()} de ${capitalize(p.dataObj.toLocaleString('pt-BR', { month: 'long' }))}
                                        </span>
                                    </div>
                                </div>
                                <div class="atleta-info-main">
                                    <span class="atleta-nome">${p.nome || 'Contato'}</span>
                                    <span class="atleta-status">
                                        Em ${p.diffDays} ${p.diffDays === 1 ? 'dia' : 'dias'}, faz ${p.idadeNova} anos
                                    </span>
                                </div>
                                <div class="atleta-action">
                                    <i data-lucide="chevron-right"></i>
                                </div>
                            </div>
                        `).join('') : `
                            <div class="dash-empty-list" style="text-align:center; padding: 40px; color: #94a3b8; font-size: 0.9rem;">
                                <p>Sem eventos previstos para este período.</p>
                            </div>
                        `}
                    </div>
                </section>
            </div>

            <div id="drawer-mensagem-dash" class="drawer-cal">
                <div class="drawer-cal-content">
                    <div class="drawer-handle"></div>
                    <div class="drawer-cal-header">
                        <div class="drawer-cal-title">
                            <div>
                                <h3 id="dash-drawer-nome">Enviar Mensagem</h3>
                                <p>Selecione um modelo para enviar</p>
                            </div>
                        </div>
                        <button class="btn-close-drawer" onclick="window.fecharDrawerDash()">
                            <i data-lucide="x"></i>
                        </button>
                    </div>
                    <div id="dash-pills-container" class="pills-container-scroll"></div>
                    <div id="dash-templates-list" class="lista-templates-container"></div>
                </div>
            </div>
        `;

        // Funções Globais (WhatsApp e Drawer)
        (window as any).enviarZapDireto = (tel: string, msg: string) => {
            if (!tel) return alert("Telefone não cadastrado.");
            window.open(`https://api.whatsapp.com/send?phone=55${tel.replace(/\D/g, '')}&text=${encodeURIComponent(msg)}`, '_blank');
        };

        (window as any).abrirSeletorDash = (nome: string, tel: string) => {
            const drawer = document.getElementById('drawer-mensagem-dash');
            const list = document.getElementById('dash-templates-list');
            const pillsContainer = document.getElementById('dash-pills-container');
            const targetNome = document.getElementById('dash-drawer-nome');

            if (drawer && list && pillsContainer && targetNome) {
                targetNome.innerText = `Para ${nome.split(' ')[0]}`;
                const tiposMensagens = [...new Set(templatesGlobais.map(t => t.tipo))].sort();
                let tipoAtivo: string | null = null;

                const renderTemplates = (filtro: string | null) => {
                    const filtrados = filtro ? templatesGlobais.filter(t => t.tipo === filtro) : templatesGlobais;
                    list.innerHTML = filtrados.map(t => `
                        <div class="template-item-cal" onclick="window.enviarZapDireto('${tel}', '${t.conteudo}')">
                            <div class="template-info">
                                <span class="badge-categoria-msg">${t.tipo}</span>
                                <p class="template-texto-cal">${t.conteudo}</p>
                            </div>
                            <div class="btn-enviar-template-cal">
                                <img src="${whatsappIcon}" alt="WhatsApp" style="width: 20px; height: 20px;">
                            </div>
                        </div>
                    `).join('');
                    createIcons({ icons: DASHBOARD_ICONS });
                };

                const renderPills = () => {
                    pillsContainer.innerHTML = `
                        <button class="btn-pill-filter ${!tipoAtivo ? 'active' : ''}" data-tipo="all">Todos</button>
                        ${tiposMensagens.map(tipo => `
                            <button class="btn-pill-filter ${tipoAtivo === tipo ? 'active' : ''}" data-tipo="${tipo}">${tipo}</button>
                        `).join('')}
                    `;
                    pillsContainer.querySelectorAll('.btn-pill-filter').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            const tipo = (e.currentTarget as HTMLElement).dataset.tipo;
                            tipoAtivo = tipo === 'all' ? null : tipo!;
                            renderPills();
                            renderTemplates(tipoAtivo);
                        });
                    });
                };

                renderPills();
                renderTemplates(null);
                drawer.classList.add('active');
            }
        };

        (window as any).fecharDrawerDash = () => {
            document.getElementById('drawer-mensagem-dash')?.classList.remove('active');
        };

        createIcons({ icons: DASHBOARD_ICONS });

        if (temAniversariante) {
            inicializarStack();
        }

    } catch (error) {
        console.error('Erro no Dashboard:', error);
        container.innerHTML = `<div class="error-msg">Erro ao carregar informações.</div>`;
    }
}

function inicializarStack() {
    const stack = document.getElementById('heroStack');
    if (!stack) return;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let moveX = 0;
    let moveY = 0;
    let gestureDirection: 'horizontal' | 'vertical' | null = null;

    let cards = Array.from(stack.querySelectorAll('.hero-card-stacked')) as HTMLElement[];
    if (cards.length <= 1) return;

    const aplicarTransformacoes3D = () => {
        cards.forEach((card, index) => {
            card.style.transition = isDragging ? 'none' : 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.5s ease';
            const scale = Math.max(0.7, 1 - (index * 0.1));
            const translateZ = index * -100;
            const translateY = index * 10; 
            card.style.zIndex = (cards.length - index).toString();
            card.style.opacity = index > 2 ? '0' : (1 - index * 0.3).toString();
            card.style.transform = `translateZ(${translateZ}px) translateY(${translateY}px) scale(${scale})`;
        });
    };

    const handleStart = (e: PointerEvent) => {
        if ((e.target as HTMLElement).closest('button')) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        gestureDirection = null;
        stack.style.userSelect = 'none';
    };

    const handleMove = (e: PointerEvent) => {
        if (!isDragging) return;
        moveX = e.clientX - startX;
        moveY = e.clientY - startY;

        if (!gestureDirection && (Math.abs(moveX) > 10 || Math.abs(moveY) > 10)) {
            gestureDirection = Math.abs(moveX) > Math.abs(moveY) ? 'horizontal' : 'vertical';
        }

        if (gestureDirection === 'horizontal') {
            if (e.cancelable) e.preventDefault();
            e.stopPropagation();
            const mainCard = cards[0];
            if (mainCard) {
                const rotY = moveX / 15;
                mainCard.style.transform = `translateX(${moveX * 0.8}px) rotateY(${rotY}deg) scale(1.05)`;
            }
        } 
    };

    const handleEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        stack.style.userSelect = 'auto';
        const threshold = 100;

        if (gestureDirection === 'horizontal' && Math.abs(moveX) > threshold) {
            if (moveX > 0) {
                const last = cards.pop();
                if (last) { cards.unshift(last); stack.prepend(last); }
            } else {
                const first = cards.shift();
                if (first) { cards.push(first); stack.appendChild(first); }
            }
        }
        moveX = 0; moveY = 0; gestureDirection = null;
        aplicarTransformacoes3D();
    };

    stack.addEventListener('pointerdown', handleStart);
    window.addEventListener('pointermove', handleMove, { passive: false });
    window.addEventListener('pointerup', handleEnd);
    window.addEventListener('pointercancel', handleEnd);
    stack.addEventListener('dragstart', (e) => e.preventDefault());
    aplicarTransformacoes3D();
}