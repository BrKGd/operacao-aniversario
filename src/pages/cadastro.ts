import '../styles/cadastro.css';
import { aniversarioService } from '../services/aniversarioService';
import { Aniversario, Categoria } from '../types';
import { createIcons, icons } from 'lucide'; 

export async function montarCadastro(container: HTMLElement, idEdicao?: string) {
    container.innerHTML = `<div class="fec-center-wrapper"><div class="fec-loader-minimal">CONVOCANDO LEÃO...</div></div>`;

    try {
        const [categorias, todos]: [Categoria[], Aniversario[]] = await Promise.all([
            aniversarioService.listarCategorias(),
            idEdicao ? aniversarioService.listarTodos() : Promise.resolve([])
        ]);

        const dadosEdicao = idEdicao ? todos.find(t => t.id === idEdicao) || null : null;
        const ehEdicao = !!(idEdicao && dadosEdicao);

        container.innerHTML = `
            <div class="fec-center-wrapper">
                <div class="fec-form-wrapper">
                    <button class="fec-btn-close" id="btnFecharForm" title="Voltar">
                        <i data-lucide="x"></i>
                    </button>

                    <header class="fec-form-header">
                        <div class="avatar-edit-container">
                            <div class="avatar-squircle-fec">
                                <i data-lucide="user" class="avatar-icon-fec"></i>
                            </div>
                            <div class="avatar-action-btns">
                                <button type="button" class="btn-fec-outline-sm">ESCUDO</button>
                                <button type="button" class="btn-fec-outline-sm">FOTO</button>
                            </div>
                        </div>
                    </header>

                    <form id="formAniversario" class="fec-form-main">
                        <div class="fec-input-group-line">
                            <i data-lucide="user"></i>
                            <input type="text" id="nome" placeholder="Nome do Convocado" required 
                                   value="${dadosEdicao?.nome || ''}">
                        </div>

                        <div class="fec-input-group-line">
                             <i data-lucide="megaphone"></i>
                             <input type="text" id="frase_exibicao" placeholder="Grito / Apelido" 
                                    value="${dadosEdicao?.frase_exibicao || ''}">
                        </div>

                        <div class="fec-input-group-line fec-date-row">
                            <div class="fec-date-content">
                                <i data-lucide="cake"></i>
                                <div class="fec-column-input">
                                    <label class="fec-mini-label">Aniversário</label>
                                    <input type="date" id="data_nascimento" required 
                                           value="${dadosEdicao?.data_nascimento || ''}">
                                </div>
                            </div>
                            <div class="fec-toggle-inline">
                                <span>ANO</span>
                                <label class="fec-switch-ui">
                                    <input type="checkbox" checked>
                                    <span class="fec-slider-ui"></span>
                                </label>
                            </div>
                        </div>

                        <div class="fec-input-group-line">
                             <i data-lucide="layers"></i>
                             <select id="categoria_id" required>
                                <option value="" disabled ${!dadosEdicao ? 'selected' : ''}>Círculo / Categoria</option>
                                <option value="GO_CATEGORIAS" class="opt-manage-fec">⚙️ GERENCIAR CATEGORIAS</option>
                                ${categorias.map(cat => `
                                    <option value="${cat.id}" ${dadosEdicao?.categoria_id === cat.id ? 'selected' : ''}>
                                        ${cat.nome}
                                    </option>
                                `).join('')}
                             </select>
                        </div>

                        <div class="fec-action-footer">
                            <button type="submit" class="btn-fec-submit">
                                ${ehEdicao ? 'ATUALIZAR DADOS' : 'CONFIRMAR ESCALAÇÃO'}
                            </button>
                            <button type="button" class="btn-fec-cancel" id="btnCancelar">CANCELAR</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        const form = document.getElementById('formAniversario') as HTMLFormElement;
        const selectCat = document.getElementById('categoria_id') as HTMLSelectElement;
        const btnFechar = document.getElementById('btnFecharForm');
        const btnCancelar = document.getElementById('btnCancelar');

        const voltar = () => window.history.back();
        btnFechar?.addEventListener('click', voltar);
        btnCancelar?.addEventListener('click', voltar);

        selectCat.addEventListener('change', () => {
            if (selectCat.value === 'GO_CATEGORIAS') {
                if ((window as any).navegar) (window as any).navegar('categorias');
                else window.location.hash = '#categorias';
            }
        });

        form.onsubmit = async (e) => {
            e.preventDefault();
            const btn = document.querySelector('.btn-fec-submit') as HTMLButtonElement;
            btn.innerText = "SALVANDO...";
            btn.disabled = true;

            const dados = {
                nome: (document.getElementById('nome') as HTMLInputElement).value,
                frase_exibicao: (document.getElementById('frase_exibicao') as HTMLInputElement).value,
                data_nascimento: (document.getElementById('data_nascimento') as HTMLInputElement).value,
                categoria_id: selectCat.value
            };

            try {
                if (ehEdicao && idEdicao) {
                    await aniversarioService.atualizar(idEdicao, dados);
                    window.location.hash = `#detalhes?id=${idEdicao}`;
                } else {
                    await aniversarioService.adicionar(dados);
                    form.reset();
                    alert("✅ Convocação realizada!");
                }
            } catch (err) {
                alert("❌ Erro ao salvar.");
            } finally {
                btn.innerText = ehEdicao ? 'ATUALIZAR DADOS' : 'CONFIRMAR ESCALAÇÃO';
                btn.disabled = false;
                createIcons({ icons });
            }
        };

        createIcons({ icons });
    } catch (error) {
        container.innerHTML = `<div class="fec-center-wrapper"><div class="fec-loader-minimal">ERRO NA CONVOCAÇÃO</div></div>`;
    }
}