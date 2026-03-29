import '../styles/notificacoes.css';
import { aniversarioService } from '../services/aniversarioService';
import { gerarLinkWhatsapp } from '../utils/messages';
import { Aniversario } from '../types';

export async function montarNotificacoes(container: HTMLElement) {
    container.innerHTML = `<div class="loading">Sincronizando alertas...</div>`;

    try {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const todos: Aniversario[] = await aniversarioService.listarTodos();

        // Lógica de filtragem para 7 dias, 1 dia e No dia
        const alertas = todos.filter((p: Aniversario) => {
            const d = new Date(p.data_nascimento + 'T00:00:00');
            const dataNiverEsteAno = new Date(hoje.getFullYear(), d.getMonth(), d.getDate());
            
            // Ajuste para viradas de ano
            if (dataNiverEsteAno < hoje) dataNiverEsteAno.setFullYear(hoje.getFullYear() + 1);

            const diffTime = dataNiverEsteAno.getTime() - hoje.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // Retorna quem está nos intervalos solicitados
            return diffDays === 0 || diffDays === 1 || diffDays === 7;
        }).sort((a, b) => {
            const da = new Date(a.data_nascimento + 'T00:00:00');
            const db = new Date(b.data_nascimento + 'T00:00:00');
            return da.getMonth() - db.getMonth() || da.getDate() - db.getDate();
        });

        container.innerHTML = `
            <div class="notificacoes-container">
                <div class="notif-header">
                    <button class="btn-back-minimal" onclick="window.navegar('list')">
                        <i data-lucide="arrow-left"></i>
                    </button>
                    <h2>Configurações de Alerta</h2>
                </div>

                <!-- Seção de Configurações -->
                <section class="notif-settings-card">
                    <div class="settings-row">
                        <div>
                            <span class="settings-label">Notificações Ativas</span>
                            <p class="settings-sub">Receber alertas no celular</p>
                        </div>
                        <label class="switch">
                            <input type="checkbox" checked id="switch-notif">
                            <span class="slider round"></span>
                        </label>
                    </div>

                    <div class="settings-row">
                        <div>
                            <span class="settings-label">Horário do Alerta</span>
                            <p class="settings-sub">Momento do disparo</p>
                        </div>
                        <input type="time" class="time-input" value="09:00">
                    </div>

                    <div class="settings-group-checks">
                        <label class="check-item">
                            <input type="checkbox" checked> 7 dias antes (Planejamento)
                        </label>
                        <label class="check-item">
                            <input type="checkbox" checked> 1 dia antes
                        </label>
                        <label class="check-item">
                            <input type="checkbox" checked> No dia do evento
                        </label>
                    </div>
                </section>

                <div class="notif-section-title">Próximos Alertas</div>

                <div class="notif-lista">
                    ${alertas.length > 0 ? alertas.map((p: Aniversario) => {
                        const d = new Date(p.data_nascimento + 'T00:00:00');
                        const niverAno = new Date(hoje.getFullYear(), d.getMonth(), d.getDate());
                        const diff = Math.ceil((niverAno.getTime() - hoje.getTime()) / (86400000));
                        
                        let label = `${diff} dias`;
                        let classe = '';
                        
                        if (diff === 0) { label = 'HOJE'; classe = 'status-hoje'; }
                        else if (diff === 1) { label = 'AMANHÃ'; classe = 'status-amanha'; }
                        else { label = 'EM 7 DIAS'; classe = 'status-planejamento'; }

                        return `
                            <div class="card-notif ${classe}">
                                <div class="notif-badge-time">${label}</div>
                                <div class="notif-content">
                                    <div class="notif-nome">${p.nome}</div>
                                    <div class="notif-desc">${d.getDate()}/${d.getMonth() + 1} • ${p.categorias?.nome || 'Geral'}</div>
                                </div>
                                <a href="${gerarLinkWhatsapp(p.nome, p.telefone || '')}" target="_blank" class="btn-notif-whatsapp">
                                    <i data-lucide="message-circle"></i>
                                </a>
                            </div>
                        `;
                    }).join('') : `
                        <div class="notif-vazia">
                            <p>Nenhum alerta para os períodos configurados.</p>
                        </div>
                    `}
                </div>
            </div>
        `;

        if ((window as any).lucide) (window as any).lucide.createIcons();

    } catch (error) {
        console.error('Erro:', error);
    }
}