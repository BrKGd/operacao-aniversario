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
                        <label class="label-mini">Categoria / Círculo (Clique direito ou Segure para editar)</label>
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
                            <span id="tituloModalCat">Nova Categoria</span>
                        </div>
                        <button type="button" id="fecharModal" class="btn-close-circle">
                            <i data-lucide="x"></i>
                        </button>
                    </div>

                    <div class="modal-body-scroll">
                        <input type="hidden" id="idCategoriaEdicao">
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
                        <button type="button" id="btnExcluirCategoria" class="btn-action-round" style="background: #fee2e2; color: #ef4444; display: none;">
                            <i data-lucide="trash-2"></i>
                        </button>
                        <button type="button" id="btnSalvarCategoria" class="btn-action-round confirm">
                            <i data-lucide="check"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        const form = document.getElementById('formAniversario') as HTMLFormElement;
        const selectCategoria = document.getElementById('categoria_id') as HTMLSelectElement;
        const modal = document.getElementById('modalCategoria') as HTMLElement;
        const gridIcones = document.getElementById('gridIcones') as HTMLElement;
        const hiddenIconInput = document.getElementById('novoIconeCategoria') as HTMLInputElement;
        const inputBusca = document.getElementById('buscaIcone') as HTMLInputElement;

        const atualizarIconesNaTela = () => {
            createIcons({
                icons,
                attrs: { strokeWidth: 2, width: 24, height: 24 }
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
                const kebabName = key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
                const isSelected = hiddenIconInput.value === kebabName;
                return `
                    <div class="icon-card ${isSelected ? 'selected' : ''}" data-icon="${kebabName}">
                        <i data-lucide="${kebabName}"></i>
                    </div>
                `;
            }).join('');

            atualizarIconesNaTela();

            gridIcones.querySelectorAll('.icon-card').forEach(card => {
                card.addEventListener('click', () => {
                    gridIcones.querySelectorAll('.icon-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    hiddenIconInput.value = (card as HTMLElement).dataset.icon || 'user';
                });
            });
        };

        // --- Lógica de Edição de Categoria ---
        const abrirEdicaoCategoria = (id: string) => {
            const cat = categorias.find(c => c.id === id);
            if (!cat) return;

            (document.getElementById('tituloModalCat') as HTMLElement).innerText = "Editar Categoria";
            (document.getElementById('idCategoriaEdicao') as HTMLInputElement).value = cat.id;
            (document.getElementById('novoNomeCategoria') as HTMLInputElement).value = cat.nome;
            (document.getElementById('novaCorCategoria') as HTMLInputElement).value = cat.cor || '#4361ee';
            hiddenIconInput.value = cat.icone || 'user';
            (document.getElementById('btnExcluirCategoria') as HTMLElement).style.display = 'flex';
            
            modal.style.display = 'flex';
            renderizarGrid();
        };

        // --- Eventos de Clique (Híbrido) ---
        let timer: any;
        selectCategoria.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // Bloqueia menu padrão do PC
            if (selectCategoria.value && selectCategoria.value !== 'new') {
                abrirEdicaoCategoria(selectCategoria.value);
            }
        });

        // Long Press para Mobile
        selectCategoria.addEventListener('touchstart', () => {
            timer = setTimeout(() => {
                if (selectCategoria.value && selectCategoria.value !== 'new') {
                    abrirEdicaoCategoria(selectCategoria.value);
                }
            }, 800);
        });
        selectCategoria.addEventListener('touchend', () => clearTimeout(timer));

        // --- Salvar Cadastro Principal ---
        form.onsubmit = async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnSubmit') as HTMLButtonElement;
            btn.disabled = true;

            const dados: Omit<Aniversario, 'id'> = {
                nome: (document.getElementById('nome') as HTMLInputElement).value,
                data_nascimento: (document.getElementById('data_nascimento') as HTMLInputElement).value,
                telefone: (document.getElementById('telefone') as HTMLInputElement).value,
                categoria_id: selectCategoria.value
            };

            try {
                if (idEdicao) {
                    await aniversarioService.atualizar(idEdicao, dados);
                    window.location.hash = `#detalhes?id=${idEdicao}`; // Volta para detalhes
                } else {
                    await aniversarioService.adicionar(dados);
                    window.location.hash = '#elenco';
                }
                form.reset();
            } catch (err) {
                alert("Erro ao salvar.");
            } finally {
                btn.disabled = false;
            }
        };

        // --- Salvar/Excluir Categoria ---
        document.getElementById('btnSalvarCategoria')?.addEventListener('click', async () => {
            const id = (document.getElementById('idCategoriaEdicao') as HTMLInputElement).value;
            const payload = {
                nome: (document.getElementById('novoNomeCategoria') as HTMLInputElement).value,
                cor: (document.getElementById('novaCorCategoria') as HTMLInputElement).value,
                icone: hiddenIconInput.value
            };

            try {
                if (id) {
                    // @ts-ignore
                    await aniversarioService.atualizarCategoria(id, payload);
                } else {
                    await aniversarioService.adicionarCategoria(payload);
                }
                modal.style.display = 'none';
                montarCadastro(container, idEdicao); // Recarrega para atualizar o select
            } catch (err) { alert("Erro ao salvar categoria."); }
        });

        document.getElementById('btnExcluirCategoria')?.addEventListener('click', async () => {
            const id = (document.getElementById('idCategoriaEdicao') as HTMLInputElement).value;
            if (id && confirm("Excluir esta categoria?")) {
                // @ts-ignore
                await aniversarioService.excluirCategoria(id);
                modal.style.display = 'none';
                montarCadastro(container, idEdicao);
            }
        });

        // --- Outros Eventos ---
        inputBusca.addEventListener('input', (e) => renderizarGrid((e.target as HTMLInputElement).value));

        container.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', () => {
                container.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                inputBusca.value = '';
                renderizarGrid();
            });
        });

        selectCategoria.addEventListener('change', () => {
            if (selectCategoria.value === 'new') {
                (document.getElementById('idCategoriaEdicao') as HTMLInputElement).value = '';
                (document.getElementById('tituloModalCat') as HTMLElement).innerText = "Nova Categoria";
                (document.getElementById('btnExcluirCategoria') as HTMLElement).style.display = 'none';
                modal.style.display = 'flex';
                renderizarGrid();
            }
        });

        document.getElementById('fecharModal')?.addEventListener('click', () => modal.style.display = 'none');
        document.getElementById('btnCancelar')?.addEventListener('click', () => {
             window.history.back();
        });

        atualizarIconesNaTela();

    } catch (error) {
        console.error(error);
        container.innerHTML = `<div class="error-msg">Erro ao carregar formulário.</div>`;
    }
}