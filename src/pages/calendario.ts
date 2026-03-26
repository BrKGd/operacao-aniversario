import '../styles/calendario.css';
import { aniversarioService } from '../services/aniversarioService';
import { Aniversario } from '../types';

export async function montarCalendario(container: HTMLElement) {
    container.innerHTML = `<div class="loading">Organizando calendário...</div>`;

    try {
        const hoje = new Date();
        const todos: Aniversario[] = await aniversarioService.listarTodos();
        
        // Estado do mês visualizado (começa no atual)
        let mesVisualizado = hoje.getMonth();
        let anoVisualizado = hoje.getFullYear();

        const renderizarMes = () => {
            const primeiroDiaMes = new Date(anoVisualizado, mesVisualizado, 1).getDay();
            const diasNoMes = new Date(anoVisualizado, mesVisualizado + 1, 0).getDate();
            const nomeMes = new Date(anoVisualizado, mesVisualizado).toLocaleString('pt-BR', { month: 'long' });

            // Filtra aniversariantes do mês atual
            const niversMes = todos.filter(p => {
                const d = new Date(p.data_nascimento + 'T00:00:00');
                return d.getMonth() === mesVisualizado;
            });

            let diasHtml = '';

            // Espaços vazios antes do dia 1
            for (let i = 0; i < primeiroDiaMes; i++) {
                diasHtml += `<div class="dia-vazio"></div>`;
            }

            // Dias do mês
            for (let dia = 1; dia <= diasNoMes; dia++) {
                const temNiver = niversMes.filter(n => new Date(n.data_nascimento + 'T00:00:00').getDate() === dia);
                const ehHoje = dia === hoje.getDate() && mesVisualizado === hoje.getMonth() && anoVisualizado === hoje.getFullYear();

                diasHtml += `
                    <div class="dia-card ${ehHoje ? 'hoje' : ''} ${temNiver.length > 0 ? 'tem-evento' : ''}">
                        <span class="num-dia">${dia}</span>
                        <div class="eventos-dia">
                            ${temNiver.map(n => `<div class="ponto-niver" title="${n.nome}"></div>`).join('')}
                        </div>
                    </div>
                `;
            }

            container.innerHTML = `
                <div class="calendario-container">
                    <div class="cal-header">
                        <button id="prevMes" class="btn-cal"><i data-lucide="chevron-left"></i></button>
                        <h2 class="mes-titulo">${nomeMes.toUpperCase()} ${anoVisualizado}</h2>
                        <button id="nextMes" class="btn-cal"><i data-lucide="chevron-right"></i></button>
                    </div>

                    <div class="dias-semana">
                        <span>DOM</span><span>SEG</span><span>TER</span><span>QUA</span><span>QUI</span><span>SEX</span><span>SÁB</span>
                    </div>

                    <div class="grade-dias">
                        ${diasHtml}
                    </div>

                    <div class="legenda-lista">
                        <h3>Aniversariantes de ${nomeMes}</h3>
                        ${niversMes.length > 0 ? niversMes.sort((a,b) => 
                            new Date(a.data_nascimento + 'T00:00:00').getDate() - new Date(b.data_nascimento + 'T00:00:00').getDate()
                        ).map(n => `
                            <div class="item-legenda" onclick="window.navegar('detalhes', '${n.id}')">
                                <strong>${new Date(n.data_nascimento + 'T00:00:00').getDate()}</strong>
                                <span>${n.nome}</span>
                                <i data-lucide="chevron-right"></i>
                            </div>
                        `).join('') : '<p>Ninguém faz aniversário este mês.</p>'}
                    </div>
                </div>
            `;

            // Reatribuir eventos dos botões
            document.getElementById('prevMes')?.addEventListener('click', () => {
                mesVisualizado--;
                if (mesVisualizado < 0) { mesVisualizado = 11; anoVisualizado--; }
                renderizarMes();
            });

            document.getElementById('nextMes')?.addEventListener('click', () => {
                mesVisualizado++;
                if (mesVisualizado > 11) { mesVisualizado = 0; anoVisualizado++; }
                renderizarMes();
            });

            if ((window as any).lucide) (window as any).lucide.createIcons();
        };

        renderizarMes();

    } catch (error) {
        container.innerHTML = `<div class="error-msg">Erro ao carregar calendário.</div>`;
    }
}