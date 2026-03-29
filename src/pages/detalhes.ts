import '../styles/detalhes.css'; 
import { aniversarioService } from '../services/aniversarioService';
import { gerarLinkWhatsapp } from '../utils/messages';
import { Aniversario, Categoria } from '../types';

export async function montarDetalhes(container: HTMLElement, id?: string) {
    if (!id) return;

    container.innerHTML = `<div class="fec-loader-minimal">Carregando...</div>`;

    try {
        const [todos, categorias]: [Aniversario[], Categoria[]] = await Promise.all([
            aniversarioService.listarTodos(),
            aniversarioService.listarCategorias()
        ]);

        const pessoa = todos.find((p) => p.id === id);
        if (!pessoa) return;

        const dataNasc = new Date(pessoa.data_nascimento + 'T00:00:00');
        const hoje = new Date();
        let idade = hoje.getFullYear() - dataNasc.getFullYear();
        if (hoje < new Date(hoje.getFullYear(), dataNasc.getMonth(), dataNasc.getDate())) idade--;

        container.innerHTML = `
            <div class="detalhes-page-wrapper">
                <section class="section-hero-light">
                    <button class="btn-back-absolute" id="btn-voltar-list"><i data-lucide="arrow-left"></i></button>
                    <div class="profile-image-container">
                        <img src="${(pessoa as any).imagem_url || ''}" class="img-full-profile">
                    </div>

                    <div class="name-floating-card">
                        <div class="name-info">
                            <h1>${pessoa.apelido}</h1>
                            <span>${pessoa.categorias?.nome || 'Sem Grupo'}</span>
                        </div>
                        <button class="btn-more-options" id="btn-abrir-menu"><i data-lucide="more-vertical"></i></button>
                        
                        <div class="dropdown-options" id="dropdown-menu">
                            <button id="btn-editar-perfil"><i data-lucide="user-round-pen"></i> Editar Perfil</button>
                            <button id="btn-abrir-drawer"><i data-lucide="bookmark"></i> Mudar Grupo</button>
                            <button id="btn-ir-notificacoes"><i data-lucide="bell"></i> Notificações</button>
                            <button class="delete-opt" id="btn-excluir-integrante"><i data-lucide="trash-2"></i> Excluir</button>
                        </div>
                    </div>
                </section>

                <section class="section-details-white">
                    <div class="info-row">
                        <div class="info-block">
                            <label>Aniversário</label>
                            <p>${dataNasc.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}</p>
                        </div>
                        <div class="days-badge">${idade} ANOS</div>
                    </div>
                    <div class="info-block" style="margin-bottom: 20px;">
                        <label>Whatsapp</label>
                        <p>${pessoa.telefone || 'Não informado'}</p>
                    </div>
                    <label>Detalhes</label>
                    <div class="notes-content">${(pessoa as any).frase_exibicao || 'Sem observações.'}</div>
                    
                    <a href="${gerarLinkWhatsapp(pessoa.nome, pessoa.telefone || '')}" target="_blank" class="btn-whatsapp-modern">
                        <i data-lucide="message-circle"></i> ENVIAR MENSAGEM
                    </a>
                </section>
            </div>

            <div class="drawer-overlay-premium" id="drawer-categoria">
                <div class="drawer-content-premium">
                    <div class="drawer-handle"></div>
                    <div class="drawer-header-premium">
                        <h2>Grupos</h2>
                        <div class="drawer-header-actions">
                            <button class="btn-add-category-drawer" id="btn-nav-categorias">
                                <i data-lucide="plus"></i>
                            </button>
                        </div>
                    </div>
                    <div class="category-drawer-content">
                        <!-- Removida a opção Sem Grupo daqui -->
                        ${categorias.map(cat => `
                            <label class="category-item-radio">
                                <span>${cat.nome}</span>
                                <input type="radio" name="cat-option" value="${cat.id}" ${pessoa.categoria_id === cat.id ? 'checked' : ''} class="radio-save">
                            </label>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        const dropdown = document.getElementById('dropdown-menu');
        const drawer = document.getElementById('drawer-categoria');

        document.getElementById('btn-voltar-list')?.addEventListener('click', () => (window as any).navegar('list'));
        
        document.getElementById('btn-abrir-menu')?.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown?.classList.toggle('active');
        });
        document.addEventListener('click', () => dropdown?.classList.remove('active'));

        const fecharDrawer = () => drawer?.classList.remove('active');
        document.getElementById('btn-abrir-drawer')?.addEventListener('click', () => drawer?.classList.add('active'));
        drawer?.addEventListener('click', (e) => { if (e.target === drawer) fecharDrawer(); });

        //| Navegar para Notificações
        document.getElementById('btn-ir-notificacoes')?.addEventListener('click', () => (window as any).navegar('notificacoes'));

        document.getElementById('btn-nav-categorias')?.addEventListener('click', () => (window as any).navegar('categorias'));

        document.querySelectorAll('.radio-save').forEach(radio => {
            radio.addEventListener('change', async (e) => {
                const val = (e.target as HTMLInputElement).value;
                const novaCatId = val === "" ? undefined : val;

                // Fecha IMEDIATAMENTE
                fecharDrawer();

                await aniversarioService.atualizar(pessoa.id!, { categoria_id: novaCatId });
                
                // Recarrega a tela para atualizar o nome do grupo no card
                setTimeout(() => montarDetalhes(container, id), 300); 
            });
        });

        document.getElementById('btn-editar-perfil')?.addEventListener('click', () => (window as any).navegar('form', pessoa.id));
        document.getElementById('btn-excluir-integrante')?.addEventListener('click', async () => {
            if (confirm(`Deseja remover ${pessoa.nome}?`)) {
                await aniversarioService.excluir(pessoa.id!);
                (window as any).navegar('list');
            }
        });

        if ((window as any).lucide) (window as any).lucide.createIcons();

    } catch (error) {
        console.error("Erro:", error);
    }
}