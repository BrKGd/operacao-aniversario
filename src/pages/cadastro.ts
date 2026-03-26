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
                    value="${dadosEdicao?.nome || ''}">
            </div>

            <div class="form-row-group">
                <input type="date" id="data_nascimento" required
                    value="${dadosEdicao?.data_nascimento || ''}">
                <input type="tel" id="telefone"
                    value="${dadosEdicao?.telefone || ''}">
            </div>

            <select id="categoria_id" required>
                <option value="">Selecione</option>
                <option value="new">+ Nova Categoria</option>
                ${categorias.map(cat => `
                    <option value="${cat.id}" ${dadosEdicao?.categoria_id === cat.id ? 'selected' : ''}>
                        ${cat.nome}
                    </option>
                `).join('')}
            </select>

            <div class="floating-actions">
                <button type="button" id="btnCancelar">Cancelar</button>
                <button type="submit" id="btnSubmit">
                    ${idEdicao ? 'Salvar' : 'Cadastrar'}
                </button>
            </div>
        </form>
    </div>

    <!-- Modal Categoria -->
    <div id="modalCategoria" class="modal-overlay" style="display:none;">
        <div class="modern-card">
            <h3 id="tituloModalCat">Nova Categoria</h3>
            <input type="hidden" id="idCategoriaEdicao">
            <input type="text" id="novoNomeCategoria">
            <input type="color" id="novaCorCategoria" value="#4361ee">
            <div id="gridIcones"></div>
            <input type="hidden" id="novoIconeCategoria" value="user">

            <button id="btnSalvarCategoria">Salvar</button>
            <button id="btnExcluirCategoria" style="display:none;">Excluir</button>
            <button id="fecharModal">Fechar</button>
        </div>
    </div>

    <!-- Modal Ações -->
    <div id="modalAcoesCategoria" class="modal-overlay" style="display:none;">
        <div class="modern-card">
            <button id="btnEditarCategoria">Editar</button>
            <button id="btnExcluirCategoriaAcao">Excluir</button>
            <button id="btnCancelarAcao">Cancelar</button>
        </div>
    </div>
    `;

    const form = document.getElementById('formAniversario') as HTMLFormElement;
    const selectCategoria = document.getElementById('categoria_id') as HTMLSelectElement;
    const modal = document.getElementById('modalCategoria') as HTMLElement;
    const modalAcoes = document.getElementById('modalAcoesCategoria') as HTMLElement;
    const hiddenIconInput = document.getElementById('novoIconeCategoria') as HTMLInputElement;

    let categoriaSelecionada: string | null = null;

    const atualizarIconesNaTela = () => {
        createIcons({ icons });
    };

    const abrirEdicaoCategoria = (id: string) => {
        const cat = categorias.find(c => c.id === id);
        if (!cat) return;

        (document.getElementById('idCategoriaEdicao') as HTMLInputElement).value = cat.id;
        (document.getElementById('novoNomeCategoria') as HTMLInputElement).value = cat.nome;
        (document.getElementById('novaCorCategoria') as HTMLInputElement).value = cat.cor || '#4361ee';
        hiddenIconInput.value = cat.icone || 'user';

        modal.style.display = 'flex';
    };

    const abrirAcoesCategoria = (id: string) => {
        categoriaSelecionada = id;
        modalAcoes.style.display = 'flex';
    };

    // CANCELAR
    document.getElementById('btnCancelar')?.addEventListener('click', () => {
        if (idEdicao) {
            window.location.hash = `#detalhes?id=${idEdicao}`;
        } else {
            form.reset();
        }
    });

    // SALVAR
    form.onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnSubmit') as HTMLButtonElement;

        btn.disabled = true;
        btn.innerText = 'Salvando...';

        const dados: Omit<Aniversario, 'id'> = {
            nome: (document.getElementById('nome') as HTMLInputElement).value,
            data_nascimento: (document.getElementById('data_nascimento') as HTMLInputElement).value,
            telefone: (document.getElementById('telefone') as HTMLInputElement).value,
            categoria_id: selectCategoria.value
        };

        try {
            if (idEdicao) {
                await aniversarioService.atualizar(idEdicao, dados);
                window.location.hash = `#detalhes?id=${idEdicao}`;
            } else {
                await aniversarioService.adicionar(dados);
                window.location.hash = '#list';
            }
        } catch {
            alert("Erro ao salvar.");
        } finally {
            btn.disabled = false;
            btn.innerText = idEdicao ? 'Salvar' : 'Cadastrar';
        }
    };

    // NOVA CATEGORIA
    selectCategoria.addEventListener('change', () => {
        if (selectCategoria.value === 'new') {
            modal.style.display = 'flex';
        }
    });

    // LONG PRESS / RIGHT CLICK
    selectCategoria.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (selectCategoria.value && selectCategoria.value !== 'new') {
            abrirAcoesCategoria(selectCategoria.value);
        }
    });

    // AÇÕES
    document.getElementById('btnEditarCategoria')?.addEventListener('click', () => {
        modalAcoes.style.display = 'none';
        if (categoriaSelecionada) abrirEdicaoCategoria(categoriaSelecionada);
    });

    document.getElementById('btnExcluirCategoriaAcao')?.addEventListener('click', async () => {
        if (!categoriaSelecionada) return;
        if (confirm("Excluir categoria?")) {
            await aniversarioService.excluirCategoria(categoriaSelecionada);
            montarCadastro(container, idEdicao);
        }
    });

    document.getElementById('btnCancelarAcao')?.addEventListener('click', () => {
        modalAcoes.style.display = 'none';
    });

    document.getElementById('fecharModal')?.addEventListener('click', () => modal.style.display = 'none');

    atualizarIconesNaTela();

} catch (error) {
    container.innerHTML = `<div class="error-msg">Erro ao carregar formulário.</div>`;
}


}
