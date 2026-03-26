import '../styles/cadastro.css';
import { aniversarioService } from '../services/aniversarioService';
import { Aniversario, Categoria } from '../types';
// ✅ Importação correta para Vanilla
import { createIcons, icons } from 'lucide';

const ICON_CATEGORIES: Record<string, string[]> = {
    "Populares": ["User", "Heart", "Star", "Bell", "CheckCircle", "Smile", "Flag", "Flame"],
    "Esportes": ["Trophy", "Bike", "Dumbbell", "Medal", "Target", "Timer", "Footprints"],
    "Trabalho": ["Briefcase", "FileText", "Building", "Laptop", "HardHat", "Keyboard"],
    "Lazer": ["Music", "Camera", "Gamepad2", "Coffee", "Beer", "Utensils", "Plane", "Tent"],
    "Família": ["Home", "Baby", "Users", "Church", "Gift", "Cake", "HeartHandshake"]
};

// Pega todos os nomes de ícones disponíveis no objeto 'icons'
const ALL_LUCIDE_KEYS = Object.keys(icons).sort();

export async function montarCadastro(container: HTMLElement, idEdicao?: string) {
    container.innerHTML = `<div class="loading">Preparando convocação...</div>`;

    try {
        const [categorias, todos]: [Categoria[], Aniversario[]] = await Promise.all([
            aniversarioService.listarCategorias(),
            idEdicao ? aniversarioService.listarTodos() : Promise.resolve([])
        ]);

        const dadosEdicao = idEdicao ? todos.find(t => t.id === idEdicao) || null : null;

        container.innerHTML = `
            <div class="form-container modern-style">
                <div class="form-header-dark">
                    <div class="header-title">
                        <i data-lucide="${idEdicao ? 'user-cog' : 'user-plus'}"></i>
                        <span>${idEdicao ? 'Editar Convocado' : 'Nova Escalação'}</span>
                    </div>
                </div>

                <form id="formAniversario" class="form-body">
                    <!-- ... campos de nome, data e telefone (mantidos iguais) ... -->
                    <div class="form-group">
                        <label class="label-mini">Nome Completo *</label>
                        <input type="text" id="nome" class="modern-input" required 
                               value="${dadosEdicao?.nome || ''}" placeholder="Ex: Marcelo Boeck">
                    </div>

                    <div class="form-row-group">
                        <div class="form-group">
                            <label class="label-mini">Data de Nascimento *</label>
                            <input type="date" id="data_nascimento" class="modern-input" required
                                   value="${dadosEdicao?.data_nascimento || ''}">
                        </div>
                        <div class="form-group">
                            <label class="label-mini">WhatsApp</label>
                            <input type="tel" id="telefone" class="modern-input" 
                            value="${dadosEdicao?.telefone || ''}" placeholder="(85)...">
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="label-mini">Categoria / Círculo</label>
                        <select id="categoria_id" class="modern-input" required>
                            <option value="">Selecione uma categoria</option>
                            <option value="new" style="font-weight: bold; color: #4361ee;">+ Adicionar Nova Categoria...</option>
                            ${categorias.map(cat => `
                                <option value="${cat.id}" ${dadosEdicao?.categoria_id === cat.id ? 'selected' : ''}>
                                    ${cat.nome}
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <div class="floating-actions">
                        <button type="button" class="btn-cancelar" id="btnCancelar">Cancelar</button>
                        <button type="submit" class="btn-salvar" id="btnSubmit">
                            <span>${idEdicao ? 'Salvar' : 'Cadastrar'}</span>
                        </button>
                    </div>
                </form>
            </div>

            <div id="modalCategoria" class="modal-overlay" style="display: none;">
                <div class="modern-card">
                    <div class="form-header-dark">
                        <div class="header-title">
                            <i data-lucide="tag"></i>
                            <span>Nova Categoria</span>
                        </div>
                        <button type="button" id="fecharModal" class="btn-close-circle">
                            <i data-lucide="x"></i>
                        </button>
                    </div>

                    <div class="modal-body-scroll">
                        <label class="label-mini">Nome da Categoria</label>
                        <input type="text" id="novoNomeCategoria" class="modern-input" placeholder="Ex: Academia">
                        
                        <label class="label-mini">Cor Identificadora</label>
                        <input type="color" id="novaCorCategoria" class="modern-input" value="#4361ee">
                        
                        <label class="label-mini">Escolha um Ícone</label>
                        <div class="icon-selector-section">
                            <div class="search-wrapper">
                                <i data-lucide="search" class="search-icon-inside"></i>
                                <input type="text" id="buscaIcone" class="search-input" placeholder="Pesquisar ícones...">
                            </div>

                            <div id="categoryChips" class="category-chips-row">
                                <button type="button" class="chip active" data-cat="Populares">Populares</button>
                                <button type="button" class="chip" data-cat="Esportes">Esportes</button>
                                <button type="button" class="chip" data-cat="Trabalho">Trabalho</button>
                                <button type="button" class="chip" data-cat="Lazer">Lazer</button>
                                <button type="button" class="chip" data-cat="Família">Família</button>
                                <button type="button" class="chip" data-cat="all">Todos</button>
                            </div>

                            <div id="gridIcones" class="modern-icon-grid"></div>
                        </div>
                        <input type="hidden" id="novoIconeCategoria" value="user">
                    </div>

                    <div class="floating-actions-modal">
                         <button type="button" id="btnSalvarCategoria" class="btn-action-round confirm">
                            <i data-lucide="check"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        const selectCategoria = document.getElementById('categoria_id') as HTMLSelectElement;
        const modal = document.getElementById('modalCategoria') as HTMLElement;
        const gridIcones = document.getElementById('gridIcones') as HTMLElement;
        const hiddenIconInput = document.getElementById('novoIconeCategoria') as HTMLInputElement;
        const inputBusca = document.getElementById('buscaIcone') as HTMLInputElement;

        // Função principal que "ativa" os ícones do Lucide
        const atualizarIconesNaTela = () => {
            createIcons({
                icons, // Passa o objeto de ícones importado
                attrs: {
                    strokeWidth: 2,
                    width: 24,
                    height: 24
                }
            });
        };

        const renderizarGrid = (filtro: string = '') => {
            let chaves: string[] = [];
            const categoriaAtiva = document.querySelector('.chip.active')?.getAttribute('data-cat') || 'Populares';

            if (filtro.trim()) {
                chaves = ALL_LUCIDE_KEYS.filter(k => k.toLowerCase().includes(filtro.toLowerCase())).slice(0, 50);
            } else if (categoriaAtiva === 'all') {
                chaves = ALL_LUCIDE_KEYS.slice(0, 50);
            } else {
                chaves = ICON_CATEGORIES[categoriaAtiva] || [];
            }

            gridIcones.innerHTML = chaves.map(key => {
                // O Lucide Vanilla espera o nome do ícone em kebab-case ou como definido no data-lucide
                // Como as chaves de 'icons' geralmente são PascalCase, formatamos:
                const kebabName = key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
                const isSelected = hiddenIconInput.value === kebabName;
                
                return `
                    <div class="icon-card ${isSelected ? 'selected' : ''}" data-icon="${kebabName}">
                        <i data-lucide="${kebabName}"></i>
                    </div>
                `;
            }).join('');

            // CRÍTICO: Registra o clique e RE-RENDERIZA o Lucide para as novas tags <i>
            atualizarIconesNaTela();

            gridIcones.querySelectorAll('.icon-card').forEach(card => {
                card.addEventListener('click', () => {
                    gridIcones.querySelectorAll('.icon-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    hiddenIconInput.value = card.getAttribute('data-icon') || 'user';
                });
            });
        };

        // --- Eventos ---
        inputBusca.addEventListener('input', (e) => {
            renderizarGrid((e.target as HTMLInputElement).value);
        });

        document.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                inputBusca.value = '';
                renderizarGrid();
            });
        });

        selectCategoria.addEventListener('change', () => {
            if (selectCategoria.value === 'new') {
                modal.style.display = 'flex';
                selectCategoria.value = '';
                renderizarGrid();
            }
        });

        document.getElementById('fecharModal')?.addEventListener('click', () => modal.style.display = 'none');

        // Renderização inicial (ícones do formulário principal)
        atualizarIconesNaTela();

    } catch (error) {
        console.error(error);
        container.innerHTML = `<div class="error-msg">Erro ao carregar formulário.</div>`;
    }
}