import '../styles/detalhes.css'; 
import { aniversarioService } from '../services/aniversarioService';
import { gerarLinkWhatsapp } from '../utils/messages';
import { Aniversario, Categoria } from '../types';

export async function montarDetalhes(container: HTMLElement, id?: string) {
    if (!id) {
        container.innerHTML = `<div class="fec-center-wrapper">ID não encontrado.</div>`;
        return;
    }

    container.innerHTML = `<div class="fec-center-wrapper"><div class="fec-loader-minimal">Aguarde...</div></div>`;

    try {
        const [todos, categorias]: [Aniversario[], Categoria[]] = await Promise.all([
            aniversarioService.listarTodos(),
            aniversarioService.listarCategorias()
        ]);

        const pessoa = todos.find((p: Aniversario) => p.id === id);

        if (!pessoa) {
            container.innerHTML = `<div class="fec-center-wrapper">Integrante não localizado.</div>`;
            return;
        }

        const imagemPessoa = (pessoa as any).imagem_url;
        const dataNasc = new Date(pessoa.data_nascimento + 'T00:00:00');
        const hoje = new Date();
        
        let idade = hoje.getFullYear() - dataNasc.getFullYear();
        if (hoje.getMonth() < dataNasc.getMonth() || (hoje.getMonth() === dataNasc.getMonth() && hoje.getDate() < dataNasc.getDate())) {
            idade--;
        }

        container.innerHTML = `
            <div class="detalhes-page-wrapper">
                <section class="section-hero-light">
                    <button class="btn-back-absolute" id="btn-voltar-list">
                        <i data-lucide="arrow-left"></i>
                    </button>

                    <div class="profile-image-container">
                        ${imagemPessoa 
                            ? `<img src="${imagemPessoa}" class="img-full-profile">` 
                            : `<div style="font-size: 60px; color: #cbd5e1"><i data-lucide="user"></i></div>`}
                    </div>

                    <div class="name-floating-card">
                        <div class="name-info">
                            <h1>${pessoa.nome}</h1>
                            <span id="label-categoria-topo">${pessoa.categorias?.nome || 'Geral'}</span>
                        </div>
                        <button class="btn-more-options" id="btnMenuOpcoes">
                            <i data-lucide="more-vertical"></i>
                        </button>
                        
                        <div class="dropdown-options" id="dropdownMenu">
                            <button id="btn-editar-perfil">
                                <i data-lucide="edit"></i> Editar Perfil
                            </button>
                            <button id="btn-abrir-drawer-cat">
                                <i data-lucide="layers"></i> Mudar Grupo
                            </button>
                            <button id="btn-config-notificacoes">
                                <i data-lucide="bell"></i> Notificações
                            </button>
                            <hr style="border: 0; border-top: 1px solid #eee; margin: 4px 0;">
                            <button class="delete-opt" id="btnExcluirFicha">
                                <i data-lucide="trash-2"></i> Remover Integrante
                            </button>
                        </div>
                    </div>
                </section>

                <section class="section-details-white">
                    <div class="content-max-width">
                        <div class="info-row">
                            <div class="info-block">
                                <label><i data-lucide="calendar"></i> ANIVERSÁRIO</label>
                                <p>${dataNasc.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}</p>
                            </div>
                            <div class="days-badge">
                                <span>${idade} ANOS</span>
                            </div>
                        </div>

                        <div class="info-row">
                            <div class="info-block">
                                <label><i data-lucide="phone"></i> CONTATO</label>
                                <p>${pessoa.telefone || 'Não cadastrado'}</p>
                            </div>
                        </div>

                        <div class="notes-section">
                            <label>NOTAS E OBSERVAÇÕES</label>
                            <div class="notes-content">
                                ${(pessoa as any).frase_exibicao || 'Sem observações adicionais.'}
                            </div>
                        </div>

                        <div class="footer-actions">
                            <a href="${gerarLinkWhatsapp(pessoa.nome, pessoa.telefone || '')}" 
                               target="_blank" class="btn-whatsapp-modern">
                                <i data-lucide="message-circle"></i> ENVIAR MENSAGEM
                            </a>
                        </div>
                    </div>
                </section>
            </div>

            <!-- Drawer de Categorias com Auto-Save -->
            <div class="drawer-overlay-premium" id="category-drawer" style="display: none;">
                <div class="drawer-content-premium">
                    <div class="drawer-header-premium">
                        <h2 class="drawer-title-premium">Selecionar Grupo</h2>
                        <button class="close-btn-drawer" id="close-category-drawer">
                            <i data-lucide="x"></i>
                        </button>
                    </div>

                    <div class="category-drawer-content">
                        <button class="new-category-btn" id="btn-nova-categoria">
                            <i data-lucide="plus"></i> Criar Nova Categoria
                        </button>

                        <div class="category-list-scroll">
                            ${categorias.map((cat: Categoria) => `
                                <label class="category-item-radio">
                                    <span class="category-name">${cat.nome}</span>
                                    <input type="radio" name="cat-selection" value="${cat.id}" 
                                        ${pessoa.categoria_id === cat.id ? 'checked' : ''} 
                                        class="auto-save-radio">
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    <div class="drawer-footer-premium">
                        <p style="font-size: 12px; color: #64748b; text-align: center;">A alteração é salva automaticamente ao selecionar.</p>
                    </div>
                </div>
            </div>
        `;

        // --- ELEMENTOS E EVENTOS ---
        const dropdown = document.getElementById('dropdownMenu');
        const drawer = document.getElementById('category-drawer');

        // Navegação básica
        document.getElementById('btn-voltar-list')?.addEventListener('click', () => (window as any).navegar('list'));
        document.getElementById('btn-editar-perfil')?.addEventListener('click', () => (window as any).navegar('form', pessoa.id));
        document.getElementById('btn-nova-categoria')?.addEventListener('click', () => (window as any).navegar('categorias'));
        document.getElementById('btn-config-notificacoes')?.addEventListener('click', () => (window as any).navegar('notificacoes'));

        // Menu Dropdown
        document.getElementById('btnMenuOpcoes')?.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown?.classList.toggle('active');
        });
        document.addEventListener('click', () => dropdown?.classList.remove('active'));

        // Drawer
        document.getElementById('btn-abrir-drawer-cat')?.addEventListener('click', () => {
            if (drawer) drawer.style.display = 'flex';
            dropdown?.classList.remove('active');
        });
        document.getElementById('close-category-drawer')?.addEventListener('click', () => {
            if (drawer) drawer.style.display = 'none';
        });

        // Lógica de AUTO-SAVE (Sem botão salvar)
        const radios = document.querySelectorAll('.auto-save-radio');
        radios.forEach(radio => {
            radio.addEventListener('change', async (e) => {
                const target = e.target as HTMLInputElement;
                const novaCatId = target.value;

                if (novaCatId !== pessoa.categoria_id) {
                    try {
                        // Feedback visual simples: escurecer a lista enquanto salva
                        const listScroll = document.querySelector('.category-list-scroll');
                        if (listScroll) (listScroll as HTMLElement).style.opacity = '0.5';

                        await aniversarioService.atualizar(pessoa.id!, {
                            categoria_id: novaCatId
                        });

                        if (drawer) drawer.style.display = 'none';
                        montarDetalhes(container, id); // Recarrega a UI
                    } catch (err) {
                        alert('Erro ao atualizar categoria automaticamente.');
                        console.error(err);
                    }
                }
            });
        });

        // Excluir
        document.getElementById('btnExcluirFicha')?.addEventListener('click', async () => {
            if (confirm(`Deseja realmente remover ${pessoa.nome}?`)) {
                await aniversarioService.excluir(pessoa.id!);
                (window as any).navegar('list');
            }
        });

        if ((window as any).lucide) (window as any).lucide.createIcons();

    } catch (error) {
        console.error(error);
        container.innerHTML = `<div class="fec-center-wrapper">Erro ao carregar detalhes.</div>`;
    }
}