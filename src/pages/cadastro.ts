import '../styles/cadastro.css';
import { aniversarioService } from '../services/aniversarioService';
import { Aniversario, Categoria } from '../types';
import { createIcons, icons } from 'lucide'; // ✅ Importação corrigida para 'lucide'

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
                // Se for edição, navega explicitamente via window.navegar (ou hash)
                if (window.hasOwnProperty('navegar')) {
                    (window as any).navegar('detalhes', idEdicao);
                } else {
                    window.location.hash = `#detalhes?id=${idEdicao}`;
                }
            } else {
                form.reset();
            }
        });

        // Lógica de categorias
        selectCat.addEventListener('change', () => {
            if (selectCat.value === 'GO_CATEGORIAS') {
                // 1. Voltamos o select para o estado inicial (para não ficar com o texto de erro)
                selectCat.value = ""; 

                // 2. Chamamos a navegação global definida no main.ts
                if (typeof (window as any).navegar === 'function') {
                    (window as any).navegar('categorias');
                } else {
                    // Plano B: Força o hash e dispara o evento manualmente se o roteador falhar
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
                data_nascimento: (document.getElementById('data_nascimento') as HTMLInputElement).value,
                telefone: (document.getElementById('telefone') as HTMLInputElement).value,
                categoria_id: selectCat.value
            };

            if (dados.categoria_id === 'GO_CATEGORIAS') return (btnSubmit.disabled = false);

            try {
                if (ehEdicao && idEdicao) {
                    // ATUALIZAÇÃO
                    await aniversarioService.atualizar(idEdicao, dados);
                    form.reset();
                    // ✅ Navegação forçada após salvar na edição
                    if (window.hasOwnProperty('navegar')) {
                        (window as any).navegar('detalhes', idEdicao);
                    } else {
                        window.location.hash = `#detalhes?id=${idEdicao}`;
                    }
                } else {
                    // NOVO CADASTRO
                    await aniversarioService.adicionar(dados);
                    form.reset();
                    alert("Cadastrado com sucesso!");
                }
            } catch (err) {
                alert("Erro na operação.");
            } finally {
                btnSubmit.disabled = false;
                createIcons({ icons });
            }
        };

        createIcons({ icons });
    } catch (error) {
        container.innerHTML = `Erro ao carregar formulário.`;
    }
}