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
    let startY = 0;
    let moveY = 0;

    // Converte NodeList para Array para manipulação fácil
    let cards = Array.from(stack.querySelectorAll('.hero-card-stacked')) as HTMLElement[];
    if (cards.length <= 1) return; // Nada para rodar

    // Configuração da Roda Virtual 3D
    const radius = 150; // Raio do cilindro virtual em pixels
    const angleIncrement = 15; // Angulação entre cards em graus

    // Função para aplicar as transformações 3D baseadas na posição do array
    const aplicarTransformacoes3D = () => {
        cards.forEach((card, index) => {
            // Adiciona transição apenas quando a roda muda (isDragging é falso)
            card.style.transition = isDragging ? 'none' : 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.5s ease, z-index 0.5s ease';
            
            // O card 0 é o topo (frente). Cards subsequentes rodam para trás e diminuem escala.
            const angle = index * angleIncrement;
            const radians = (angle * Math.PI) / 180;
            
            // Lógica de Roda 3D: RotateX + TranslateY (move na roda) + TranslateZ (profundidade)
            // Usamos RotateX negativo para tombar para trás
            const rotateX = -angle; 
            const ty = radius * Math.sin(radians);
            const tz = -radius * (1 - Math.cos(radians)); // Afasta conforme roda
            
            // Escala diminui progressivamente para cards de trás
            const scale = Math.max(0.7, 1 - (index * 0.08)); 

            card.style.zIndex = (cards.length - index).toString();
            
            // Combina transformações. Importante manter rotateX tombando para trás.
            card.style.transform = `translateY(${ty}px) translateZ(${tz}px) rotateX(${rotateX}deg) scale(${scale})`;
            
            // Esconde cards que rodaram demais para trás
            card.style.opacity = index > 3 ? '0' : '1'; 
        });
    };

    const handleStart = (clientY: number) => {
        isDragging = true;
        startY = clientY;
    };

    const handleMove = (clientY: number) => {
        if (!isDragging) return;
        moveY = clientY - startY;
        
        // Preview leve do movimento (tomba o card da frente)
        if (cards[0]) {
            const previewRotation = (moveY / 5); // Sensibilidade
            cards[0].style.transition = 'none';
            cards[0].style.transform = `translateY(${moveY / 2}px) translateZ(0px) rotateX(${previewRotation}deg) scale(1)`;
        }
    };

    const handleEnd = () => {
        if (!isDragging) return;
        isDragging = false;

        // Limiar de swipe para mudar de card
        const swipeThreshold = 60;

        if (Math.abs(moveY) > swipeThreshold) {
            // Ativa a rotação (Roda Infinita)
            if (moveY > 0) {
                // Arrastou para BAIXO: O último card vem para a frente
                const lastCard = cards.pop();
                if (lastCard) {
                    cards.unshift(lastCard); // Coloca no início do array
                    stack.prepend(lastCard); // Move no DOM para o início
                }
            } else {
                // Arrastou para CIMA: O primeiro card vai para o final
                const firstCard = cards.shift();
                if (firstCard) {
                    cards.push(firstCard); // Coloca no final do array
                    stack.appendChild(firstCard); // Move no DOM para o final
                }
            }
        }
        
        moveY = 0;
        aplicarTransformacoes3D(); // Aplica a animação 3D apenas agora
    };

    // Eventos de Pointer unificam Mouse e Touch (Computador e Celular)
    stack.addEventListener('pointerdown', (e) => handleStart(e.clientY));
    window.addEventListener('pointermove', (e) => handleMove(e.clientY));
    window.addEventListener('pointerup', handleEnd);
    
    // Previne comportamento padrão de arrasto (como selecionar texto ou imagem)
    stack.addEventListener('dragstart', (e) => e.preventDefault());

    // Inicializa a posição 3D sem animação
    aplicarTransformacoes3D();
}