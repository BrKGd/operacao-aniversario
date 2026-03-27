import '../styles/detalhes.css'; 
import { aniversarioService } from '../services/aniversarioService';
import { gerarLinkWhatsapp } from '../utils/messages';
import { Aniversario } from '../types';

export async function montarDetalhes(container: HTMLElement, id?: string) {
    if (!id) {
        container.innerHTML = `<div class="fec-center-wrapper">ID não encontrado.</div>`;
        return;
    }

    container.innerHTML = `<div class="fec-center-wrapper">Carregando...</div>`;

    try {
        const todos: Aniversario[] = await aniversarioService.listarTodos();
        const pessoa = todos.find(p => p.id === id);

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
            <div class="fec-det-screen-wrapper">
                
                <section class="fec-det-hero-section">
                    <button class="fec-det-back-btn" onclick="window.navegar('list')">
                        <i data-lucide="chevron-left"></i>
                    </button>

                    <div class="fec-det-image-box">
                        ${imagemPessoa 
                            ? `<img src="${imagemPessoa}" class="fec-det-profile-img">` 
                            : `<div style="font-size: 80px; color: #cbd5e1"><i data-lucide="user"></i></div>`}
                    </div>

                    <div class="fec-det-name-card">
                        <div class="fec-det-name-group">
                            <h1>${pessoa.nome}</h1>
                            <span>${pessoa.categorias?.nome || 'Padrão'}</span>
                        </div>
                        <button class="fec-det-menu-btn" id="fec-det-btn-menu">
                            <i data-lucide="more-vertical"></i>
                        </button>
                        
                        <div class="fec-det-dropdown" id="fec-det-dropdown">
                            <button class="fec-det-dropdown-item" onclick="window.navegar('form', '${pessoa.id}')">
                                <i data-lucide="edit-3"></i> Editar Perfil
                            </button>
                            <button class="fec-det-dropdown-item is-danger" id="fec-det-btn-delete">
                                <i data-lucide="trash-2"></i> Remover Integrante
                            </button>
                        </div>
                    </div>
                </section>

                <section class="fec-det-data-section">
                    <div class="fec-det-content-container">
                        <div class="fec-det-info-tile">
                            <div class="fec-det-label-box">
                                <label><i data-lucide="cake"></i> Aniversário</label>
                                <p>${dataNasc.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}</p>
                            </div>
                            <div class="fec-det-age-badge">
                                <span>${idade} ANOS</span>
                            </div>
                        </div>

                        <div class="fec-det-info-tile">
                            <div class="fec-det-label-box">
                                <label><i data-lucide="phone"></i> Contato</label>
                                <p>${pessoa.telefone || 'Não informado'}</p>
                            </div>
                        </div>

                        <div class="fec-det-notes-area">
                            <label>IDEIAS DE PRESENTES E NOTAS</label>
                            <div class="fec-det-notes-paper">
                                ${(pessoa as any).frase_exibicao || 'Toque em editar para registrar gostos, tamanhos de roupa ou ideias de presente.'}
                            </div>
                        </div>

                        <div class="fec-det-footer">
                            <a href="${gerarLinkWhatsapp(pessoa.nome, pessoa.telefone || '')}" 
                               target="_blank" class="fec-det-whatsapp-btn">
                                <i data-lucide="message-circle"></i> ENVIAR MENSAGEM
                            </a>
                        </div>
                    </div>
                </section>
            </div>
        `;

        // Lógica do Menu Dropdown
        const menuBtn = document.getElementById('fec-det-btn-menu');
        const dropdown = document.getElementById('fec-det-dropdown');
        menuBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown?.classList.toggle('active');
        });
        document.addEventListener('click', () => dropdown?.classList.remove('active'));

        // Lógica de Exclusão
        document.getElementById('fec-det-btn-delete')?.addEventListener('click', async () => {
            if (confirm(`Remover permanentemente ${pessoa.nome}?`)) {
                await aniversarioService.excluir(pessoa.id!);
                (window as any).navegar('list');
            }
        });

        if ((window as any).lucide) (window as any).lucide.createIcons();

    } catch (error) {
        console.error(error);
        container.innerHTML = `<div class="fec-center-wrapper">Erro na conexão.</div>`;
    }
}