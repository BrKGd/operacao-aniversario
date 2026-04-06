import '../styles/detalhes.css';
import whatsappIcon from '../assets/whatsapp.png';
import { aniversarioService } from '../services/aniversarioService';
import { gerarLinkWhatsapp } from '../utils/messages';
import { Aniversario, Categoria } from '../types';
import { modalAlerta } from '../utils/modalAlertas';
import { createIcons, icons } from 'lucide';

export async function montarDetalhes(container: HTMLElement, id?: string) {
    if (!id) return;

    // 1. RENDERIZAÇÃO IMEDIATA DO SKELETON (MELHORA PERCEPÇÃO DE VELOCIDADE)
    // Só renderiza o skeleton se o container não estiver com o ID atual (evita flash)
    if (container.dataset.currentId !== id) {
        container.dataset.currentId = id;
        container.innerHTML = `
            <div class="detalhes-page-wrapper">
                <section class="section-hero-light skeleton-loading">
                    <button class="btn-back-absolute"><i data-lucide="arrow-left"></i></button>
                    <div class="profile-image-container skeleton"></div>
                    <div class="name-floating-card">
                        <div class="name-info">
                            <div class="skeleton-text" style="width: 150px; height: 24px; margin-bottom: 8px;"></div>
                            <div class="skeleton-text" style="width: 80px; height: 16px;"></div>
                        </div>
                    </div>
                </section>
                <section class="section-details-white">
                    <div class="info-row">
                        <div class="info-block"><div class="skeleton-text" style="width: 100px; height: 30px;"></div></div>
                        <div class="days-badge skeleton"></div>
                    </div>
                    <div class="info-block" style="margin-top:20px"><div class="skeleton-text" style="width: 60%; height: 20px;"></div></div>
                    <div class="notes-content skeleton" style="height: 100px; margin-top: 20px;"></div>
                </section>
            </div>
        `;
        createIcons({ icons });
    }

    try {
        // 2. BUSCA DE DADOS EM PARALELO
        const [todos, categorias]: [Aniversario[], Categoria[]] = await Promise.all([
            aniversarioService.listarTodos(),
            aniversarioService.listarCategorias()
        ]);

        const pessoa = todos.find((p) => p.id === id);
        if (!pessoa) {
            container.innerHTML = `<div class="error-msg">Integrante não encontrado.</div>`;
            return;
        }

        // Cálculos de data
        const dataNasc = new Date(pessoa.data_nascimento + 'T00:00:00');
        const hoje = new Date();
        let idade = hoje.getFullYear() - dataNasc.getFullYear();
        if (hoje < new Date(hoje.getFullYear(), dataNasc.getMonth(), dataNasc.getDate())) idade--;

        // 3. RENDERIZAÇÃO DO CONTEÚDO REAL
        container.innerHTML = `
            <div class="detalhes-page-wrapper">
                <section class="section-hero-light">
                    <button class="btn-back-absolute" id="btn-voltar-list"><i data-lucide="arrow-left"></i></button>
                    <div class="profile-image-container">
                        <img src="${(pessoa as any).imagem_url || ''}" class="img-full-profile" onerror="this.style.display='none'">
                    </div>

                    <div class="name-floating-card">
                        <div class="name-info">
                            <h1>${pessoa.apelido || pessoa.nome.split(' ')[0]}</h1>
                            <span id="categoria-label">${pessoa.categorias?.nome || 'Sem Grupo'}</span>
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
                        <img src="${whatsappIcon}" alt="WhatsApp" style="width: 30px; height: 30px;"> ENVIAR MENSAGEM
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
                        ${categorias.map(cat => `
                            <label class="category-item-radio">
                                <span>${cat.nome}</span>
                                <input type="radio" name="cat-option" value="${cat.id}" 
                                    ${pessoa.categoria_id === cat.id ? 'checked' : ''} 
                                    data-catnome="${cat.nome}" class="radio-save">
                            </label>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        // 4. LÓGICA E EVENTOS
        const inicializarIcones = () => createIcons({ icons });
        const dropdown = document.getElementById('dropdown-menu');
        const drawer = document.getElementById('drawer-categoria');

        // Navegação
        document.getElementById('btn-voltar-list')?.addEventListener('click', () => (window as any).navegar('list'));
        document.getElementById('btn-ir-notificacoes')?.addEventListener('click', () => (window as any).navegar('notificacoes'));
        document.getElementById('btn-nav-categorias')?.addEventListener('click', () => (window as any).navegar('categorias'));
        document.getElementById('btn-editar-perfil')?.addEventListener('click', () => (window as any).navegar('form', pessoa.id));

        // Controle Dropdown
        document.getElementById('btn-abrir-menu')?.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown?.classList.toggle('active');
        });
        document.addEventListener('click', () => dropdown?.classList.remove('active'));

        // Controle Drawer
        const fecharDrawer = () => drawer?.classList.remove('active');
        document.getElementById('btn-abrir-drawer')?.addEventListener('click', () => drawer?.classList.add('active'));
        drawer?.addEventListener('click', (e) => { if (e.target === drawer) fecharDrawer(); });

        // Troca de Categoria
        document.querySelectorAll('.radio-save').forEach(radio => {
            radio.addEventListener('change', async (e) => {
                const target = e.target as HTMLInputElement;
                const novaCatId = target.value;
                const novaCatNome = target.getAttribute('data-catnome');

                const label = document.getElementById('categoria-label');
                if (label && novaCatNome) label.innerText = novaCatNome;

                fecharDrawer();

                try {
                    await aniversarioService.atualizar(pessoa.id!, { categoria_id: novaCatId });
                    modalAlerta.show({ message: 'Grupo atualizado!', type: 'success', confirmText: 'OK' });
                } catch (error) {
                    modalAlerta.show({ title: 'Erro', message: 'Falha ao atualizar grupo.', type: 'error' });
                }
            });
        });

        // Excluir Integrante
        document.getElementById('btn-excluir-integrante')?.addEventListener('click', async () => {
            const confirmou = await modalAlerta.show({
                title: 'Excluir Integrante',
                message: `Deseja remover ${pessoa.nome}?`,
                type: 'confirm',
                confirmText: 'Sim, excluir',
                cancelText: 'Cancelar'
            });

            if (confirmou) {
                modalAlerta.showLoading('Removendo...');
                try {
                    await aniversarioService.excluir(pessoa.id!);
                    modalAlerta.close();
                    (window as any).navegar('list');
                } catch (error) {
                    modalAlerta.show({ title: 'Erro', message: 'Erro ao excluir registro.', type: 'error' });
                }
            }
        });

        inicializarIcones();

    } catch (error) {
        console.error("Erro ao carregar detalhes:", error);
        container.innerHTML = `<div class="error-msg">Não foi possível carregar os dados.</div>`;
    }
}