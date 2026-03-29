import '../styles/calendario.css';
import { aniversarioService } from '../services/aniversarioService';
import { Aniversario } from '../types';
import { 
    createIcons, 
    ChevronLeft, 
    ChevronRight, 
    Sparkles, 
    LogOut, 
    LayoutGrid, 
    Contact2, 
    Plus, 
    CalendarHeart, 
    Settings2,
    MessageCircle
} from 'lucide';

export async function montarCalendario(container: HTMLElement) {
    container.innerHTML = `<div class="fec-loader-minimal">Carregando calendário...</div>`;

    try {
        const hoje = new Date();
        const todos: Aniversario[] = await aniversarioService.listarTodos();
        
        let mesVisualizado = hoje.getMonth();
        let anoVisualizado = hoje.getFullYear();
        let diaSelecionado: number | null = null;

        const calcularIdadeVindoura = (dataNasc: string) => {
            const nasc = new Date(dataNasc + 'T00:00:00');
            return anoVisualizado - nasc.getFullYear();
        };

        const renderizarMes = () => {
            const primeiroDiaMes = new Date(anoVisualizado, mesVisualizado, 1).getDay();
            const diasNoMes = new Date(anoVisualizado, mesVisualizado + 1, 0).getDate();
            const nomeMes = new Date(anoVisualizado, mesVisualizado).toLocaleString('pt-BR', { month: 'long' });

            const niversMes = todos.filter(p => {
                const d = new Date(p.data_nascimento + 'T00:00:00');
                return d.getMonth() === mesVisualizado;
            });

            let diasHtml = '';

            for (let i = 0; i < primeiroDiaMes; i++) {
                diasHtml += `<div class="dia-vazio"></div>`;
            }

            for (let dia = 1; dia <= diasNoMes; dia++) {
                const niversDoDia = niversMes.filter(n => new Date(n.data_nascimento + 'T00:00:00').getDate() === dia);
                const ehHoje = dia === hoje.getDate() && mesVisualizado === hoje.getMonth() && anoVisualizado === hoje.getFullYear();
                
                // Usando UI-Avatars para suprir a falta do campo 'foto' na interface
                const getAvatarUrl = (nome: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(nome)}&background=6366f1&color=fff&bold=true`;

                diasHtml += `
                    <div class="dia-card ${ehHoje ? 'hoje' : ''} ${niversDoDia.length > 0 ? 'tem-evento' : ''} ${dia === diaSelecionado ? 'selecionado' : ''}" 
                         data-dia="${dia}">
                        ${ehHoje ? '<span class="label-hoje">HOJE</span>' : ''}
                        <span class="num-dia">${dia}</span>
                        <div class="container-avatares-dia">
                            ${niversDoDia.slice(0, 2).map(n => `
                                <img src="${getAvatarUrl(n.apelido || n.nome)}" class="avatar-mini">
                            `).join('')}
                            ${niversDoDia.length > 2 ? `<div class="badge-mais">+${niversDoDia.length - 2}</div>` : ''}
                        </div>
                    </div>
                `;
            }

            const niversParaExibir = diaSelecionado 
                ? niversMes.filter(n => new Date(n.data_nascimento + 'T00:00:00').getDate() === diaSelecionado)
                : niversMes.sort((a,b) => new Date(a.data_nascimento + 'T00:00:00').getDate() - new Date(b.data_nascimento + 'T00:00:00').getDate());

            container.innerHTML = `
                <div class="calendario-container">
                    <header class="cal-header">
                        <button id="prevMes" class="btn-cal"><i data-lucide="chevron-left"></i></button>
                        <h2>${nomeMes} ${anoVisualizado}</h2>
                        <button id="nextMes" class="btn-cal"><i data-lucide="chevron-right"></i></button>
                    </header>

                    <div class="dias-semana">
                        <span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span>
                    </div>

                    <div class="grade-dias">${diasHtml}</div>

                    <div class="legenda-lista">
                        <div class="secao-titulo">
                            <span>${diaSelecionado ? `Dia ${diaSelecionado}` : `Em ${nomeMes}`}</span>
                            ${diaSelecionado ? `<span id="limpar-filtro" style="cursor:pointer; color:#6366f1; font-size: 0.8rem; font-weight: 600;">Ver todos</span>` : ''}
                        </div>
                        <div class="lista-contatos-cal">
                            ${niversParaExibir.length > 0 ? niversParaExibir.map(n => `
                                <div class="item-legenda" onclick="window.navegar('detalhes', '${n.id}')">
                                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(n.nome)}&background=random" class="foto-lista">
                                    <div class="info-niver">
                                        <strong>${n.nome}</strong>
                                        <span>${calcularIdadeVindoura(n.data_nascimento)} anos • Dia ${new Date(n.data_nascimento + 'T00:00:00').getDate()}</span>
                                    </div>
                                    <button class="btn-zap-cal" onclick="event.stopPropagation(); window.open('https://wa.me/${n.telefone?.replace(/\D/g, '')}')">
                                        <i data-lucide="message-circle" style="width:20px;"></i>
                                    </button>
                                </div>
                            `).join('') : `<p style="text-align:center; color:#94a3b8; padding:30px; font-size:0.9rem;">Nenhum aniversariante encontrado.</p>`}
                        </div>
                    </div>
                </div>
            `;

            setupEvents();
        };

        const setupEvents = () => {
            document.getElementById('prevMes')?.addEventListener('click', () => {
                mesVisualizado--;
                if (mesVisualizado < 0) { mesVisualizado = 11; anoVisualizado--; }
                diaSelecionado = null;
                renderizarMes();
            });

            document.getElementById('nextMes')?.addEventListener('click', () => {
                mesVisualizado++;
                if (mesVisualizado > 11) { mesVisualizado = 0; anoVisualizado++; }
                diaSelecionado = null;
                renderizarMes();
            });

            document.querySelectorAll('.dia-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    const dia = (e.currentTarget as HTMLElement).dataset.dia;
                    if (dia) {
                        diaSelecionado = parseInt(dia);
                        renderizarMes();
                    }
                });
            });

            document.getElementById('limpar-filtro')?.addEventListener('click', () => {
                diaSelecionado = null;
                renderizarMes();
            });

            createIcons({ 
                icons: { 
                    ChevronLeft, ChevronRight, Sparkles, LogOut, 
                    LayoutGrid, Contact2, Plus, CalendarHeart, 
                    Settings2, MessageCircle 
                } 
            });
        };

        renderizarMes();

    } catch (error) {
        container.innerHTML = `<div class="error-msg">Erro ao carregar calendário.</div>`;
    }
}