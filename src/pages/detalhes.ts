import '../styles/detalhes.css'; 
import { aniversarioService } from '../services/aniversarioService';
import { gerarLinkWhatsapp } from '../utils/messages';
import { Aniversario } from '../types';

export async function montarDetalhes(container: HTMLElement, id?: string) {
    if (!id) {
        container.innerHTML = `<div class="error-msg">ID do integrante não fornecido.</div>`;
        return;
    }

    container.innerHTML = `<div class="loading">Buscando ficha técnica...</div>`;

    try {
        const todos: Aniversario[] = await aniversarioService.listarTodos();
        const pessoa = todos.find(p => p.id === id);

        if (!pessoa) {
            container.innerHTML = `<div class="error-msg">Integrante não encontrado.</div>`;
            return;
        }

        const dataNasc = new Date(pessoa.data_nascimento + 'T00:00:00');
        const hoje = new Date();
        
        // Cálculo de idade
        let idade = hoje.getFullYear() - dataNasc.getFullYear();
        const m = hoje.getMonth() - dataNasc.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < dataNasc.getDate())) {
            idade--;
        }

        container.innerHTML = `
            <div class="detalhes-container">
                <div class="detalhes-header">
                    <button class="btn-voltar" onclick="window.navegar('list')">
                        <i data-lucide="chevron-left"></i> Voltar
                    </button>
                    <div class="acoes-topo">
                        <button class="btn-edit-topo" onclick="window.navegar('form', '${pessoa.id}')">
                            <i data-lucide="edit-3"></i>
                        </button>
                    </div>
                </div>

                <div class="perfil-card">
                    <div class="perfil-avatar">🦁</div>
                    <h1 class="perfil-nome">${pessoa.nome.toUpperCase()}</h1>
                    <span class="perfil-badge">${pessoa.categoria || 'Geral'}</span>
                </div>

                <div class="info-grid">
                    <div class="info-item">
                        <label>Data de Nascimento</label>
                        <p>${dataNasc.toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div class="info-item">
                        <label>Idade Atual</label>
                        <p>${idade} anos</p>
                    </div>
                    <div class="info-item">
                        <label>WhatsApp</label>
                        <p>${pessoa.telefone || 'Não informado'}</p>
                    </div>
                </div>

                <div class="acoes-footer">
                    <a href="${gerarLinkWhatsapp(pessoa.nome, pessoa.telefone || '')}" 
                       target="_blank" class="btn-whatsapp-full">
                        <i data-lucide="message-circle"></i> ENVIAR MENSAGEM
                    </a>
                    
                    <button class="btn-excluir-danger" id="btnExcluirFicha">
                        <i data-lucide="trash-2"></i> EXCLUIR DO ELENCO
                    </button>
                </div>
            </div>
        `;

        // Evento de Exclusão
        document.getElementById('btnExcluirFicha')?.addEventListener('click', async () => {
            if (confirm(`Tem certeza que deseja remover ${pessoa.nome} permanentemente?`)) {
                await aniversarioService.excluir(pessoa.id!);
                (window as any).navegar('list');
            }
        });

        if ((window as any).lucide) (window as any).lucide.createIcons();

    } catch (error) {
        console.error('Erro ao carregar detalhes:', error);
        container.innerHTML = `<div class="error-msg">Falha ao carregar perfil.</div>`;
    }
}