import './categorias.css';
import { aniversarioService } from '../services/aniversarioService';
import { createIcons, icons } from 'lucide';

export async function montarCategorias(container: HTMLElement) {
    container.innerHTML = `<div class="loading">Carregando categorias...</div>`;

    try {
        const categorias = await aniversarioService.listarCategorias();

        container.innerHTML = `
            <div class="categorias-container">
                <div class="cat-header">
                    <h2>Categorias</h2>
                    <button class="btn-action-round confirm" id="btnNovaCat" style="width: auto; padding: 0 20px; height: 45px;">
                        <i data-lucide="plus"></i> <span>Nova</span>
                    </button>
                </div>

                <div class="cat-list">
                    ${categorias.map(cat => `
                        <div class="cat-item">
                            <div class="icon-card" style="background: ${cat.cor}20; border: none; width: 45px; height: 45px;">
                                <i data-lucide="${cat.icone || 'tag'}" style="color: ${cat.cor}"></i>
                            </div>
                            <div class="cat-info">
                                <span>${cat.nome}</span>
                            </div>
                            <div class="cat-actions">
                                <button class="btn-mini-action btn-edit" onclick="window.location.hash = '#cadastro-categoria?id=${cat.id}'">
                                    <i data-lucide="pencil"></i>
                                </button>
                                <button class="btn-mini-action btn-del" data-id="${cat.id}">
                                    <i data-lucide="trash-2"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <button class="btn-cancelar" onclick="window.location.hash = '#cadastro'" style="margin-top: 30px; width: 100%;">
                    Voltar para o Cadastro
                </button>
            </div>
        `;

        // Evento de Exclusão
        container.querySelectorAll('.btn-del').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = (btn as HTMLElement).dataset.id!;
                if (confirm("Excluir esta categoria?")) {
                    await aniversarioService.excluirCategoria(id);
                    montarCategorias(container);
                }
            });
        });

        document.getElementById('btnNovaCat')!.onclick = () => window.location.hash = '#cadastro-categoria';
        createIcons({ icons });

    } catch (e) {
        container.innerHTML = `Erro ao carregar.`;
    }
}