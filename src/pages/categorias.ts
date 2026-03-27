import '../styles/categorias.css';
import { aniversarioService } from '../services/aniversarioService';
import { modalAlerta } from '../utils/modalAlertas';
import { 
    Sparkles, 
    LogOut, 
    LayoutGrid, 
    Contact2, 
    CalendarHeart, 
    Settings2,
    createIcons, 
    Wallet, 
    X, 
    RotateCcw, 
    Check, 
    Search, 
    ChevronLeft, 
    Pencil, 
    Trash2, 
    Plus,
    Star,
    Heart,
    Church,
    Tag,
    Home,
    Utensils,
    Music,
    Coffee,
    User,
    Camera, // Adicionado
    Gift,   // Adicionado
    Stethoscope,
    Activity,
    Pill,
    Baby,
    Dumbbell,
    HelpCircle,
    Brain,
    Syringe,
    Thermometer
} from 'lucide';

let telaOrigem = '#cadastro';

export async function montarCategorias(container: HTMLElement) {
    const hashAtual = window.location.hash;
    if (hashAtual && hashAtual !== '#categorias' && !hashAtual.includes('id=')) {
        telaOrigem = hashAtual;
    }

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
                    <p style="color: #64748b; margin-top: -5px;">Gerencie seus grupos de aniversariantes</p>
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

        document.getElementById('btnVoltarApp')?.addEventListener('click', () => {
            window.location.hash = telaOrigem;
        });

        document.getElementById('btnNovaCat')?.addEventListener('click', () => {
            abrirModalCategoria(null, () => montarCategorias(container));
        });

        container.querySelectorAll('.catg-edit').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = (btn as HTMLElement).dataset.id;
                const categoria = categorias.find(c => c.id === id);
                if (categoria) abrirModalCategoria(categoria, () => montarCategorias(container));
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

        createIcons({ 
            icons: { ChevronLeft, Pencil, Trash2, Plus, Star, Tag, Heart, Church,Sparkles, 
                LogOut, 
                LayoutGrid, 
                Contact2, 
                CalendarHeart, 
                Settings2 } 
        });

    } catch (e) {
        container.innerHTML = `<div class="fec-center-wrapper">Erro ao carregar dados.</div>`;
    }
}

function abrirModalCategoria(dados: any | null, onSuccess: () => void) {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'catg-modal-overlay';
    
    let iconeSelecionado = dados?.icone || 'star';
    let corSelecionada = dados?.cor || '#4361EE';

    const listaIcones = [
        'heart', 'stethoscope', 'activity', 'pill', 'baby', 'dumbbell', 
        'help-circle', 'brain', 'syringe', 'thermometer', 'star', 'church', 
        'home', 'utensils', 'music', 'coffee', 'user', 'camera', 'gift'
    ];

    modalOverlay.innerHTML = `
        <div class="catg-modal-card">
            <div class="catg-modal-header">
                <h3><i data-lucide="wallet"></i> ${dados ? 'Editar Categoria' : 'Nova Categoria'}</h3>
                <button class="catg-btn-close" id="closeCatForm"><i data-lucide="x"></i></button>
            </div>

            <div class="catg-modal-body">
                <div class="catg-input-group">
                    <label>NOME DA CATEGORIA</label>
                    <input type="text" class="catg-input-text" id="inNomeCat" placeholder="Ex: Amigos, Trabalho..." value="${dados?.nome || ''}">
                </div>

                <div class="catg-input-group">
                    <label>ESCOLHA UM ÍCONE</label>
                    <div class="catg-icon-grid-box">
                        <div style="position: relative; margin-bottom: 12px;">
                            <input type="text" class="catg-input-text" placeholder="Buscar ícones..." style="padding-left: 40px; font-size: 0.9rem;">
                            <i data-lucide="search" style="position: absolute; left: 12px; top: 12px; width: 18px; color: #94a3b8;"></i>
                        </div>
                        
                        <div class="catg-tags-scroll">
                            <span class="catg-tag active">Todos</span>
                            <span class="catg-tag">Saúde</span>
                            <span class="catg-tag">Social</span>
                        </div>

                        <div class="catg-icon-grid">
                            ${listaIcones.map(icon => `
                                <div class="catg-icon-item ${iconeSelecionado === icon ? 'active' : ''}" data-icon="${icon}">
                                    <i data-lucide="${icon}"></i>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <div class="catg-input-group">
                    <label>COR DA IDENTIDADE</label>
                    <div class="catg-color-row">
                        <div class="catg-color-view" id="previewCor" style="background: ${corSelecionada}"></div>
                        <input type="text" class="catg-color-hex" id="hexCor" value="${corSelecionada.toUpperCase()}">
                        <input type="color" id="hiddenPicker" style="display:none" value="${corSelecionada}">
                    </div>
                </div>
            </div>

            <div class="catg-modal-footer">
                <button class="catg-btn-circle catg-blue" id="btnResetCat"><i data-lucide="rotate-ccw"></i></button>
                <button class="catg-btn-circle catg-green" id="btnSalvarCat"><i data-lucide="check"></i></button>
            </div>
        </div>
    `;

    document.body.appendChild(modalOverlay);
    
    createIcons({ 
        icons: { 
            Wallet, X, RotateCcw, Check, Search, Star, Heart, Church, Tag, Home, 
            Utensils, Music, Coffee, User, Camera, Gift, Stethoscope, Activity, 
            Pill, Baby, Dumbbell, HelpCircle, Brain, Syringe, Thermometer,Sparkles, 
            LogOut,LayoutGrid,Contact2,CalendarHeart,Settings2
        } 
    });

    modalOverlay.querySelector('#closeCatForm')?.addEventListener('click', () => modalOverlay.remove());

    modalOverlay.querySelectorAll('.catg-icon-item').forEach(item => {
        item.addEventListener('click', () => {
            modalOverlay.querySelectorAll('.catg-icon-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            iconeSelecionado = (item as HTMLElement).dataset.icon || 'star';
        });
    });

    const preview = modalOverlay.querySelector('#previewCor') as HTMLElement;
    const inputHex = modalOverlay.querySelector('#hexCor') as HTMLInputElement;
    const picker = modalOverlay.querySelector('#hiddenPicker') as HTMLInputElement;

    preview.addEventListener('click', () => picker.click());
    picker.addEventListener('input', () => {
        corSelecionada = picker.value;
        preview.style.background = corSelecionada;
        inputHex.value = corSelecionada.toUpperCase();
    });

    modalOverlay.querySelector('#btnSalvarCat')?.addEventListener('click', async () => {
        const nome = (modalOverlay.querySelector('#inNomeCat') as HTMLInputElement).value;
        if (!nome) return modalAlerta.show({ message: "Digite o nome da categoria.", type: "warning" });

        modalAlerta.showLoading(dados ? "Atualizando..." : "Salvando...");

        try {
            // Nota: Certifique-se que o arquivo aniversarioService.ts contém salvarCategoria e atualizarCategoria
            if (dados?.id) {
                await (aniversarioService as any).atualizarCategoria(dados.id, { nome, icone: iconeSelecionado, cor: corSelecionada });
            } else {
                await (aniversarioService as any).salvarCategoria({ nome, icone: iconeSelecionado, cor: corSelecionada });
            }

            modalAlerta.close();
            modalOverlay.remove();
            await modalAlerta.show({ message: "Sucesso!", type: "success" });
            onSuccess();
            window.location.hash = telaOrigem;

        } catch (err) {
            modalAlerta.close();
            modalAlerta.show({ message: "Erro ao salvar.", type: "error" });
        }
    });
}