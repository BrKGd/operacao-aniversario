import '../styles/categorias.css';
import { aniversarioService } from '../services/aniversarioService';
import { modalAlerta } from '../utils/modalAlertas';
import { 
    Sparkles, LogOut, LayoutGrid, Contact2, CalendarHeart, Settings2,
    createIcons, Wallet, X, RotateCcw, Check, Search, ChevronLeft, 
    Pencil, Trash2, Plus, Star, Heart, Church, Tag, Home, Utensils, 
    Music, Coffee, User, Camera, Gift, Stethoscope, Activity, Pill, 
    Baby, Dumbbell, HelpCircle, Brain, Syringe, Thermometer,
    Users, PartyPopper, Cake, Briefcase, Building, Laptop, Calculator,
    Trophy, Flame, Plane, Car, Gamepad2, Palette, Globe, Sun,
    Moon, Compass, Flag, Bookmark, Crown, Shield, Award, Smile
} from 'lucide';

const ORIGEM_KEY = 'fec_catg_origem';

const ICON_MAP = { 
    ChevronLeft, Pencil, Trash2, Plus, Star, Tag, Heart, Church, Sparkles, 
    LogOut, LayoutGrid, Contact2, CalendarHeart, Settings2, Wallet, X, 
    RotateCcw, Check, Search, Home, Utensils, Music, Coffee, User, Camera, 
    Gift, Stethoscope, Activity, Pill, Baby, Dumbbell, HelpCircle, Brain, 
    Syringe, Thermometer, Users, PartyPopper, Cake, Briefcase, Building, 
    Laptop, Calculator, Trophy, Flame, Plane, Car, Gamepad2, Palette, 
    Globe, Sun, Moon, Compass, Flag, Bookmark, Crown, Shield, Award, Smile
};

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
        const categorias = await aniversarioService.listarCategorias();

        container.innerHTML = `
            <div class="catg-container">
                <button class="catg-btn-back" id="btnVoltarApp" title="Voltar">
                    <i data-lucide="chevron-left"></i>
                </button>

                <div class="catg-header">
                    <h2>Categorias</h2>
                    <p style="color: var(--fec-text-muted, #64748b); margin-top: -5px;">Gerencie seus grupos de aniversariantes</p>
                </div>

                <div class="catg-list">
                    ${categorias.map(cat => `
                        <div class="catg-item">
                            <div class="catg-icon-box" style="background: ${cat.cor}20; color: ${cat.cor}">
                                <i data-lucide="${cat.icone || 'tag'}"></i>
                            </div>
                            <div class="catg-info">
                                <span>${cat.nome}</span>
                            </div>
                            <div class="catg-actions">
                                <button class="catg-btn-mini catg-edit" data-id="${cat.id}">
                                    <i data-lucide="pencil"></i>
                                </button>
                                <button class="catg-btn-mini catg-del" data-id="${cat.id}">
                                    <i data-lucide="trash-2"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <button class="catg-btn-add" id="btnNovaCat">
                    <i data-lucide="plus"></i> Nova Categoria
                </button>
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

        document.getElementById('btnNovaCat')?.addEventListener('click', () => {
            abrirModalCategoria(null, () => montarCategorias(container), acaoVoltar);
        });

        container.querySelectorAll('.catg-edit').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = (btn as HTMLElement).dataset.id;
                const categoria = categorias.find(c => c.id === id);
                if (categoria) {
                    abrirModalCategoria(categoria, () => montarCategorias(container), acaoVoltar);
                }
            });
        });

        container.querySelectorAll('.catg-del').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = (btn as HTMLElement).dataset.id!;
                const confirmar = await modalAlerta.show({
                    title: "Excluir Categoria?",
                    message: "Deseja realmente remover este grupo?",
                    type: "confirm"
                });

                if (confirmar) {
                    modalAlerta.showLoading("Excluindo...");
                    await aniversarioService.excluirCategoria(id);
                    modalAlerta.close();
                    await modalAlerta.show({ message: "Categoria removida!", type: "success" });
                    montarCategorias(container);
                }
            });
        });

        createIcons({ icons: ICON_MAP });

    } catch (e) {
        container.innerHTML = `<div class="fec-center-wrapper">Erro ao carregar dados.</div>`;
    }
}

