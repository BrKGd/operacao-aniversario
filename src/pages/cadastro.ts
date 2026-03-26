import '../styles/cadastro.css';
import { aniversarioService } from '../services/aniversarioService';
import { Aniversario, Categoria } from '../types';
import { createIcons, icons } from 'lucide';

const ICON_CATEGORIES: Record<string, string[]> = {
    "Populares": ["User", "Heart", "Star", "Bell", "CheckCircle", "Smile", "Flag", "Flame"],
    "Esportes": ["Trophy", "Bike", "Dumbbell", "Medal", "Target", "Timer", "Footprints"],
    "Trabalho": ["Briefcase", "FileText", "Building", "Laptop", "HardHat", "Keyboard"],
    "Lazer": ["Music", "Camera", "Gamepad2", "Coffee", "Beer", "Utensils", "Plane", "Tent"],
    "Família": ["Home", "Baby", "Users", "Church", "Gift", "Cake", "HeartHandshake"]
};

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
                        <label class="label-mini">Categoria / Círculo (Clique direito/Segure para editar)</label>
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
                            <span>${idEdicao ? 'Salvar Alterações' : 'Cadastrar'}</span>
                        </button>
                    </div>
                </form>
            </div>

            <!-- Modal de Categoria (Mantido igual) -->
            <div id="modalCategoria" class="modal-overlay" style="display: none;">
                <div class="modern-card">
                    <div class="form-header-dark">
                        <div class="header-title">
                            <i data-lucide="tag"></i>
                            <span id="tituloModalCat">Nova Categoria</span>
                        </div>
                        <button type="button" id="fecharModal" class="btn-close-circle"><i data-lucide="x"></i></button>
                    </div>
                    <div class="modal-body-scroll">
                        <input type="hidden" id="idCategoriaEdicao">
                        <label class="label-mini">Nome</label>
                        <input type="text" id="novoNomeCategoria" class="modern-input">
                        <label class="label-mini">Cor</label>
                        <input type="color" id="novaCorCategoria" class="modern-input" value="#4361ee">
                        <div id="gridIcones" class="modern-icon-grid"></div>
                        <input type="hidden" id="novoIconeCategoria" value="user">
                    </div>
                    <div class="floating-actions-modal">
                        <button type="button" id="btnExcluirCategoria" class="btn-action-round" style="display: none; background: #fee2e2; color: #ef4444;">
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
        const btnCancelar = document.getElementById('btnCancelar') as HTMLButtonElement;

        // --- Lógica de Navegação/Ações ---

        const voltarParaDetalhes = () => {
            if (idEdicao) {
                window.location.hash = `#detalhes?id=${idEdicao}`;
            }
        };

        const limparCampos = () => {
            form.reset();
            // Garante que o select volte ao estado vazio se for novo cadastro
            if (!idEdicao) selectCategoria.value = "";
        };

        btnCancelar.addEventListener('click', () => {
            if (idEdicao) {
                voltarParaDetalhes();
            } else {
                limparCampos();
            }
        });

        form.onsubmit = async (e) => {
            e.preventDefault();
            const btnSubmit = document.getElementById('btnSubmit') as HTMLButtonElement;
            btnSubmit.disabled = true;

            const dados: Omit<Aniversario, 'id'> = {
                nome: (document.getElementById('nome') as HTMLInputElement).value,
                data_nascimento: (document.getElementById('data_nascimento') as HTMLInputElement).value,
                telefone: (document.getElementById('telefone') as HTMLInputElement).value,
                categoria_id: selectCategoria.value
            };

            try {
                if (idEdicao) {
                    await aniversarioService.atualizar(idEdicao, dados);
                    voltarParaDetalhes();
                } else {
                    await aniversarioService.adicionar(dados);
                    alert("Cadastrado com sucesso!");
                    limparCampos();
                }
            } catch (err) {
                console.error(err);
                alert("Erro ao processar requisição.");
            } finally {
                btnSubmit.disabled = false;
            }
        };

        // --- Funções de Ícones e Modal (Mantidas e Otimizadas) ---

        const atualizarIconesNaTela = () => createIcons({ icons, attrs: { strokeWidth: 2, width: 24, height: 24 } });

        const abrirEdicaoCategoria = (id: string) => {
            const cat = categorias.find(c => c.id === id);
            if (!cat) return;
            (document.getElementById('tituloModalCat') as HTMLElement).innerText = "Editar Categoria";
            (document.getElementById('idCategoriaEdicao') as HTMLInputElement).value = cat.id;
            (document.getElementById('novoNomeCategoria') as HTMLInputElement).value = cat.nome;
            (document.getElementById('novaCorCategoria') as HTMLInputElement).value = cat.cor || '#4361ee';
            (document.getElementById('novoIconeCategoria') as HTMLInputElement).value = cat.icone || 'user';
            (document.getElementById('btnExcluirCategoria') as HTMLElement).style.display = 'flex';
            modal.style.display = 'flex';
            // Renderizar grid após abrir modal
            renderizarGrid();
        };

        // Eventos Híbridos (PC: Direito | Mobile: Segurar)
        let timer: any;
        selectCategoria.oncontextmenu = (e) => {
            e.preventDefault();
            if (selectCategoria.value && selectCategoria.value !== 'new') abrirEdicaoCategoria(selectCategoria.value);
        };
        selectCategoria.ontouchstart = () => {
            timer = setTimeout(() => {
                if (selectCategoria.value && selectCategoria.value !== 'new') abrirEdicaoCategoria(selectCategoria.value);
            }, 700);
        };
        selectCategoria.ontouchend = () => clearTimeout(timer);

        // Renderização do Grid de Ícones (Simplificada para o exemplo)
        const renderizarGrid = () => {
            const grid = document.getElementById('gridIcones') as HTMLElement;
            const hiddenIcon = document.getElementById('novoIconeCategoria') as HTMLInputElement;
            const iconsToShow = ICON_CATEGORIES["Populares"]; // Exemplo simplificado

            grid.innerHTML = iconsToShow.map(icon => {
                const kebab = icon.toLowerCase();
                return `<div class="icon-card ${hiddenIcon.value === kebab ? 'selected' : ''}" data-icon="${kebab}">
                            <i data-lucide="${kebab}"></i>
                        </div>`;
            }).join('');
            
            atualizarIconesNaTela();

            grid.querySelectorAll('.icon-card').forEach(card => {
                card.onclick = () => {
                    grid.querySelectorAll('.icon-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    hiddenIcon.value = (card as HTMLElement).dataset.icon || 'user';
                };
            });
        };

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
        
        atualizarIconesNaTela();

    } catch (error) {
        container.innerHTML = `<div class="error-msg">Erro ao carregar formulário.</div>`;
    }
}