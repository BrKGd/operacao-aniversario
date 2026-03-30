import '../styles/lista.css';
import { aniversarioService } from '../services/aniversarioService';
import { Aniversario } from '../types';

export async function montarLista(container: HTMLElement) {
    // 1. SKELETON LOADING STATE
    container.innerHTML = `
        <div class="fec-list-wrapper">
            ${Array(5).fill(0).map(() => `
                <div class="fec-contact-card skeleton" style="height: 80px; opacity: 0.5; margin-bottom: 12px; border-radius: 16px;"></div>
            `).join('')}
        </div>
    `;

    try {
        // Removido o aviso de 'categorias' não lido, focando no que é necessário
        const contatos = await aniversarioService.listarTodos();

        let state = {
            busca: "",
            filtro: "todos", // todos, proximos, favoritos
            contatosBase: contatos as Aniversario[]
        };

        const render = () => {
            let filtrados = state.contatosBase.filter(c => {
                const matchBusca = c.nome.toLowerCase().includes(state.busca.toLowerCase());
                
                if (state.filtro === 'favoritos') return matchBusca && c.favorito;
                if (state.filtro === 'proximos') {
                    const dias = calcularDias(c.data_nascimento);
                    return matchBusca && dias <= 30;
                }
                return matchBusca;
            });

            // Ordenação: primeiro os aniversariantes de HOJE, depois por proximidade
            filtrados.sort((a, b) => calcularDias(a.data_nascimento) - calcularDias(b.data_nascimento));

            const grid = document.getElementById('fec-grid');
            if (grid) {
                grid.innerHTML = filtrados.length > 0 
                    ? filtrados.map(c => renderCard(c)).join('')
                    : renderEmptyState();
                
                if ((window as any).lucide) (window as any).lucide.createIcons();
            }
        };

        const renderCard = (c: Aniversario) => {
            const dias = calcularDias(c.data_nascimento);
            const anoAtual = new Date().getFullYear();
            const jaEnviou = c.send_msg && c.ultimo_envio_ano === anoAtual;

            return `
                <div class="fec-contact-card" data-id="${c.id}">
                    <div class="fec-card-main" onclick="window.navegar('detalhes', '${c.id}')">
                        <div class="fec-avatar-container">
                            <img src="${c.imagem_url || 'https://ui-avatars.com/api/?background=eef2ff&color=6366f1&name=' + encodeURIComponent(c.nome)}" class="fec-avatar" alt="${c.nome}">
                            ${c.favorito ? '<div class="fec-fav-indicator"><i data-lucide="star" style="width:10px; height:10px; fill:#f59e0b"></i></div>' : ''}
                        </div>
                        <div class="fec-info">
                            <div class="fec-list-name">${c.nome}</div>
                            <div class="fec-list-sub ${dias === 0 ? 'is-today' : ''}">
                                ${dias === 0 ? '🎉 É HOJE!' : `Em ${dias} dias`}
                            </div>
                            <div class="fec-history-tag">
                                <i data-lucide="history" style="width:10px"></i> 
                                ${c.ultimo_envio_ano ? `Último em ${c.ultimo_envio_ano}` : 'Nenhuma mensagem enviada'}
                            </div>
                        </div>
                    </div>

                    <div class="fec-card-actions">
                        <button class="btn-action fav ${c.favorito ? 'active' : ''}" 
                                onclick="event.stopPropagation(); window.handleToggleFavorito('${c.id}')" 
                                title="Favoritar">
                            <i data-lucide="star" ${c.favorito ? 'style="fill:currentColor"' : ''}></i>
                        </button>
                        
                        <button class="btn-action ${jaEnviou ? 'done' : ''}" 
                                onclick="event.stopPropagation(); window.handleMarcarEnviado('${c.id}')"
                                title="${jaEnviou ? 'Mensagem já enviada' : 'Marcar como enviado'}">
                            <i data-lucide="${jaEnviou ? 'check-circle' : 'circle'}"></i>
                        </button>

                        <a href="https://wa.me/${c.telefone?.replace(/\D/g, '')}" 
                           target="_blank" 
                           class="btn-action" 
                           onclick="event.stopPropagation()"
                           title="Enviar WhatsApp">
                            <i data-lucide="message-circle"></i>
                        </a>
                    </div>
                </div>
            `;
        };

        const renderEmptyState = () => `
            <div class="fec-list-empty">
                <i data-lucide="users"></i>
                <p>Nenhum contato encontrado 😄</p>
            </div>
        `;

        // --- INJEÇÃO DA ESTRUTURA ---
        container.innerHTML = `
            <div class="fec-list-wrapper">
                <div class="fec-header-sticky">
                    <div class="fec-search-bar">
                        <i data-lucide="search"></i>
                        <input type="text" id="mainSearch" placeholder="Buscar amigos...">
                    </div>
                    <div class="fec-filter-group">
                        <button class="fec-chip active" data-f="todos">Todos</button>
                        <button class="fec-chip" data-f="proximos">Próximos 30 dias</button>
                        <button class="fec-chip" data-f="favoritos">⭐ Favoritos</button>
                    </div>
                </div>
                <div id="fec-grid"></div>
            </div>
        `;

        // --- HANDLERS DE EVENTOS ---
        document.getElementById('mainSearch')?.addEventListener('input', (e) => {
            state.busca = (e.target as HTMLInputElement).value;
            render();
        });

        document.querySelectorAll('.fec-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.fec-chip').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.filtro = btn.getAttribute('data-f') || 'todos';
                render();
            });
        });

        // --- FUNÇÕES GLOBAIS DE AÇÃO (Persistência no Supabase) ---
        (window as any).handleToggleFavorito = async (id: string) => {
            const contato = state.contatosBase.find(c => c.id === id);
            if (contato) {
                const novoStatus = !contato.favorito;
                contato.favorito = novoStatus;
                render(); // UI Feedback Instantâneo
                await aniversarioService.atualizar(id, { favorito: novoStatus });
            }
        };

        (window as any).handleMarcarEnviado = async (id: string) => {
            const contato = state.contatosBase.find(c => c.id === id);
            if (contato) {
                const anoAtual = new Date().getFullYear();
                const dados = {
                    send_msg: true,
                    ultimo_envio_ano: anoAtual
                };
                Object.assign(contato, dados);
                render();
                await aniversarioService.atualizar(id, dados);
            }
        };

        render();

    } catch (error) {
        console.error(error);
        container.innerHTML = `<div class="fec-list-empty"><p>Erro ao carregar dados.</p></div>`;
    }
}

function calcularDias(dataNasc: string) {
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    const nasc = new Date(dataNasc + 'T00:00:00');
    const prox = new Date(hoje.getFullYear(), nasc.getMonth(), nasc.getDate());
    if (prox < hoje) prox.setFullYear(hoje.getFullYear() + 1);
    return Math.ceil((prox.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}