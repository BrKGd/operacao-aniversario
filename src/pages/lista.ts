import '../styles/lista.css';
import '../styles/dashboard.css'; 
import whatsappIcon from '../assets/whatsapp.png';
import { aniversarioService } from '../services/aniversarioService';
import { Aniversario, MensagemTemplate } from '../types';
import { createIcons, icons } from 'lucide';

// 🧠 Tipagem do Estado Local
interface ListaState {
    busca: string;
    filtro: string;
    contatosBase: Aniversario[];
    tipoMensagemAtivo: string | null;
}

export async function montarLista(container: HTMLElement) {
    // 1. SKELETON LOADING
    container.innerHTML = `
        <div class="fec-list-wrapper">
            ${Array(5).fill(0).map(() => `
                <div class="fec-contact-card skeleton" style="height: 80px; opacity: 0.5; margin-bottom: 12px; border-radius: 16px;"></div>
            `).join('')}
        </div>
    `;

    try {
        const [contatos, templates] = await Promise.all([
            aniversarioService.listarTodos(),
            aniversarioService.listarTemplates()
        ]);
        
        const templatesGlobais: MensagemTemplate[] = templates;

        const state: ListaState = {
            busca: "",
            filtro: "todos",
            contatosBase: contatos as Aniversario[],
            tipoMensagemAtivo: null
        };

        // 2. ESTRUTURA FIXA
        container.innerHTML = `
            <div class="fec-list-wrapper">
                <div class="fec-header-sticky">
                    <div class="fec-search-bar">
                        <i data-lucide="search"></i>
                        <input type="text" id="mainSearch" placeholder="Buscar amigos...">
                    </div>
                    <div class="fec-filter-group" id="filterGroup">
                        <button class="fec-chip active" data-f="todos">Todos</button>
                        <button class="fec-chip" data-f="proximos">Próximos 30 dias</button>
                        <button class="fec-chip" data-f="favoritos">⭐ Favoritos</button>
                    </div>
                </div>
                <div id="fec-grid"></div>
            </div>

            <div id="drawer-mensagem-lista" class="drawer-cal">
                <div class="drawer-cal-content">
                    <div class="drawer-handle"></div>
                    <div class="drawer-cal-header">
                        <div class="drawer-cal-title">
                            <h3 id="lista-drawer-nome">Enviar Mensagem</h3>
                            <p>Selecione um modelo para enviar</p>
                        </div>
                        <button class="btn-close-drawer" id="btnCloseDrawer">
                            <i data-lucide="x"></i>
                        </button>
                    </div>
                    <div id="lista-pills-container" class="pills-container-scroll"></div>
                    <div id="lista-templates-list" class="lista-templates-container"></div>
                </div>
            </div>
        `;

        const gridElement = document.getElementById('fec-grid')!;
        const drawerElement = document.getElementById('drawer-mensagem-lista')!;

        // 3. FUNÇÕES DE RENDERIZAÇÃO
        const render = () => {
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            const filtrados = state.contatosBase.filter(c => {
                const matchBusca = c.nome.toLowerCase().includes(state.busca.toLowerCase());
                if (state.filtro === 'favoritos') return matchBusca && c.favorito;
                if (state.filtro === 'proximos') return matchBusca && calcularDias(c.data_nascimento) <= 30;
                return matchBusca;
            });

            filtrados.sort((a, b) => calcularDias(a.data_nascimento) - calcularDias(b.data_nascimento));

            if (filtrados.length === 0) {
                gridElement.innerHTML = `
                    <div class="fec-list-empty">
                        <i data-lucide="users"></i>
                        <p>Nenhum contato encontrado 😄</p>
                    </div>`;
            } else {
                gridElement.innerHTML = filtrados.map(c => {
                    const dias = calcularDias(c.data_nascimento);
                    const anoAtual = hoje.getFullYear();
                    const jaEnviou = c.send_msg && c.ultimo_envio_ano === anoAtual;

                    return `
                    <div class="fec-contact-card" data-id="${c.id}" data-nome="${c.nome}" data-tel="${c.telefone || ''}">
                        <div class="fec-card-main js-detalhes">
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
                            <button class="btn-action fav ${c.favorito ? 'active' : ''} js-toggle-fav">
                                <i data-lucide="star" ${c.favorito ? 'style="fill:currentColor"' : ''}></i>
                            </button>
                            <button class="btn-action ${jaEnviou ? 'done' : ''} js-marcar-enviado">
                                <i data-lucide="${jaEnviou ? 'check-circle' : 'circle'}"></i>
                            </button>
                            <button class="btn-action js-abrir-drawer">
                                <i data-lucide="message-circle"></i>
                            </button>
                        </div>
                    </div>`;
                }).join('');
            }
            createIcons({ icons });
        };

        const renderDrawerContent = (tel: string) => {
            const listContainer = document.getElementById('lista-templates-list') as HTMLElement;
            const pillsContainer = document.getElementById('lista-pills-container') as HTMLElement;
            
            // Verificação de segurança para os containers do DOM
            if (!listContainer || !pillsContainer) return;
            
            const tipos = [...new Set(templatesGlobais.map(t => t.tipo))].sort();
        
            pillsContainer.innerHTML = `
                <button class="btn-pill-filter ${!state.tipoMensagemAtivo ? 'active' : ''}" data-tipo="all">Todos</button>
                ${tipos.map(tipo => `
                    <button class="btn-pill-filter ${state.tipoMensagemAtivo === tipo ? 'active' : ''}" data-tipo="${tipo}">${tipo}</button>
                `).join('')}
            `;
        
            const filtrados = state.tipoMensagemAtivo 
                ? templatesGlobais.filter(t => t.tipo === state.tipoMensagemAtivo) 
                : templatesGlobais;
        
            listContainer.innerHTML = filtrados.map(t => `
                <div class="template-item-cal js-send-zap" data-tel="${tel}" data-msg="${encodeURIComponent(t.conteudo)}">
                    <div class="template-info">
                        <span class="badge-categoria-msg">${t.tipo}</span>
                        <p class="template-texto-cal"></p>
                    </div>
                    <div class="btn-enviar-template-cal">
                        <img src="${whatsappIcon}" alt="WhatsApp" style="width: 20px; height: 20px;">
                    </div>
                </div>
            `).join('');
        
            // ✅ Solução para o erro da linha 171:
            listContainer.querySelectorAll('.template-texto-cal').forEach((el, index) => {
                const item = filtrados[index];
                if (item) {
                    (el as HTMLElement).textContent = item.conteudo;
                }
            });
        };

        // --- ⚡ EVENT DELEGATION (GRID) ---
        gridElement.addEventListener('click', async (e) => {
            const target = e.target as HTMLElement;
            const card = target.closest('.fec-contact-card') as HTMLElement;
            if (!card) return;

            const id = card.dataset.id!;
            const contato = state.contatosBase.find(c => c.id === id);
            if (!contato) return;

            if (target.closest('.js-detalhes')) {
                // @ts-ignore
                if (window.navegar) window.navegar('detalhes', id);
            }

            if (target.closest('.js-toggle-fav')) {
                contato.favorito = !contato.favorito;
                render();
                await aniversarioService.atualizar(id, { favorito: contato.favorito });
            }

            if (target.closest('.js-marcar-enviado')) {
                const anoAtual = new Date().getFullYear();
                const jaEstavaMarcado = contato.send_msg && contato.ultimo_envio_ano === anoAtual;
                const dados = {
                    send_msg: !jaEstavaMarcado,
                    ultimo_envio_ano: !jaEstavaMarcado ? anoAtual : undefined
                };
                Object.assign(contato, dados);
                render();
                await aniversarioService.atualizar(id, dados);
            }

            if (target.closest('.js-abrir-drawer')) {
                const nome = card.dataset.nome!;
                const tel = card.dataset.tel!;
                const drawerTitle = document.getElementById('lista-drawer-nome');
                if (drawerTitle) drawerTitle.innerText = `Para ${nome.split(' ')[0]}`;
                state.tipoMensagemAtivo = null;
                renderDrawerContent(tel);
                drawerElement.classList.add('active');
            }
        });

        // --- ⚡ EVENT DELEGATION (DRAWER) ---
        drawerElement.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;

            const pill = target.closest('.btn-pill-filter') as HTMLElement;
            if (pill) {
                state.tipoMensagemAtivo = pill.dataset.tipo === 'all' ? null : pill.dataset.tipo!;
                const templateList = document.getElementById('lista-templates-list');
                const firstItem = templateList?.querySelector('.js-send-zap') as HTMLElement;
                renderDrawerContent(firstItem?.dataset.tel || '');
                return;
            }

            const templateItem = target.closest('.js-send-zap') as HTMLElement;
            if (templateItem) {
                const tel = templateItem.dataset.tel;
                const msg = decodeURIComponent(templateItem.dataset.msg || '');
                if (!tel) return alert("Telefone não cadastrado.");
                window.open(`https://api.whatsapp.com/send?phone=55${tel.replace(/\D/g, '')}&text=${encodeURIComponent(msg)}`, '_blank');
            }
        });

        // --- ⚡ LISTENERS ADICIONAIS ---
        document.getElementById('mainSearch')?.addEventListener('input', (e) => {
            state.busca = (e.target as HTMLInputElement).value;
            render();
        });

        const filterGroup = document.getElementById('filterGroup');
        filterGroup?.addEventListener('click', (e) => {
            const btn = (e.target as HTMLElement).closest('.fec-chip');
            if (btn) {
                filterGroup.querySelectorAll('.fec-chip').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.filtro = btn.getAttribute('data-f') || 'todos';
                render();
            }
        });

        document.getElementById('btnCloseDrawer')?.addEventListener('click', () => {
            drawerElement.classList.remove('active');
        });

        render();

    } catch (error) {
        console.error("Erro na lista:", error);
        container.innerHTML = `<div class="fec-list-empty"><p>Erro ao carregar dados.</p></div>`;
    }
}

function calcularDias(dataNasc: string) {
    if (!dataNasc) return 999;
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    const nasc = new Date(dataNasc + 'T00:00:00');
    const prox = new Date(hoje.getFullYear(), nasc.getMonth(), nasc.getDate());
    if (prox < hoje) prox.setFullYear(hoje.getFullYear() + 1);
    return Math.ceil((prox.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}