import '../styles/detalhes.css'; 
import { aniversarioService } from '../services/aniversarioService';
import { gerarLinkWhatsapp } from '../utils/messages';
import { Aniversario } from '../types';

export async function montarDetalhes(container: HTMLElement, id?: string) {
    if (!id) {
        container.innerHTML = `<div class="fec-center-wrapper"><div class="error-msg-fec">ID do integrante não fornecido.</div></div>`;
        return;
    }

    container.innerHTML = `<div class="fec-center-wrapper"><div class="fec-loader-minimal">Buscando ficha técnica...</div></div>`;

    try {
        const todos: Aniversario[] = await aniversarioService.listarTodos();
        const pessoa = todos.find(p => p.id === id);

        if (!pessoa) {
            container.innerHTML = `<div class="fec-center-wrapper"><div class="error-msg-fec">Integrante não encontrado.</div></div>`;
            return;
        }

        const imagemPessoa = (pessoa as any).imagem_url;
        const dataNasc = new Date(pessoa.data_nascimento + 'T00:00:00');
        const hoje = new Date();
        
        // Cálculo de idade
        let idade = hoje.getFullYear() - dataNasc.getFullYear();
        const m = hoje.getMonth() - dataNasc.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < dataNasc.getDate())) {
            idade--;
        }

        // Removida a centralização 'fec-center-wrapper' e o card 'fec-profile-card'
        // para ocupar a tela toda.
        container.innerHTML = `
            <div class="detalhes-main-wrapper full-screen-detalhes">
                
                <div class="profile-floating-header header-full-screen">
                    <button class="btn-voltar-circle" onclick="window.navegar('list')" title="Voltar">
                        <i data-lucide="chevron-left"></i>
                    </button>
                    <button class="btn-edit-topo-circle" onclick="window.navegar('form', '${pessoa.id}')" title="Editar">
                        <i data-lucide="edit-3"></i>
                    </button>
                </div>

                <div class="profile-hero hero-full-screen">
                    <div class="fec-avatar-profile avatar-full-screen">
                        ${imagemPessoa 
                            ? `<img src="${imagemPessoa}" class="img-avatar-fec">` 
                            : `<i data-lucide="user" class="avatar-icon-placeholder"></i>`}
                    </div>
                    <h1 class="fec-perfil-nome nome-full-screen">${pessoa.nome}</h1>
                    <span class="fec-perfil-badge badge-full-screen">${pessoa.categorias?.nome || 'Sem Grupo'}</span>
                </div>

                <div class="info-inline-grid grid-full-screen">
                    <div class="info-inline-item">
                        <i data-lucide="cake"></i>
                        <p>${dataNasc.toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div class="info-inline-item">
                        <i data-lucide="phone"></i>
                        <p>${pessoa.telefone || 'Não informado'}</p>
                    </div>
                    <div class="info-inline-item">
                        <i data-lucide="bar-chart-3"></i>
                        <p>${idade} anos</p>
                    </div>
                </div>

                <div class="fec-perfil-notas notas-full-screen">
                    <label><i data-lucide="quote"></i> Frase / Notas</label>
                    <div class="fec-notas-box box-full-screen">
                        ${(pessoa as any).frase_exibicao || 'Nenhuma nota registrada...'}
                    </div>
                </div>

                <div class="acoes-perfil-footer footer-full-screen">
                    <a href="${gerarLinkWhatsapp(pessoa.nome, pessoa.telefone || '')}" 
                       target="_blank" class="fec-btn-whatsapp-full">
                        <i data-lucide="message-circle"></i> ENVIAR MENSAGEM
                    </a>
                    
                    <button class="btn-text-danger" id="btnExcluirFicha">
                        <i data-lucide="trash-2"></i> EXCLUIR DO ELENCO
                    </button>
                </div>
            </div>
        `;

        // Evento de Exclusão (Funcionalidade Original Mantida)
        document.getElementById('btnExcluirFicha')?.addEventListener('click', async () => {
            if (confirm(`Tem certeza que deseja remover ${pessoa.nome} permanentemente?`)) {
                await aniversarioService.excluir(pessoa.id!);
                (window as any).navegar('list');
            }
        });

        // Re-renderiza ícones (Padrão Original Mantido)
        if ((window as any).lucide) (window as any).lucide.createIcons();

    } catch (error) {
        console.error('Erro ao carregar detalhes:', error);
        container.innerHTML = `<div class="fec-center-wrapper"><div class="error-msg-fec">Falha ao carregar perfil.</div></div>`;
    }
}