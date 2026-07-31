import '../styles/lista.css';
import '../styles/dashboard.css'; 
import whatsappIcon from '../assets/whatsapp.png';
import { aniversarioService } from '../services/aniversarioService';
import { formatarTelefoneWhatsapp } from '../utils/messages';
import { Aniversario, Categoria, MensagemTemplate } from '../types';
import { diasAteAniversario } from '../utils/dateUtils';
import { modalAlerta } from '../utils/modalAlertas';
import { createIcons, icons } from 'lucide';

// 🧠 Tipagem do Estado Local da Lista
interface ListaState {
    busca: string;
    filtro: string; // 'todos' | 'proximos' | 'favoritos' | 'cat_{id}'
    contatosBase: Aniversario[];
    categorias: Categoria[];
    tipoMensagemAtivo: string | null;
    modoSelecao: boolean;
    idsSelecionados: Set<string>;
}

export async function montarLista(container: HTMLElement) {
    const CACHE_KEY = 'fec_contatos_cache';

    // 1. RECUPERAÇÃO DE CACHE LOCAL
    let contatosIniciais: Aniversario[] = [];
    try {
        const cache = localStorage.getItem(CACHE_KEY);
        if (cache) contatosIniciais = JSON.parse(cache);
    } catch (e) {
        console.warn("Cache inacessível ou corrompido.");
    }

    const state: ListaState = {
        busca: "",
        filtro: "todos",
        contatosBase: contatosIniciais,
        categorias: [],
        tipoMensagemAtivo: null,
        modoSelecao: false,
        idsSelecionados: new Set<string>()
    };

    let templatesGlobais: MensagemTemplate[] = [];

    // --- 🛠️ FUNÇÕES DE RENDERIZAÇÃO ---

    const renderFilterGroup = () => {
        const filterGroup = document.getElementById('filterGroup');
        if (!filterGroup) return;

        let html = `
            <button class="fec-chip ${state.filtro === 'todos' ? 'active' : ''}" data-f="todos">
                <i data-lucide="layers"></i>
                <span>Todos</span>
            </button>
            <button class="fec-chip ${state.filtro === 'proximos' ? 'active' : ''}" data-f="proximos">
                <i data-lucide="calendar"></i>
                <span>Próximos 30 dias</span>
            </button>
            <button class="fec-chip ${state.filtro === 'favoritos' ? 'active' : ''}" data-f="favoritos">
                <i data-lucide="star" ${state.filtro === 'favoritos' ? 'style="fill:currentColor"' : ''}></i>
                <span>Favoritos</span>
            </button>
        `;

        state.categorias.forEach(cat => {
            const isActive = state.filtro === `cat_${cat.id}`;
            html += `
                <button class="fec-chip ${isActive ? 'active' : ''}" data-f="cat_${cat.id}">
                    <i data-lucide="${cat.icone || 'tag'}"></i>
                    <span>${cat.nome}</span>
                </button>
            `;
        });

        filterGroup.innerHTML = html;
        createIcons({ icons });
    };

    const render = () => {
        const gridElement = document.getElementById('fec-grid');
        const counterContainer = document.getElementById('fec-counter-container');
        const multiBarContainer = document.getElementById('fec-multi-bar-container');
        if (!gridElement) return;

        // Oculta/exibe o FAB (+) flutuante durante a seleção múltipla para evitar sobreposição
        const fabBtn = document.getElementById('fabAddFloating');
        if (fabBtn) {
            if (state.modoSelecao) {
                fabBtn.classList.add('fab-hidden');
            } else {
                fabBtn.classList.remove('fab-hidden');
            }
        }

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        // FILTRAGEM DINÂMICA
        const filtrados = state.contatosBase.filter(c => {
            const matchBusca = c.nome.toLowerCase().includes(state.busca.toLowerCase()) || 
                               (c.apelido && c.apelido.toLowerCase().includes(state.busca.toLowerCase()));
            
            if (!matchBusca) return false;

            if (state.filtro === 'favoritos') return c.favorito;
            if (state.filtro === 'proximos') return calcularDias(c.data_nascimento) <= 30;
            if (state.filtro.startsWith('cat_')) {
                const catIdTarget = state.filtro.replace('cat_', '');
                return c.categoria_id === catIdTarget;
            }

            return true;
        });

        filtrados.sort((a, b) => calcularDias(a.data_nascimento) - calcularDias(b.data_nascimento));

        // 1. RENDERIZAR BARRA DE CONTAGEM & BOTOES SELECAO MULTIPLA
        if (counterContainer) {
            const totalFiltrados = filtrados.length;
            const selecionadosCount = state.idsSelecionados.size;
            const todosSelecionados = totalFiltrados > 0 && selecionadosCount === totalFiltrados;

            if (!state.modoSelecao) {
                counterContainer.innerHTML = `
                    <div class="fec-list-counter-bar">
                        <span>Exibindo <strong>${filtrados.length}</strong> de <strong>${state.contatosBase.length}</strong> aniversariantes</span>
                        <div class="fec-multi-actions-group">
                            <button class="btn-toggle-multi" id="btnToggleMulti">
                                <i data-lucide="check-square"></i>
                                <span>Exclusão Múltipla</span>
                            </button>
                        </div>
                    </div>
                `;
            } else {
                counterContainer.innerHTML = `
                    <div class="fec-list-counter-bar">
                        <span>Exibindo <strong>${filtrados.length}</strong> de <strong>${state.contatosBase.length}</strong> aniversariantes</span>
                        <div class="fec-multi-actions-group">
                            <button class="btn-multi-pill pill-todos ${todosSelecionados ? 'active' : ''}" id="btnSelectAllPill" title="${todosSelecionados ? 'Desmarcar todos' : 'Selecionar todos'}">
                                <i data-lucide="${todosSelecionados ? 'check-square' : 'square'}"></i>
                                <span>Todos</span>
                            </button>
                            <button class="btn-multi-pill pill-cancelar" id="btnCancelMultiPill" title="Cancelar exclusão múltipla">
                                <i data-lucide="x"></i>
                                <span>Cancelar</span>
                            </button>
                            <button class="btn-multi-pill pill-excluir" id="btnDeleteSelectedPill" ${selecionadosCount === 0 ? 'disabled' : ''} title="${selecionadosCount === 0 ? 'Nenhum item selecionado' : 'Excluir selecionados'}">
                                <i data-lucide="trash-2"></i>
                                <span>Excluir${selecionadosCount > 0 ? ` (${selecionadosCount})` : ''}</span>
                            </button>
                        </div>
                    </div>
                `;
            }
        }

        // 2. RENDERIZAR GRID DE CONTATOS
        if (filtrados.length === 0) {
            gridElement.innerHTML = `
                <div class="fec-list-empty">
                    <i data-lucide="users"></i>
                    <p>Nenhum contato encontrado 😄</p>
                </div>`;
        } else {
            const anoAtual = hoje.getFullYear();
            gridElement.innerHTML = filtrados.map(c => {
                const dias = calcularDias(c.data_nascimento);
                const jaEnviou = c.send_msg && c.ultimo_envio_ano === anoAtual;
                const avatarUrl = c.imagem_url || `https://ui-avatars.com/api/?background=eef2ff&color=6366f1&name=${encodeURIComponent(c.nome)}`;
                const isSelected = state.idsSelecionados.has(c.id);

                return `
                <div class="fec-contact-card ${isSelected ? 'selected' : ''}" data-id="${c.id}" data-nome="${c.nome}" data-tel="${c.telefone || ''}">
                    ${state.modoSelecao ? `
                        <div class="fec-checkbox-wrapper js-toggle-select" data-id="${c.id}">
                            <i data-lucide="${isSelected ? 'check-square' : 'square'}" class="fec-checkbox-icon ${isSelected ? 'checked' : ''}"></i>
                        </div>
                    ` : ''}

                    <div class="fec-card-main js-detalhes" style="flex: 1; cursor: pointer;">
                        <div class="fec-avatar-container">
                            <img src="${avatarUrl}" class="fec-avatar" alt="${c.nome}" loading="lazy">
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

                    ${!state.modoSelecao ? `
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
                    ` : ''}
                </div>`;
            }).join('');
        }

        // 3. LIMPEZA DA BARRA FLUTUANTE INFERIOR (substituída pelos 3 pills superiores)
        if (multiBarContainer) {
            multiBarContainer.innerHTML = '';
        }

        createIcons({ icons });

        // Event listeners dos botões de Seleção Múltipla
        if (!state.modoSelecao) {
            document.getElementById('btnToggleMulti')?.addEventListener('click', () => {
                state.modoSelecao = true;
                render();
            });
        } else {
            // Pill: Todos
            document.getElementById('btnSelectAllPill')?.addEventListener('click', () => {
                if (state.idsSelecionados.size === filtrados.length && filtrados.length > 0) {
                    state.idsSelecionados.clear();
                } else {
                    filtrados.forEach(c => state.idsSelecionados.add(c.id));
                }
                render();
            });

            // Pill: Cancelar
            document.getElementById('btnCancelMultiPill')?.addEventListener('click', () => {
                state.modoSelecao = false;
                state.idsSelecionados.clear();
                render();
            });

            // Pill: Excluir
            document.getElementById('btnDeleteSelectedPill')?.addEventListener('click', async () => {
                const count = state.idsSelecionados.size;
                if (count === 0) return;

                const confirmou = await modalAlerta.show({
                    title: "Excluir Selecionados?",
                    message: `Tem certeza que deseja excluir ${count} aniversariante(s)? Esta ação não pode ser desfeita.`,
                    type: "confirm",
                    confirmText: `Sim, Excluir (${count})`,
                    cancelText: "Cancelar"
                });

                if (confirmou) {
                    modalAlerta.showLoading(`Excluindo ${count} registro(s)...`);
                    try {
                        const idsArray = Array.from(state.idsSelecionados);
                        await aniversarioService.excluirVarios(idsArray);
                        
                        state.contatosBase = state.contatosBase.filter(c => !state.idsSelecionados.has(c.id));
                        state.idsSelecionados.clear();
                        state.modoSelecao = false;

                        modalAlerta.close();
                        render();
                        modalAlerta.show({ message: `${count} registro(s) excluído(s) com sucesso!`, type: "success" });
                    } catch (err: any) {
                        modalAlerta.close();
                        modalAlerta.show({ message: err.message || "Erro ao excluir registros.", type: "error" });
                    }
                }
            });
        }
    };

    const renderDrawerContent = (tel: string) => {
        const listContainer = document.getElementById('lista-templates-list');
        const pillsContainer = document.getElementById('lista-pills-container');
        if (!listContainer || !pillsContainer) return;
        
        const tipos = [...new Set(templatesGlobais.map(t => t.tipo || t.titulo || 'Geral'))].sort();
        pillsContainer.innerHTML = `
            <button class="btn-pill-filter ${!state.tipoMensagemAtivo ? 'active' : ''}" data-tipo="all">Todos</button>
            ${tipos.map(tipo => `<button class="btn-pill-filter ${state.tipoMensagemAtivo === tipo ? 'active' : ''}" data-tipo="${tipo}">${tipo}</button>`).join('')}
        `;
    
        const filtrados = state.tipoMensagemAtivo 
            ? templatesGlobais.filter(t => (t.tipo || t.titulo) === state.tipoMensagemAtivo) 
            : templatesGlobais;
    
        listContainer.innerHTML = filtrados.map(t => `
            <div class="template-item-cal js-send-zap" data-tel="${tel}" data-msg="${encodeURIComponent(t.conteudo || t.texto || '')}">
                <div class="template-info">
                    <span class="badge-categoria-msg">${t.tipo || t.titulo || 'Mensagem'}</span>
                    <p class="template-texto-cal"></p>
                </div>
                <div class="btn-enviar-template-cal">
                    <img src="${whatsappIcon}" alt="WhatsApp" style="width: 20px;">
                </div>
            </div>`).join('');
    
        listContainer.querySelectorAll('.template-texto-cal').forEach((el, index) => {
            const tpl = filtrados[index];
            if (tpl) (el as HTMLElement).textContent = tpl.conteudo || tpl.texto || '';
        });
    };

    const prepararEstrutura = () => {
        container.innerHTML = `
            <div class="fec-list-wrapper">
                <div class="fec-header-sticky">
                    <div class="fec-search-bar">
                        <i data-lucide="search"></i>
                        <input type="text" id="mainSearch" placeholder="Buscar amigos..." autocomplete="off">
                    </div>
                    <div class="fec-filter-group" id="filterGroup"></div>
                    <div id="fec-counter-container"></div>
                </div>
                <div id="fec-grid"></div>
                <div id="fec-multi-bar-container"></div>
            </div>
            <div id="drawer-mensagem-lista" class="drawer-cal">
                <div class="drawer-cal-content">
                    <div class="drawer-handle"></div>
                    <div class="drawer-cal-header">
                        <div class="drawer-cal-title">
                            <h3 id="lista-drawer-nome">Enviar Mensagem</h3>
                            <p>Selecione um modelo para enviar</p>
                        </div>
                        <button class="btn-close-drawer" id="btnCloseDrawer"><i data-lucide="x"></i></button>
                    </div>
                    <div id="lista-pills-container" class="pills-container-scroll"></div>
                    <div id="lista-templates-list" class="lista-templates-container"></div>
                </div>
            </div>
        `;
        renderFilterGroup();
        adicionarListeners();
    };

    const adicionarListeners = () => {
        const gridElement = document.getElementById('fec-grid')!;
        const drawerElement = document.getElementById('drawer-mensagem-lista')!;

        gridElement.addEventListener('click', async (e) => {
            const target = e.target as HTMLElement;
            const card = target.closest('.fec-contact-card') as HTMLElement;
            if (!card) return;
            const id = card.dataset.id!;
            const contato = state.contatosBase.find(c => c.id === id);
            if (!contato) return;

            // Se o modo de seleção múltipla estiver ativo
            if (state.modoSelecao) {
                if (state.idsSelecionados.has(id)) {
                    state.idsSelecionados.delete(id);
                } else {
                    state.idsSelecionados.add(id);
                }
                render();
                return;
            }

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
                const jaMarcado = contato.send_msg && contato.ultimo_envio_ano === anoAtual;
                const dados = { send_msg: !jaMarcado, ultimo_envio_ano: !jaMarcado ? anoAtual : undefined };
                Object.assign(contato, dados);
                render();
                await aniversarioService.atualizar(id, dados);
            }

            if (target.closest('.js-abrir-drawer')) {
                const drawerTitle = document.getElementById('lista-drawer-nome');
                if (drawerTitle) drawerTitle.innerText = `Para ${card.dataset.nome?.split(' ')[0]}`;
                state.tipoMensagemAtivo = null;
                renderDrawerContent(card.dataset.tel!);
                drawerElement.classList.add('active');
            }
        });

        drawerElement.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const pill = target.closest('.btn-pill-filter') as HTMLElement;
            if (pill) {
                state.tipoMensagemAtivo = pill.dataset.tipo === 'all' ? null : pill.dataset.tipo!;
                const firstItem = document.querySelector('.js-send-zap') as HTMLElement;
                renderDrawerContent(firstItem?.dataset.tel || '');
                return;
            }
            const templateItem = target.closest('.js-send-zap') as HTMLElement;
            if (templateItem) {
                const tel = templateItem.dataset.tel;
                const msg = decodeURIComponent(templateItem.dataset.msg || '');
                const telFormatted = formatarTelefoneWhatsapp(tel);
                window.open(`https://api.whatsapp.com/send?phone=${telFormatted}&text=${encodeURIComponent(msg)}`, '_blank');
            }
        });

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
    };

    // --- 🚀 FLUXO DE EXECUÇÃO ---

    // Exibe skeletons se não houver cache
    if (state.contatosBase.length === 0) {
        container.innerHTML = `
            <div class="fec-list-wrapper">
                ${Array(5).fill(0).map(() => `
                    <div class="fec-contact-card skeleton" style="height: 80px; opacity: 0.5; margin-bottom: 12px; border-radius: 16px;"></div>
                `).join('')}
            </div>`;
    } else {
        prepararEstrutura();
        render();
    }

    try {
        const [contatosFresh, categoriasFresh, templatesFresh] = await Promise.all([
            aniversarioService.listarTodos(),
            aniversarioService.listarCategorias(),
            aniversarioService.listarTemplates()
        ]);

        state.contatosBase = contatosFresh as Aniversario[];
        state.categorias = categoriasFresh as Categoria[];
        templatesGlobais = templatesFresh;

        // Salva no cache local (mantendo imagens comprimidas intactas)
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(contatosFresh));
        } catch (e) { 
            console.warn("QuotaExceeded: Cache de contatos mantido em memória RAM."); 
        }

        if (!document.getElementById('mainSearch')) {
            prepararEstrutura();
        } else {
            renderFilterGroup();
        }
        
        render();
    } catch (error) {
        console.error("Erro na lista:", error);
        if (state.contatosBase.length === 0) {
            container.innerHTML = `<div class="fec-list-empty"><p>Erro ao carregar dados.</p></div>`;
        }
    }
}

function calcularDias(dataNasc: string) {
    return diasAteAniversario(dataNasc);
}