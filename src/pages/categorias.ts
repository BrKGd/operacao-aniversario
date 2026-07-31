import '../styles/categorias.css';
import { aniversarioService } from '../services/aniversarioService';
import { modalAlerta } from '../utils/modalAlertas';
import { createIcons, icons } from 'lucide';

const ORIGEM_KEY = 'fec_catg_origem';

// Converte nomes de ícones em PascalCase do objeto `icons` para kebab-case para compatibilidade com data-lucide
function pascalToKebab(str: string): string {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

// Lista completa de todos os ícones da biblioteca Lucide disponíveis no sistema
const TODOS_ICONES_LUCIDE = Array.from(
    new Set(Object.keys(icons).map(pascalToKebab))
).sort();

// Ícones mais comuns para exibição inicial na grade do modal
const ICONES_COMUNS_DEFAULT = [
    'star', 'heart', 'users', 'user', 'briefcase', 'building', 'dumbbell', 'church', 
    'stethoscope', 'home', 'utensils', 'music', 'coffee', 'gift', 'cake', 'party-popper', 
    'sparkles', 'crown', 'shield', 'award', 'smile', 'camera', 'plane', 'car', 
    'gamepad-2', 'palette', 'globe', 'sun', 'moon', 'compass', 'flag', 'bookmark', 
    'tag', 'laptop', 'calculator', 'trophy', 'flame', 'pill', 'baby', 'brain', 
    'syringe', 'thermometer', 'wallet', 'phone', 'mail', 'map-pin', 'lock', 'bell'
];

export async function montarCategorias(container: HTMLElement) {
    const salvarOrigem = () => {
        const hashAntesDeMudar = window.location.hash;
        if (hashAntesDeMudar && hashAntesDeMudar !== '#categorias') {
            localStorage.setItem(ORIGEM_KEY, hashAntesDeMudar);
        } else if (!localStorage.getItem(ORIGEM_KEY)) {
            localStorage.setItem(ORIGEM_KEY, '#cadastro');
        }
    };

    salvarOrigem();

    container.innerHTML = `<div class="fec-center-wrapper"><div class="fec-loader-minimal">Carregando categorias...</div></div>`;

    try {
        const [categorias, todos] = await Promise.all([
            aniversarioService.listarCategorias(),
            aniversarioService.listarTodos()
        ]);

        let categoriaSelecionadaId: string | null = null;

        container.innerHTML = `
            <div class="catg-container">
                <button class="catg-btn-back" id="btnVoltarApp" title="Voltar">
                    <i data-lucide="chevron-left"></i>
                </button>

                <div class="catg-header">
                    <h2>Grupos & Categorias</h2>
                    <p style="color: var(--fec-text-muted, #64748b); margin-top: -5px;">Gerencie seus grupos e acompanhe o total de integrantes</p>
                    <span class="catg-total-badge">${categorias.length} ${categorias.length === 1 ? 'grupo' : 'grupos'} cadastrados</span>
                </div>

                <div class="catg-search-box">
                    <i data-lucide="search" class="catg-search-icon"></i>
                    <input type="text" id="catgSearchInput" placeholder="Buscar grupo por nome..." autocomplete="off">
                </div>

                <!-- BARRA DE AÇÕES NO CANTO SUPERIOR ESQUERDO ENTRE BUSCA E LISTA -->
                <div class="catg-action-toolbar">
                    <button class="catg-action-btn catg-action-add" id="btnNovaCat" title="Criar Nova Categoria">
                        <i data-lucide="plus"></i>
                    </button>
                    <button class="catg-action-btn catg-action-edit" id="btnEditarCat" title="Editar Categoria Selecionada" style="display: none;">
                        <i data-lucide="pencil"></i>
                    </button>
                    <button class="catg-action-btn catg-action-del" id="btnExcluirCat" title="Excluir Categoria Selecionada" style="display: none;">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>

                <!-- LISTA EM GRID 3 COLUNAS DE CARDS COMPACTOS -->
                <div class="catg-grid" id="catgListContainer">
                    ${categorias.map(cat => {
                        const count = todos.filter(t => t.categoria_id === cat.id).length;
                        return `
                        <div class="catg-card" data-id="${cat.id}" data-nome="${cat.nome.toLowerCase()}" data-count="${count}" style="border: 2px solid ${cat.cor};">
                            <div class="catg-card-icon" style="background: ${cat.cor}18; color: ${cat.cor}">
                                <i data-lucide="${cat.icone || 'tag'}"></i>
                            </div>
                            <div class="catg-card-info">
                                <span class="catg-card-name">${cat.nome}</span>
                                <span class="catg-card-count">${count} ${count === 1 ? 'integrante' : 'integrantes'}</span>
                            </div>
                        </div>
                    `}).join('')}
                </div>
            </div>
        `;

        const acaoVoltar = () => {
            const origem = localStorage.getItem(ORIGEM_KEY) || '#cadastro';
            if (origem.includes('#cadastro') || origem.includes('id=')) {
                window.history.back();
            } else {
                window.location.hash = origem;
            }
        };

        document.getElementById('btnVoltarApp')?.addEventListener('click', acaoVoltar);

        const btnEditar = container.querySelector('#btnEditarCat') as HTMLElement;
        const btnExcluir = container.querySelector('#btnExcluirCat') as HTMLElement;

        const atualizarToolbarAcoes = () => {
            if (categoriaSelecionadaId) {
                if (btnEditar) btnEditar.style.display = 'flex';
                if (btnExcluir) btnExcluir.style.display = 'flex';
            } else {
                if (btnEditar) btnEditar.style.display = 'none';
                if (btnExcluir) btnExcluir.style.display = 'none';
            }
        };

        // Seleção de Card
        container.querySelectorAll('#catgListContainer .catg-card').forEach(card => {
            card.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = (card as HTMLElement).dataset.id!;
                if (categoriaSelecionadaId === id) {
                    categoriaSelecionadaId = null;
                    card.classList.remove('selected');
                } else {
                    container.querySelectorAll('.catg-card').forEach(c => c.classList.remove('selected'));
                    categoriaSelecionadaId = id;
                    card.classList.add('selected');
                }
                atualizarToolbarAcoes();
            });
        });

        // Clique fora deseleciona os cards
        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.catg-card') && !target.closest('.catg-action-toolbar')) {
                categoriaSelecionadaId = null;
                container.querySelectorAll('.catg-card').forEach(c => c.classList.remove('selected'));
                atualizarToolbarAcoes();
            }
        });

        // Busca em tempo real na lista de categorias
        const searchInput = document.getElementById('catgSearchInput') as HTMLInputElement;
        searchInput?.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase().trim();
            container.querySelectorAll('#catgListContainer .catg-card').forEach(item => {
                const name = (item as HTMLElement).dataset.nome || '';
                (item as HTMLElement).style.display = name.includes(query) ? 'flex' : 'none';
            });
        });

        // Botão Nova Categoria (Ícone +)
        document.getElementById('btnNovaCat')?.addEventListener('click', () => {
            abrirModalCategoria(null, () => montarCategorias(container), acaoVoltar);
        });

        // Botão Editar Categoria Selecionada
        btnEditar?.addEventListener('click', () => {
            if (!categoriaSelecionadaId) return;
            const categoria = categorias.find(c => c.id === categoriaSelecionadaId);
            if (categoria) {
                abrirModalCategoria(categoria, () => montarCategorias(container), acaoVoltar);
            }
        });

        // Botão Excluir Categoria Selecionada
        btnExcluir?.addEventListener('click', async () => {
            if (!categoriaSelecionadaId) return;
            const categoria = categorias.find(c => c.id === categoriaSelecionadaId);
            if (!categoria) return;

            const count = todos.filter(t => t.categoria_id === categoria.id).length;
            const avisoMembros = count > 0 
                ? `⚠️ Este grupo possui ${count} integrante(s) vinculado(s). Deseja realmente remover "${categoria.nome}"?`
                : `Deseja realmente remover o grupo "${categoria.nome}"?`;

            const confirmar = await modalAlerta.show({
                title: "Excluir Categoria?",
                message: avisoMembros,
                type: "delete",
                confirmText: "Sim, excluir",
                cancelText: "Cancelar"
            });

            if (confirmar) {
                modalAlerta.showLoading("Excluindo categoria...");
                try {
                    await aniversarioService.excluirCategoria(categoria.id);
                    modalAlerta.close();
                    await modalAlerta.show({ message: "Categoria removida com sucesso!", type: "success" });
                    montarCategorias(container);
                } catch (err) {
                    modalAlerta.close();
                    modalAlerta.show({ title: "Erro", message: "Falha ao excluir categoria.", type: "error" });
                }
            }
        });

        createIcons({ icons });

    } catch (e) {
        container.innerHTML = `<div class="fec-center-wrapper">Erro ao carregar dados.</div>`;
    }
}

