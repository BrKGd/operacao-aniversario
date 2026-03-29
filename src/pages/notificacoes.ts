import '../styles/notificacoes.css';
import { aniversarioService } from '../services/aniversarioService';
import { gerarLinkWhatsapp } from '../utils/messages';
import { Aniversario } from '../types';

// Estado local para gerenciar as telas e alertas
let telaAtual: 'principal' | 'antecedencia' = 'principal';
let alertasConfigurados = [{ id: '1', dias: 1, hora: '11:00', alvo: 'Todos os contatos' }];

export async function montarNotificacoes(container: HTMLElement) {
    
    const render = async () => {
        if (telaAtual === 'principal') {
            await renderPrincipal();
        } else {
            renderAntecedencia();
        }
    };

    // --- TELA 1: CONFIGURAÇÕES E PRÓXIMOS ALERTAS ---
    const renderPrincipal = async () => {
        container.innerHTML = `<div class="fec-loader-minimal">Carregando...</div>`;
        const todos = await aniversarioService.listarTodos();
        const hoje = new Date();
        hoje.setHours(0,0,0,0);

        const proximos = todos.filter(p => {
            const d = new Date(p.data_nascimento + 'T00:00:00');
            const niver = new Date(hoje.getFullYear(), d.getMonth(), d.getDate());
            if (niver < hoje) niver.setFullYear(hoje.getFullYear() + 1);
            const diff = Math.ceil((niver.getTime() - hoje.getTime()) / 86400000);
            return diff <= 7;
        });

        container.innerHTML = `
            <div class="notif-page-light">
                <header class="notif-header-simple">
                    <button class="btn-back-minimal" id="btn-voltar-app"><i data-lucide="chevron-left"></i></button>
                    <h1>Notificações</h1>
                </header>

                <div class="notif-section-label">CONFIGURAÇÕES</div>
                <section class="notif-settings-list">
                    <div class="settings-item">
                        <div class="settings-info"><span>Hora da Notificação</span><p>11:00</p></div>
                    </div>
                    <div class="settings-item clickable" id="ir-antecedencia">
                        <div class="settings-info">
                            <span>Notifique-me com antecedência</span>
                            <p>${alertasConfigurados.length} alerta(s) configurado(s)</p>
                        </div>
                        <i data-lucide="chevron-right" class="arrow-sutil"></i>
                    </div>
                    <div class="settings-item clickable" id="btn-sons">
                        <div class="settings-info"><span>Sons</span><p>Padrão do sistema</p></div>
                    </div>
                </section>

                <div class="notif-section-label">PRÓXIMOS ALERTAS</div>
                <section class="alertas-list">
                    ${proximos.map(p => `
                        <div class="alerta-item">
                            <div class="alerta-corpo">
                                <span class="alerta-nome">${p.nome}</span>
                                <p class="alerta-data">${p.data_nascimento.split('-').reverse().slice(0,2).join('/')}</p>
                            </div>
                            <a href="${gerarLinkWhatsapp(p.nome, p.telefone || '')}" target="_blank" class="alerta-btn">
                                <i data-lucide="message-circle"></i>
                            </a>
                        </div>
                    `).join('')}
                </section>
            </div>
        `;
        setupEvents();
    };

    // --- TELA 2: LISTA DE ANTECEDÊNCIA (IGUAL À FOTO) ---
    const renderAntecedencia = () => {
        container.innerHTML = `
            <div class="notif-page-light">
                <header class="notif-header-simple">
                    <button class="btn-back-minimal" id="voltar-principal"><i data-lucide="chevron-left"></i></button>
                    <h1>Notifique-me com antecedência</h1>
                </header>

                <section class="config-alertas-list">
                    ${alertasConfigurados.map(alerta => `
                        <div class="alerta-config-item">
                            <div class="alerta-config-info">
                                <span>${alerta.dias} dia${alerta.dias > 1 ? 's' : ''} antes às ${alerta.hora}</span>
                                <p>${alerta.alvo}</p>
                            </div>
                            <button class="btn-delete-notif" data-id="${alerta.id}"><i data-lucide="trash-2"></i></button>
                        </div>
                    `).join('')}
                    
                    <button class="btn-add-notif-row" id="abrir-modal-dias">
                        Adicionar notificação <i data-lucide="plus-circle"></i>
                    </button>
                </section>
            </div>

            <div class="modal-overlay" id="modal-dias">
                <div class="modal-box">
                    <h3>Defina quantos dias</h3>
                    <div class="picker-container">
                        <div class="picker-item opaco">30</div>
                        <div class="picker-item selected">1</div>
                        <div class="picker-item opaco">2</div>
                    </div>
                    <div class="modal-actions">
                        <button class="btn-modal-cancel" onclick="this.closest('.modal-overlay').classList.remove('active')">Cancelar</button>
                        <button class="btn-modal-ok" id="btn-ir-hora">OK</button>
                    </div>
                </div>
            </div>

            <div class="modal-overlay" id="modal-hora">
                <div class="modal-box time-picker">
                    <span class="time-label">HORA DA NOTIFICAÇÃO</span>
                    <div class="time-inputs-row">
                        <div class="time-field active"><input type="number" value="08"><label>Hora</label></div>
                        <span class="time-separator">:</span>
                        <div class="time-field"><input type="number" value="23"><label>Minuto</label></div>
                    </div>
                    <div class="modal-actions-time">
                        <i data-lucide="clock" class="icon-clock-modal"></i>
                        <div class="right-actions">
                            <button class="btn-modal-cancel" onclick="this.closest('.modal-overlay').classList.remove('active')">CANCELAR</button>
                            <button class="btn-modal-ok" id="btn-finalizar-notif">OK</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        setupEvents();
    };

    const setupEvents = () => {
        if ((window as any).lucide) (window as any).lucide.createIcons();

        // Navegação entre telas
        document.getElementById('ir-antecedencia')?.addEventListener('click', () => { telaAtual = 'antecedencia'; render(); });
        document.getElementById('voltar-principal')?.addEventListener('click', () => { telaAtual = 'principal'; render(); });
        document.getElementById('btn-voltar-app')?.addEventListener('click', () => (window as any).navegar('list'));

        // Lógica dos Modais
        document.getElementById('abrir-modal-dias')?.addEventListener('click', () => document.getElementById('modal-dias')?.classList.add('active'));
        
        document.getElementById('btn-ir-hora')?.addEventListener('click', () => {
            document.getElementById('modal-dias')?.classList.remove('active');
            document.getElementById('modal-hora')?.classList.add('active');
        });

        document.getElementById('btn-finalizar-notif')?.addEventListener('click', () => {
            alertasConfigurados.push({ id: Date.now().toString(), dias: 1, hora: '08:23', alvo: 'Todos os contatos' });
            document.getElementById('modal-hora')?.classList.remove('active');
            render();
        });

        // Excluir
        document.querySelectorAll('.btn-delete-notif').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = (e.currentTarget as HTMLElement).dataset.id;
                alertasConfigurados = alertasConfigurados.filter(a => a.id !== id);
                render();
            });
        });
    };

    await render();
}