function abrirModalCategoria(dados: any | null, onSuccess: () => void, onFinalize: () => void) {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'catg-modal-overlay';
    
    let iconeSelecionado = dados?.icone || 'star';
    let corSelecionada = dados?.cor || '#0052FF';

    // Lista Expandida de Ícones Lucide (45+ Ícones Úteis)
    const listaIcones = [
        'star', 'heart', 'users', 'user', 'party-popper', 'cake', 'gift', 'sparkles',
        'crown', 'shield', 'award', 'smile', 'briefcase', 'building', 'laptop',
        'calculator', 'trophy', 'flame', 'stethoscope', 'activity', 'pill', 'baby',
        'dumbbell', 'brain', 'syringe', 'thermometer', 'church', 'home', 'utensils',
        'music', 'coffee', 'camera', 'plane', 'car', 'gamepad-2', 'palette', 'globe',
        'sun', 'moon', 'compass', 'flag', 'bookmark', 'tag'
    ];

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
                <!-- PREVIEW EM TEMPO REAL -->
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

                <!-- ESCOLHA DO ÍCONE -->
                <div class="catg-input-group">
                    <div class="label-row">
                        <label><i data-lucide="sparkles" class="label-icon"></i> ESCOLHA UM ÍCONE LUCIDE (${listaIcones.length} OPÇÕES)</label>
                    </div>
                    <div class="catg-icon-grid-box">
                        <div class="icon-search-wrapper">
                            <i data-lucide="search" class="search-icon-inside"></i>
                            <input type="text" class="catg-input-text icon-search-input" id="searchIcon" placeholder="Buscar ícone (ex: heart, gift, star)...">
                        </div>
                        <div class="catg-icon-grid" id="gridIconesContainer">
                            ${listaIcones.map(icon => `
                                <div class="catg-icon-item ${iconeSelecionado === icon ? 'active' : ''}" data-icon="${icon}">
                                    <i data-lucide="${icon}"></i>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- COR DA IDENTIDADE -->
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
    createIcons({ icons: ICON_MAP });

    const inputNome = modalOverlay.querySelector('#inNomeCat') as HTMLInputElement;
    const textPreviewTitle = modalOverlay.querySelector('#textPreviewTitle') as HTMLElement;
    const iconPreview = modalOverlay.querySelector('#iconPreview') as HTMLElement;
    const cardPreview = modalOverlay.querySelector('#cardPreview') as HTMLElement;
    const searchIcon = modalOverlay.querySelector('#searchIcon') as HTMLInputElement;

    const atualizarPreview = () => {
        const nomeVal = inputNome.value.trim() || 'Nome da Categoria';
        textPreviewTitle.textContent = nomeVal;
        cardPreview.style.background = `${corSelecionada}15`;
        cardPreview.style.borderColor = `${corSelecionada}40`;
        iconPreview.style.background = corSelecionada;
        iconPreview.innerHTML = `<i data-lucide="${iconeSelecionado}"></i>`;
        createIcons({ icons: ICON_MAP });
    };

    // Live update do nome
    inputNome.addEventListener('input', atualizarPreview);

    // Busca de ícones em tempo real
    searchIcon?.addEventListener('input', () => {
        const query = searchIcon.value.toLowerCase().trim();
        modalOverlay.querySelectorAll('.catg-icon-item').forEach(item => {
            const iconName = (item as HTMLElement).dataset.icon || '';
            const visivel = iconName.toLowerCase().includes(query);
            (item as HTMLElement).style.display = visivel ? 'flex' : 'none';
        });
    });

    modalOverlay.querySelector('#closeCatForm')?.addEventListener('click', () => modalOverlay.remove());

    // Seleção de ícones
    modalOverlay.querySelectorAll('.catg-icon-item').forEach(item => {
        item.addEventListener('click', () => {
            modalOverlay.querySelectorAll('.catg-icon-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            iconeSelecionado = (item as HTMLElement).dataset.icon || 'star';
            atualizarPreview();
        });
    });

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
            
            await modalAlerta.show({ message: "Categoria salva com sucesso!", type: "success" });

            onSuccess();
            onFinalize(); 

        } catch (err) {
            modalAlerta.close();
            modalAlerta.show({ message: "Erro ao salvar categoria.", type: "error" });
        }
    });

    // Resetar para valores originais
    modalOverlay.querySelector('#btnResetCat')?.addEventListener('click', () => {
        inputNome.value = dados?.nome || '';
        iconeSelecionado = dados?.icone || 'star';
        setCor(dados?.cor || '#0052FF');
        modalOverlay.querySelectorAll('.catg-icon-item').forEach(i => {
            const el = i as HTMLElement;
            el.classList.toggle('active', el.dataset.icon === iconeSelecionado);
        });
        atualizarPreview();
    });
}