import '../styles/detalhes.css'; 
import { aniversarioService } from '../services/aniversarioService';
import { gerarLinkWhatsapp } from '../utils/messages';
import { Aniversario } from '../types';

export async function montarDetalhes(container: HTMLElement, id?: string) {
    if (!id) {
        container.innerHTML = `<div class="fec-center-wrapper"><div class="error-msg-fec">ID não fornecido.</div></div>`;
        return;
    }

    container.innerHTML = `<div class="fec-center-wrapper"><div class="fec-loader-minimal">Carregando perfil...</div></div>`;

    try {
        const todos: Aniversario[] = await aniversarioService.listarTodos();
        const pessoa = todos.find(p => p.id === id);

        if (!pessoa) {
            container.innerHTML = `<div class="fec-center-wrapper"><div class="error-msg-fec">Não encontrado.</div></div>`;
            return;
        }

        const imagemPessoa = (pessoa as any).imagem_url;
        const dataNasc = new Date(pessoa.data_nascimento + 'T00:00:00');
        const hoje = new Date();
        
        let idade = hoje.getFullYear() - dataNasc.getFullYear();
        const m = hoje.getMonth() - dataNasc.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < dataNasc.getDate())) {
            idade--;
        }

        container.innerHTML = `
            <div class="detalhes-page-wrapper">
                
                <!-- Topo com Foto (Fundo Claro) -->
                <section class="section-hero-light">
                    <button class="btn-back-absolute" onclick="window.navegar('list')">
                        <i data-lucide="chevron-left"></i>
                    </button>

                    <div class="profile-image-container">
                        ${imagemPessoa 
                            ? `<img src="${imagemPessoa}" class="img-full-profile">` 
                            : `<div class="avatar-placeholder-big"><i data-lucide="user"></i></div>`}
                    </div>

                    <!-- O Card Flutuante do Nome -->
                    <div class="name-floating-card">
                        <div class="name-info">
                            <h1>${pessoa.nome}</h1>
                            <span>${pessoa.categorias?.nome || 'Sem grupo'}</span>
                        </div>
                        <button class="btn-more-options" id="btnMenuOpcoes">
                            <i data-lucide="more-vertical"></i>
                        </button>
                        
                        <!-- Menu Dropdown Escondido -->
                        <div class="dropdown-options" id="dropdownMenu">
                            <button onclick="window.navegar('form', '${pessoa.id}')">
                                <i data-lucide="edit-3"></i> Editar
                            </button>
                            <button class="delete-opt" id="btnExcluirFicha">
                                <i data-lucide="trash-2"></i> Excluir
                            </button>
                        </div>
                    </div>
                </section>

                <!-- Seção de Informações (Fundo Escuro) -->
                <section class="section-details-dark">
                    <div class="info-row">
                        <div class="info-block">
                            <label><i data-lucide="cake"></i> Aniversário</label>
                            <p>Nascido em ${dataNasc.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}</p>
                            <small>Idade: ${idade} anos</small>
                        </div>
                        <div class="days-badge">
                            <span>${idade} anos</span>
                        </div>
                    </div>

                    <div class="notes-section">
                        <label>Ideias de presentes e notas</label>
                        <div class="notes-content">
                            ${(pessoa as any).frase_exibicao || 'Escreva aqui suas ideias para presentes...'}
                        </div>
                    </div>

                    <div class="footer-actions">
                        <a href="${gerarLinkWhatsapp(pessoa.nome, pessoa.telefone || '')}" 
                           target="_blank" class="btn-whatsapp-modern">
                            <i data-lucide="message-circle"></i> ENVIAR MENSAGEM
                        </a>
                    </div>
                </section>
            </div>
        `;

        // Lógica do Dropdown
        const btnMenu = document.getElementById('btnMenuOpcoes');
        const dropdown = document.getElementById('dropdownMenu');
        btnMenu?.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown?.classList.toggle('active');
        });

        document.addEventListener('click', () => dropdown?.classList.remove('active'));

        // Evento de Exclusão
        document.getElementById('btnExcluirFicha')?.addEventListener('click', async () => {
            if (confirm(`Remover ${pessoa.nome}?`)) {
                await aniversarioService.excluir(pessoa.id!);
                (window as any).navegar('list');
            }
        });

        if ((window as any).lucide) (window as any).lucide.createIcons();

    } catch (error) {
        container.innerHTML = `<div class="fec-center-wrapper">Erro ao carregar.</div>`;
    }
}