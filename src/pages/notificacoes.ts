import '../styles/notificacoes.css'; // Ajuste o caminho conforme sua pasta de CSS
import { aniversarioService } from '../services/aniversarioService';
import { gerarLinkWhatsapp } from '../utils/messages';
import { Aniversario } from '../types';

export async function montarNotificacoes(container: HTMLElement) {
    container.innerHTML = `<div class="loading">Sincronizando alertas...</div>`;

    try {
        const hoje = new Date();
        const todos: Aniversario[] = await aniversarioService.listarTodos();

        // Filtramos quem faz aniversário hoje ou nos próximos 3 dias (Urgentíssimos)
        const alertas = todos.filter((p: Aniversario) => {
            const d = new Date(p.data_nascimento + 'T00:00:00');
            const dataNiverEsteAno = new Date(hoje.getFullYear(), d.getMonth(), d.getDate());
            const diffTime = dataNiverEsteAno.getTime() - hoje.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // Retorna quem é hoje (diffDays 0) ou nos próximos 3 dias
            return diffDays >= 0 && diffDays <= 3;
        }).sort((a: Aniversario, b: Aniversario) => {
            const da = new Date(a.data_nascimento + 'T00:00:00');
            const db = new Date(b.data_nascimento + 'T00:00:00');
            return da.getDate() - db.getDate();
        });

        container.innerHTML = `
            <div class="notificacoes-container">
                <div class="notif-header">
                    <h2><i data-lucide="bell"></i> Central de Alertas</h2>
                    <p>Não deixe nenhum integrante sem o parabéns oficial.</p>
                </div>

                <div class="notif-lista">
                    ${alertas.length > 0 ? alertas.map((p: Aniversario) => {
                        const d = new Date(p.data_nascimento + 'T00:00:00');
                        const ehHoje = d.getDate() === hoje.getDate() && d.getMonth() === hoje.getMonth();
                        
                        return `
                            <div class="card-notif ${ehHoje ? 'status-hoje' : ''}">
                                <div class="notif-icon">
                                    ${ehHoje ? '🎂' : '⏳'}
                                </div>
                                <div class="notif-content">
                                    <div class="notif-nome">${p.nome}</div>
                                    <div class="notif-desc">
                                        ${ehHoje ? '<strong>Faz aniversário hoje!</strong>' : `Aniversário em ${d.getDate()}/${d.getMonth() + 1}`}
                                    </div>
                                    <div class="notif-categoria-tag">${p.categorias?.nome || 'Geral'}</div>
                                </div>
                                <a href="${gerarLinkWhatsapp(p.nome, p.telefone || '')}" 
                                   target="_blank" class="btn-notif-action">
                                    <i data-lucide="send"></i>
                                </a>
                            </div>
                        `;
                    }).join('') : `
                        <div class="notif-vazia">
                            <i data-lucide="check-circle-2"></i>
                            <p>Tudo em dia! Nenhuma notificação urgente para os próximos 3 dias.</p>
                        </div>
                    `}
                </div>
            </div>
        `;

        if ((window as any).lucide) (window as any).lucide.createIcons();

    } catch (error) {
        console.error('Erro em Notificações:', error);
        container.innerHTML = `<div class="error-msg">Erro ao carregar notificações.</div>`;
    }
}