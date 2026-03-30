import '../styles/dashboard.css';
import { aniversarioService } from '../services/aniversarioService';
import { Aniversario } from '../types';
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
    User
} from 'lucide';

export async function montarDashboard(container: HTMLElement) {
    container.innerHTML = `
        <div class="dash-loader-container">
            <div class="fec-loader-minimal">A carregar painel...</div>
        </div>
    `;

    try {
        const hoje = new Date();
        const todos: Aniversario[] = await aniversarioService.listarTodos();
        const templates = await aniversarioService.listarTemplates();
        
        const mensagemAleatoria = templates.length > 0 
            ? templates[Math.floor(Math.random() * templates.length)].conteudo 
            : "Desejamos um excelente dia e um feliz aniversário!";

        const aniversariantesHoje = todos.filter((p: Aniversario) => {
            if (!p.data_nascimento) return false;
            const d = new Date(p.data_nascimento + 'T00:00:00');
            return d.getDate() === hoje.getDate() && d.getMonth() === hoje.getMonth();
        });

        const proximos7Dias = todos.map(p => {
            if (!p.data_nascimento) return null;
            const d = new Date(p.data_nascimento + 'T00:00:00');
            const niverEsteAno = new Date(hoje.getFullYear(), d.getMonth(), d.getDate());
            
            if (niverEsteAno < hoje && (hoje.getDate() !== d.getDate() || hoje.getMonth() !== d.getMonth())) {
                niverEsteAno.setFullYear(hoje.getFullYear() + 1);
            }

            const diffTime = niverEsteAno.getTime() - hoje.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return { ...p, diffDays, dataObj: d };
        })
        .filter((p): p is (NonNullable<typeof p>) => p !== null && p.diffDays > 0 && p.diffDays <= 7)
        .sort((a, b) => a.diffDays - b.diffDays);

        const temAniversariante = aniversariantesHoje.length > 0;

        container.innerHTML = `
            <div class="dash-container">
                <header class="dash-header">
                    <div class="user-welcome">
                        <h1>Painel de Controle</h1>
                        <p>${hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    </div>
                    <div class="dash-actions">
                        <div class="badge-total-mes" title="Total do mês">
                            <i data-lucide="calendar-heart"></i>
                            <span>${todos.filter(p => p.data_nascimento && new Date(p.data_nascimento + 'T00:00:00').getMonth() === hoje.getMonth()).length}</span>
                        </div>
                    </div>
                </header>

                <section class="hero-section">
                    <div class="hero-stack-container" id="heroStack">
                        ${temAniversariante ? aniversariantesHoje.map((p, index) => `
                            <div class="hero-card-stacked" style="--index: ${index}; --total: ${aniversariantesHoje.length}">
                                <span class="hero-tag">HOJE É O DIA DELE(A)</span>
                                <div class="hero-main-info">
                                    <div class="hero-avatar-wrapper">
                                        <img src="${p.imagem_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.nome || 'U')}&background=ffffff&color=003399&bold=true&size=128`}" class="hero-img">
                                        <div class="hero-crown">👑</div>
                                    </div>
                                    <div class="hero-text-data">
                                        <h2 class="hero-nome">${(p.nome || 'Usuário').split(' ')[0]}</h2>
                                        <p class="hero-sub">"${mensagemAleatoria}"</p>
                                    </div>
                                </div>
                                <button class="btn-parabens-hero" onclick="window.navegar('detalhes', '${p.id}')">
                                    <i data-lucide="message-circle"></i> ENVIAR PARABÉNS
                                </button>
                                <div class="hero-pattern"></div>
                            </div>
                        `).join('') : `
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
                        <h3 class="section-title"><i data-lucide="calendar"></i> Próximos Eventos</h3>
                        <span class="count-badge">${proximos7Dias.length} agendados</span>
                    </div>
                    
                    <div class="proximos-list">
                        ${proximos7Dias.length > 0 ? proximos7Dias.map(p => `
                            <div class="card-atleta-modern" onclick="window.navegar('detalhes', '${p.id}')">
                                <div class="atleta-card-3x4">
                                    ${p.imagem_url 
                                        ? `<img src="${p.imagem_url}" alt="Foto" class="cat-thumb">` 
                                        : `<span class="cat-placeholder">${p.nome?.substring(0,2).toUpperCase() || 'AN'}</span>`
                                    }
                                    <div class="date-overlay">
                                        <span class="dia">${p.dataObj.getDate()}</span>
                                        <span class="mes">${p.dataObj.toLocaleString('pt-BR', { month: 'short' }).toUpperCase()}</span>
                                    </div>
                                </div>
                                <div class="atleta-info-main">
                                    <span class="atleta-nome">${p.nome || 'Contato'}</span>
                                    <span class="atleta-status">Em ${p.diffDays} ${p.diffDays === 1 ? 'dia' : 'dias'}</span>
                                </div>
                                <div class="atleta-action">
                                    <i data-lucide="chevron-right"></i>
                                </div>
                            </div>
                        `).join('') : `
                            <div class="dash-empty-list" style="text-align:center; padding: 40px; color: #94a3b8; font-size: 0.9rem;">
                                <p>Sem eventos previstos para esta semana.</p>
                            </div>
                        `}
                    </div>
                </section>
            </div>
        `;

        createIcons({ 
            icons: { 
                Send, TrendingUp, Calendar, MessageCircle, ChevronRight, Star,
                Sparkles, LogOut, LayoutGrid, Contact2, Plus, CalendarHeart, Settings2, User
            } 
        });

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
    let startX = 0; // Mudado para X
    let moveX = 0;

    let cards = Array.from(stack.querySelectorAll('.hero-card-stacked')) as HTMLElement[];
    if (cards.length <= 1) return;

    const aplicarTransformacoes3D = () => {
        cards.forEach((card, index) => {
            card.style.transition = isDragging ? 'none' : 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.5s ease';
            
            // O index 0 é o card central (Destaque)
            // Calculamos o deslocamento lateral (offset)
            const sideOffset = 40; // Distância entre os cards laterais
            const rotationY = index * 45; // Ângulo de rotação lateral
            const translateX = index * sideOffset;
            const translateZ = index * -100; // Afasta os cards de trás
            
            // Escala: O primeiro é 1.0, os próximos diminuem
            const scale = Math.max(0.6, 1 - (index * 0.15)); 

            card.style.zIndex = (cards.length - index).toString();
            
            // Aplicamos a transformação:
            // 1. TranslateX para mover para o lado
            // 2. TranslateZ para profundidade
            // 3. RotateY para angulação lateral
            card.style.transform = `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${-rotationY}deg) scale(${scale})`;
            
            // Opacidade progressiva
            card.style.opacity = index > 2 ? '0' : (1 - index * 0.3).toString();
        });
    };

    const handleStart = (clientX: number) => {
        isDragging = true;
        startX = clientX;
    };

    const handleMove = (clientX: number) => {
        if (!isDragging) return;
        moveX = clientX - startX;
        
        if (cards[0]) {
            // Preview do movimento lateral no card principal
            const rotation = moveX / 10;
            cards[0].style.transform = `translateX(${moveX * 0.5}px) rotateY(${rotation}deg) scale(1.02)`;
        }
    };

    const handleEnd = () => {
        if (!isDragging) return;
        isDragging = false;

        const threshold = 50;
        if (Math.abs(moveX) > threshold) {
            if (moveX > 0) {
                // Swipe para Direita: traz o último para frente
                const last = cards.pop();
                if (last) {
                    cards.unshift(last);
                    stack.prepend(last);
                }
            } else {
                // Swipe para Esquerda: manda o primeiro para trás
                const first = cards.shift();
                if (first) {
                    cards.push(first);
                    stack.appendChild(first);
                }
            }
        }
        
        moveX = 0;
        aplicarTransformacoes3D();
    };

    stack.addEventListener('pointerdown', (e) => handleStart(e.clientX));
    window.addEventListener('pointermove', (e) => handleMove(e.clientX));
    window.addEventListener('pointerup', handleEnd);
    stack.addEventListener('dragstart', (e) => e.preventDefault());

    aplicarTransformacoes3D();
}