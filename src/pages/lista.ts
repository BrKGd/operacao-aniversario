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
    const CACHE_KEY = 'fec_contatos_cache';

    // 1. TENTATIVA DE RECUPERAÇÃO DE CACHE
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
        tipoMensagemAtivo: null
    };

    let templatesGlobais: MensagemTemplate[] = [];

    // --- 🛠️ FUNÇÕES DE RENDERIZAÇÃO (Declaradas no topo para evitar Erro 2304) ---

    const render = () => {
        const gridElement = document.getElementById('fec-grid');
        if (!gridElement) return;

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
            const anoAtual = hoje.getFullYear();
            gridElement.innerHTML = filtrados.map(c => {
                const dias = calcularDias(c.data_nascimento);
                const jaEnviou = c.send_msg && c.ultimo_envio_ano === anoAtual;
                const avatarUrl = c.imagem_url || `https://ui-avatars.com/api/?background=eef2ff&color=6366f1&name=${encodeURIComponent(c.nome)}`;

                return `
                <div class="fec-contact-card" data-id="${c.id}" data-nome="${c.nome}" data-tel="${c.telefone || ''}">
                    <div class="fec-card-main js-detalhes">
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
        const listContainer = document.getElementById('lista-templates-list');
        const pillsContainer = document.getElementById('lista-pills-container');
        if (!listContainer || !pillsContainer) return;
        
        const tipos = [...new Set(templatesGlobais.map(t => t.tipo))].sort();
        pillsContainer.innerHTML = `
            <button class="btn-pill-filter ${!state.tipoMensagemAtivo ? 'active' : ''}" data-tipo="all">Todos</button>
            ${tipos.map(tipo => `<button class="btn-pill-filter ${state.tipoMensagemAtivo === tipo ? 'active' : ''}" data-tipo="${tipo}">${tipo}</button>`).join('')}
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
                    <img src="${whatsappIcon}" alt="WhatsApp" style="width: 20px;">
                </div>
            </div>`).join('');
    
        listContainer.querySelectorAll('.template-texto-cal').forEach((el, index) => {
            if (filtrados[index]) (el as HTMLElement).textContent = filtrados[index].conteudo;
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
                        <button class="btn-close-drawer" id="btnCloseDrawer"><i data-lucide="x"></i></button>
                    </div>
                    <div id="lista-pills-container" class="pills-container-scroll"></div>
                    <div id="lista-templates-list" class="lista-templates-container"></div>
                </div>
            </div>
        `;
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
                window.open(`https://api.whatsapp.com/send?phone=55${tel?.replace(/\D/g, '')}&text=${encodeURIComponent(msg)}`, '_blank');
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
        const [contatosFresh, templatesFresh] = await Promise.all([
            aniversarioService.listarTodos(),
            aniversarioService.listarTemplates()
        ]);

        state.contatosBase = contatosFresh as Aniversario[];
        templatesGlobais = templatesFresh;

        // Salva no cache removendo possíveis Base64 pesados das imagens
        try {
            const cacheLeve = (contatosFresh as Aniversario[]).map(({ imagem_url, ...resto }) => ({
                ...resto,
                imagem_url: imagem_url?.startsWith('data:') ? null : imagem_url 
            }));
            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheLeve));
        } catch (e) { console.warn("QuotaExceeded: Cache não atualizado."); }

        if (!document.getElementById('mainSearch')) {
            prepararEstrutura();
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
    if (!dataNasc) return 999;
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    const nasc = new Date(dataNasc + 'T00:00:00');
    const prox = new Date(hoje.getFullYear(), nasc.getMonth(), nasc.getDate());
    if (prox < hoje) prox.setFullYear(hoje.getFullYear() + 1);
    return Math.ceil((prox.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}