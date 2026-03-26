import '../styles/dashboard.css';
import { aniversarioService } from '../services/aniversarioService';
import { gerarLinkWhatsapp } from '../utils/messages';
import { Aniversario } from '../types';

export async function montarDashboard(container: HTMLElement) {
    container.innerHTML = `<div class="loading">Convocando dados...</div>`;

    try {
        const hoje = new Date();
        const mesAtual = hoje.getMonth();
        const todos: Aniversario[] = await aniversarioService.listarTodos();
        
        // 1. Destaque do Dia
        const aniversariantesHoje = todos.filter((p: Aniversario) => {
            const d = new Date(p.data_nascimento + 'T00:00:00');
            return d.getDate() === hoje.getDate() && d.getMonth() === hoje.getMonth();
        });

        // 2. Próximos 7 dias com cálculo de contagem regressiva
        const proximos7Dias = todos.map(p => {
            const d = new Date(p.data_nascimento + 'T00:00:00');
            const niverEsteAno = new Date(hoje.getFullYear(), d.getMonth(), d.getDate());
            
            // Se o niver já passou este ano, calcula para o próximo (ajuste de segurança)
            if (niverEsteAno < hoje && (hoje.getDate() !== d.getDate() || hoje.getMonth() !== d.getMonth())) {
                niverEsteAno.setFullYear(hoje.getFullYear() + 1);
            }

            const diffTime = niverEsteAno.getTime() - hoje.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return { ...p, diffDays, dataObj: d };
        })
        .filter(p => p.diffDays > 0 && p.diffDays <= 7)
        .sort((a, b) => a.diffDays - b.diffDays);

        const primeiroDeHoje = aniversariantesHoje.length > 0 ? aniversariantesHoje[0] : null;

        container.innerHTML = `
            <div class="dash-container">
                <!-- CARD DESTAQUE (HERO) -->
                <section class="hero-card">
                    <div class="hero-content">
                        <h2>ANIVERSARIANTE DO DIA</h2>
                        ${primeiroDeHoje ? `
                            <div class="hero-avatar">🦁</div>
                            <div class="hero-nome">${primeiroDeHoje.nome.toUpperCase()}</div>
                            <a href="${gerarLinkWhatsapp(primeiroDeHoje.nome, primeiroDeHoje.telefone || '')}" 
                               target="_blank" class="btn-parabens">
                               <i data-lucide="send"></i> ENVIAR PARABÉNS
                            </a>
                        ` : `
                            <p class="hero-empty">Nenhum jogo festivo hoje.<br>Prepare a torcida para os próximos!</p>
                        `}
                    </div>
                    <div class="bola-fundo"></div>
                </section>

                <!-- RESUMO DO MÊS -->
                <div class="mini-stats">
                    <div class="stats-icon"><i data-lucide="trending-up"></i></div>
                    <div class="stats-text">
                        Total de aniversariantes em <strong>${hoje.toLocaleString('pt-BR', {month: 'long'})}</strong>: 
                        <span>${todos.filter(p => new Date(p.data_nascimento + 'T00:00:00').getMonth() === mesAtual).length}</span>
                    </div>
                </div>

                <!-- PRÓXIMAS CONVOCAÇÕES -->
                <section class="proximos-section">
                    <h3 class="section-title"><i data-lucide="calendar"></i> Próximas Convocações</h3>
                    
                    <div class="proximos-grid">
                        ${proximos7Dias.length > 0 ? proximos7Dias.map(p => `
                            <div class="card-atleta">
                                <div class="atleta-badge">
                                    <span class="mes">${p.dataObj.toLocaleString('pt-BR', { month: 'short' }).toUpperCase()}</span>
                                    <span class="dia">${p.dataObj.getDate()}</span>
                                </div>
                                <div class="atleta-info">
                                    <span class="nome">${p.nome}</span>
                                    <span class="countdown">Faltam ${p.diffDays} dias</span>
                                </div>
                                <a href="${gerarLinkWhatsapp(p.nome, p.telefone || '')}" target="_blank" class="btn-icon">
                                    <i data-lucide="message-circle"></i>
                                </a>
                            </div>
                        `).join('') : `
                            <div class="empty-state">Nenhuma comemoração nos próximos 7 dias.</div>
                        `}
                    </div>
                </section>
            </div>
        `;

        if ((window as any).lucide) (window as any).lucide.createIcons();

    } catch (error) {
        console.error('Erro no Dashboard:', error);
        container.innerHTML = `<div class="error-msg">Erro ao carregar o estádio.</div>`;
    }
}