function abrirModalCategoria(dados: any | null, onSuccess: () => void, onFinalize: () => void) {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'catg-modal-overlay';
    
    let iconeSelecionado = (dados?.icone || 'star').toLowerCase();
    let corSelecionada = dados?.cor || '#0052FF';

    const coresPredefinidas = [
        '#0052FF', '#FF3B30', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'
    ];

    modalOverlay.innerHTML = `
        <div class="catg-modal-card">
            <div class="catg-modal-header">
                <h3><i data-lucide="${dados ? 'pencil' : 'plus'}"></i> ${dados ? 'Editar Categoria' : 'Nova Categoria'}</h3>
                <button class="catg-btn-close" id="closeCatForm"><i data-lucide="x"></i></button>
            </div>

            <div class="catg-modal-body">
                <!-- PRÉ-VISUALIZAÇÃO DA CATEGORIA -->
                <div class="catg-preview-hero">
                    <span class="preview-label">PRÉ-VISUALIZAÇÃO DA CATEGORIA</span>
                    <div class="catg-preview-card" id="cardPreview" style="background: ${corSelecionada}15; border-color: ${corSelecionada}40;">
                        <div class="catg-preview-icon" id="iconPreview" style="background: ${corSelecionada};">
                            <i data-lucide="${iconeSelecionado}"></i>
                        </div>
                        <div class="catg-preview-info">
                            <span class="catg-preview-title" id="textPreviewTitle">${dados?.nome || 'Nome da Categoria'}</span>
                            <span class="catg-preview-sub">Identidade Visual do Grupo</span>
                        </div>
                    </div>
                </div>

                <!-- NOME DA CATEGORIA -->
                <div class="catg-input-group">
                    <label><i data-lucide="tag" class="label-icon"></i> NOME DA CATEGORIA</label>
                    <input type="text" class="catg-input-text" id="inNomeCat" placeholder="Ex: Amigos, Trabalho, Família..." value="${dados?.nome || ''}">
                </div>

                <!-- ESCOLHA DO ÍCONE LUCIDE COM BUSCA GLOBAL -->
                <div class="catg-input-group">
                    <div class="label-row">
                        <label id="labelIconesCount"><i data-lucide="sparkles" class="label-icon"></i> ESCOLHA UM ÍCONE LUCIDE</label>
                    </div>
                    <div class="catg-icon-grid-box">
                        <div class="icon-search-wrapper">
                            <i data-lucide="search" class="search-icon-inside"></i>
                            <input type="text" class="catg-input-text icon-search-input" id="searchIcon" placeholder="Buscar ícone na biblioteca (ex: heart, gift, star, phone)...">
                        </div>
                        <div class="catg-icon-grid" id="gridIconesContainer"></div>
                    </div>
                </div>

                <!-- PALETA DE COR DA IDENTIDADE -->
                <div class="catg-input-group">
                    <label><i data-lucide="palette" class="label-icon"></i> PALETA DE COR DA IDENTIDADE</label>
                    <div class="color-preset-row">
                        ${coresPredefinidas.map(c => `
                            <div class="color-preset-pill ${corSelecionada.toUpperCase() === c.toUpperCase() ? 'active' : ''}" data-color="${c}" style="background: ${c};"></div>
                        `).join('')}
                    </div>
                    <div class="catg-color-row">
                        <div class="catg-color-view" id="previewCor" style="background: ${corSelecionada}"></div>
                        <input type="text" class="catg-color-hex" id="hexCor" value="${corSelecionada.toUpperCase()}">
                        <input type="color" id="hiddenPicker" style="display:none" value="${corSelecionada}">
                    </div>
                </div>
            </div>

            <div class="catg-modal-footer">
                <button class="catg-btn-circle catg-blue" id="btnResetCat" title="Restaurar"><i data-lucide="rotate-ccw"></i></button>
                <button class="catg-btn-circle catg-green" id="btnSalvarCat" title="Salvar Categoria"><i data-lucide="check"></i></button>
            </div>
        </div>
    `;

    document.body.appendChild(modalOverlay);
    createIcons({ icons });

    const inputNome = modalOverlay.querySelector('#inNomeCat') as HTMLInputElement;
    const textPreviewTitle = modalOverlay.querySelector('#textPreviewTitle') as HTMLElement;
    const iconPreview = modalOverlay.querySelector('#iconPreview') as HTMLElement;
    const cardPreview = modalOverlay.querySelector('#cardPreview') as HTMLElement;
    const searchIcon = modalOverlay.querySelector('#searchIcon') as HTMLInputElement;
    const gridIconesContainer = modalOverlay.querySelector('#gridIconesContainer') as HTMLElement;
    const labelIconesCount = modalOverlay.querySelector('#labelIconesCount') as HTMLElement;

    const atualizarPreview = () => {
        const nomeVal = inputNome.value.trim() || 'Nome da Categoria';
        textPreviewTitle.textContent = nomeVal;
        cardPreview.style.background = `${corSelecionada}15`;
        cardPreview.style.borderColor = `${corSelecionada}40`;
        iconPreview.style.background = corSelecionada;
        iconPreview.innerHTML = `<i data-lucide="${iconeSelecionado}"></i>`;
        createIcons({ icons });
    };

    // Função de renderização rápida da grade de ícones
    const renderIconGrid = (icones: string[]) => {
        if (labelIconesCount) {
            labelIconesCount.innerHTML = `<i data-lucide="sparkles" class="label-icon"></i> ESCOLHA UM ÍCONE LUCIDE (${icones.length} OPÇÕES)`;
        }
        gridIconesContainer.innerHTML = icones.map(icon => `
            <div class="catg-icon-item ${iconeSelecionado === icon ? 'active' : ''}" data-icon="${icon}" title="${icon}">
                <i data-lucide="${icon}"></i>
            </div>
        `).join('');
        
        createIcons({ icons, root: gridIconesContainer });

        gridIconesContainer.querySelectorAll('.catg-icon-item').forEach(item => {
            item.addEventListener('click', () => {
                gridIconesContainer.querySelectorAll('.catg-icon-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                iconeSelecionado = (item as HTMLElement).dataset.icon || 'star';
                atualizarPreview();
            });
        });
    };

    // Renderiza inicialmente os ícones mais comuns
    renderIconGrid(ICONES_COMUNS_DEFAULT);

    // Busca dinâmica em tempo real em TODA a biblioteca de ícones Lucide
    searchIcon?.addEventListener('input', () => {
        const query = searchIcon.value.toLowerCase().trim();
        if (!query) {
            renderIconGrid(ICONES_COMUNS_DEFAULT);
        } else {
            const resultados = TODOS_ICONES_LUCIDE.filter(ic => ic.includes(query)).slice(0, 70);
            renderIconGrid(resultados.length > 0 ? resultados : [iconeSelecionado]);
        }
    });

    // Live update do nome
    inputNome.addEventListener('input', atualizarPreview);

    modalOverlay.querySelector('#closeCatForm')?.addEventListener('click', () => modalOverlay.remove());

    const preview = modalOverlay.querySelector('#previewCor') as HTMLElement;
    const picker = modalOverlay.querySelector('#hiddenPicker') as HTMLInputElement;
    const inputHex = modalOverlay.querySelector('#hexCor') as HTMLInputElement;

    const setCor = (novaCor: string) => {
        corSelecionada = novaCor;
        preview.style.background = corSelecionada;
        inputHex.value = corSelecionada.toUpperCase();
        picker.value = corSelecionada;
        modalOverlay.querySelectorAll('.color-preset-pill').forEach(pill => {
            const pColor = (pill as HTMLElement).dataset.color;
            pill.classList.toggle('active', pColor?.toUpperCase() === corSelecionada.toUpperCase());
        });
        atualizarPreview();
    };

    // Paleta de Cores Rápidas
    modalOverlay.querySelectorAll('.color-preset-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            const color = (pill as HTMLElement).dataset.color;
            if (color) setCor(color);
        });
    });

    preview.addEventListener('click', () => picker.click());
    picker.addEventListener('input', () => setCor(picker.value));
    inputHex.addEventListener('change', () => {
        let val = inputHex.value.trim();
        if (!val.startsWith('#')) val = '#' + val;
        if (/^#[0-9A-F]{6}$/i.test(val)) {
            setCor(val);
        }
    });

    // Salvar Categoria
    modalOverlay.querySelector('#btnSalvarCat')?.addEventListener('click', async () => {
        const nome = inputNome.value.trim();
        if (!nome) return modalAlerta.show({ message: "Digite o nome da categoria.", type: "warning" });

        modalAlerta.showLoading(dados ? "Atualizando Categoria..." : "Criando Categoria...");

        try {
            if (dados?.id) {
                await (aniversarioService as any).atualizarCategoria(dados.id, { nome, icone: iconeSelecionado, cor: corSelecionada });
            } else {
                await (aniversarioService as any).salvarCategoria({ nome, icone: iconeSelecionado, cor: corSelecionada });
            }

            modalAlerta.close();
            modalOverlay.remove();
            
            onSuccess();
            onFinalize();

            modalAlerta.show({ message: "Categoria salva com sucesso!", type: "success" }); 

        } catch (err) {
            modalAlerta.close();
            modalAlerta.show({ message: "Erro ao salvar categoria.", type: "error" });
        }
    });

    // Resetar para valores originais
    modalOverlay.querySelector('#btnResetCat')?.addEventListener('click', () => {
        inputNome.value = dados?.nome || '';
        iconeSelecionado = (dados?.icone || 'star').toLowerCase();
        setCor(dados?.cor || '#0052FF');
        renderIconGrid(ICONES_COMUNS_DEFAULT);
        atualizarPreview();
    });
}