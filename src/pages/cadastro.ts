import '../styles/cadastro.css';
import { aniversarioService } from '../services/aniversarioService';
import { Aniversario, Categoria } from '../types';
import { createIcons, icons } from 'lucide'; 

export async function montarCadastro(container: HTMLElement, idEdicao?: string) {
    container.innerHTML = `<div class="loading">Preparando convocação...</div>`;

    try {
        const [categorias, todos]: [Categoria[], Aniversario[]] = await Promise.all([
            aniversarioService.listarCategorias(),
            idEdicao ? aniversarioService.listarTodos() : Promise.resolve([])
        ]);

        // ✅ Garantindo a detecção firme da edição
        const dadosEdicao = idEdicao ? todos.find(t => t.id === idEdicao) || null : null;
        const ehEdicao = !!(idEdicao && dadosEdicao);

        container.innerHTML = `
            <div class="form-container modern-style">
                <div class="form-header-dark">
                    <div class="header-title">
                        <i data-lucide="${ehEdicao ? 'user-cog' : 'user-plus'}"></i>
                        <span>${ehEdicao ? 'Editar Convocado' : 'Nova Escalação'}</span>
                    </div>
                </div>

                <form id="formAniversario" class="form-body" style="padding: 24px;">
                    <div class="form-group">
                        <label class="label-mini">Nome Completo *</label>
                        <input type="text" id="nome" class="modern-input" required 
                               value="${dadosEdicao?.nome || ''}" placeholder="Ex: Marcelo Boeck">
                    </div>

                    <div class="form-group">
                        <label class="label-mini">Frase de Exibição (Apelido ou Mensagem)</label>
                        <input type="text" id="frase_exibicao" class="modern-input" 
                               value="${dadosEdicao?.frase_exibicao || ''}" placeholder="Ex: Paredão do Leão 🦁">
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
                            value="${dadosEdicao?.telefone || ''}" placeholder="(85) 9...">
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="label-mini">Categoria / Círculo *</label>
                        <select id="categoria_id" class="modern-input" required>
                            <option value="">Selecione uma categoria...</option>
                            <option value="GO_CATEGORIAS" style="font-weight: 800; color: var(--vermelho-fortaleza);">
                                ➕ GERENCIAR CATEGORIAS...
                            </option>
                            ${categorias.map(cat => `
                                <option value="${cat.id}" ${dadosEdicao?.categoria_id === cat.id ? 'selected' : ''}>
                                    ${cat.nome}
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <div class="floating-actions" style="display: flex; gap: 12px; margin-top: 24px;">
                        <button type="button" class="btn-cancelar" id="btnSecondaryAction" style="flex: 1; height: 56px;">
                            ${ehEdicao ? 'Voltar' : 'Cancelar'}
                        </button>
                        
                        <button type="submit" class="btn-salvar btn-action-round confirm" id="btnSubmit" style="flex: 2; width: auto; gap: 10px;">
                            <i data-lucide="${ehEdicao ? 'save' : 'check'}"></i>
                            <span>${ehEdicao ? 'Salvar' : 'Cadastrar'}</span>
                        </button>
                    </div>
                </form>
            </div>
        `;

        const form = document.getElementById('formAniversario') as HTMLFormElement;
        const selectCat = document.getElementById('categoria_id') as HTMLSelectElement;
        const btnSecondary = document.getElementById('btnSecondaryAction') as HTMLButtonElement;

        // ✅ LÓGICA DO BOTÃO VOLTAR / CANCELAR
        btnSecondary.addEventListener('click', () => {
            if (ehEdicao) {
                if (typeof (window as any).navegar === 'function') {
                    (window as any).navegar('detalhes', idEdicao);
                } else {
                    window.location.hash = `#detalhes?id=${idEdicao}`;
                }
            } else {
                form.reset();
            }
        });

        // ✅ LÓGICA DE CATEGORIAS (Navegação explícita)
        selectCat.addEventListener('change', () => {
            if (selectCat.value === 'GO_CATEGORIAS') {
                selectCat.value = ""; 
                if (typeof (window as any).navegar === 'function') {
                    (window as any).navegar('categorias');
                } else {
                    window.location.hash = '#categorias';
                    window.dispatchEvent(new HashChangeEvent('hashchange'));
                }
            }
        });

        // ✅ LÓGICA DE SALVAMENTO
        form.onsubmit = async (e) => {
            e.preventDefault();
            const btnSubmit = document.getElementById('btnSubmit') as HTMLButtonElement;
            btnSubmit.disabled = true;

            const dados = {
                nome: (document.getElementById('nome') as HTMLInputElement).value,
                frase_exibicao: (document.getElementById('frase_exibicao') as HTMLInputElement).value,
                data_nascimento: (document.getElementById('data_nascimento') as HTMLInputElement).value,
                telefone: (document.getElementById('telefone') as HTMLInputElement).value,
                categoria_id: selectCat.value
            };

            if (dados.categoria_id === 'GO_CATEGORIAS' || !dados.categoria_id) {
                alert("Selecione uma categoria válida.");
                btnSubmit.disabled = false;
                return;
            }

            try {
                if (ehEdicao && idEdicao) {
                    // MODO EDIÇÃO
                    await aniversarioService.atualizar(idEdicao, dados);
                    form.reset();
                    if (typeof (window as any).navegar === 'function') {
                        (window as any).navegar('detalhes', idEdicao);
                    } else {
                        window.location.hash = `#detalhes?id=${idEdicao}`;
                    }
                } else {
                    // MODO NOVO CADASTRO
                    await aniversarioService.adicionar(dados);
                    form.reset();
                    alert("Cadastrado com sucesso!");
                }
            } catch (err) {
                console.error(err);
                alert("Erro ao salvar os dados.");
            } finally {
                btnSubmit.disabled = false;
                createIcons({ icons });
            }
        };

        createIcons({ icons });
    } catch (error) {
        console.error(error);
        container.innerHTML = `<div class="error-msg">Erro ao carregar formulário.</div>`;
    }
}