import '../styles/detalhes.css'; 
import { aniversarioService } from '../services/aniversarioService';
import { gerarLinkWhatsapp } from '../utils/messages';
import { Aniversario } from '../types';

export async function montarDetalhes(container: HTMLElement, id?: string) {
    if (!id) {
        container.innerHTML = `<div class="fec-center-wrapper">ID não encontrado.</div>`;
        return;
    }

    container.innerHTML = `<div class="fec-center-wrapper"><div class="fec-loader-minimal">Aguarde...</div></div>`;

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
            <div class="detalhes-page-wrapper">
                
                <section class="section-hero-light">
                    <button class="btn-back-absolute" onclick="window.navegar('list')">
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
                            <span>${pessoa.categorias?.nome || 'Geral'}</span>
                        </div>
                        <button class="btn-more-options" id="btnMenuOpcoes">
                            <i data-lucide="more-vertical"></i>
                        </button>
                        
                        <div class="dropdown-options" id="dropdownMenu">
                            <button onclick="window.navegar('form', '${pessoa.id}')">
                                <i data-lucide="edit"></i> Editar Perfil
                            </button>
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
                                ${(pessoa as any).frase_exibicao || 'Sem observações adicionais para este integrante.'}
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
        `;

        // Logica Dropdown
        const btnMenu = document.getElementById('btnMenuOpcoes');
        const dropdown = document.getElementById('dropdownMenu');
        btnMenu?.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown?.classList.toggle('active');
        });
        document.addEventListener('click', () => dropdown?.classList.remove('active'));

        // Excluir
        document.getElementById('btnExcluirFicha')?.addEventListener('click', async () => {
            if (confirm(`Deseja realmente remover ${pessoa.nome}?`)) {
                await aniversarioService.excluir(pessoa.id!);
                (window as any).navegar('list');
            }
        });

        if ((window as any).lucide) (window as any).lucide.createIcons();

    } catch (error) {
        container.innerHTML = `<div class="fec-center-wrapper">Erro ao abrir detalhes.</div>`;
    }
}