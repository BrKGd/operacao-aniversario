import '../styles/notificacoes.css';
import { aniversarioService } from '../services/aniversarioService';
import { gerarLinkWhatsapp } from '../utils/messages';
import { 
    createIcons, 
    ChevronLeft, 
    ChevronRight, 
    MessageCircle, 
    Trash2, 
    PlusCircle, 
    Clock,
    Plus 
} from 'lucide';

let telaAtual: 'principal' | 'antecedencia' = 'principal';
let alertasConfigurados: any[] = [];
let categoriasDisponiveis: any[] = [];

export async function montarNotificacoes(container: HTMLElement) {
    
    // Função para buscar dados do banco sem travar a tela
    const atualizarDadosEmBackground = async () => {
        const [alertas, categorias] = await Promise.all([
            aniversarioService.listarNotificacoes(),
            aniversarioService.listarCategorias()
        ]);
        alertasConfigurados = alertas;
        categoriasDisponiveis = categorias;
    };

    const executarLucide = () => {
        createIcons({
            icons: { ChevronLeft, ChevronRight, MessageCircle, Trash2, PlusCircle, Clock, Plus },
            nameAttr: 'data-lucide',
            root: container 
        });
    };

    const render = async () => {
        if (telaAtual === 'principal') {
            await renderPrincipal();
        } else {
            renderAntecedencia();
        }
        executarLucide();
    };

    // --- TELA 1: PRINCIPAL ---
    const renderPrincipal = async () => {
        // Na primeira carga, mostramos o loader. Nas atualizações de background, não.
        if (alertasConfigurados.length === 0) {
            container.innerHTML = `<div class="fec-loader-minimal">Carregando...</div>`;
            await atualizarDadosEmBackground();
        }
        
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
                        <div class="settings-info"><span>Hora da Notificação</span><p>Global: 08:00</p></div>
                    </div>
                    <div class="settings-item clickable" id="ir-antecedencia">
                        <div class="settings-info">
                            <span>Notifique-me com antecedência</span>
                            <p>${alertasConfigurados.length} alerta(s) configurado(s)</p>
                        </div>
                        <i data-lucide="chevron-right"></i>
                    </div>
                </section>

                <div class="notif-section-label">PRÓXIMOS ALERTAS</div>
                <section class="alertas-list">
                    ${proximos.length > 0 ? proximos.map(p => `
                        <div class="alerta-item">
                            <div class="alerta-corpo">
                                <span class="alerta-nome">${p.nome}</span>
                                <p class="alerta-data">${p.data_nascimento.split('-').reverse().slice(0,2).join('/')}</p>
                            </div>
                            <a href="${gerarLinkWhatsapp(p.nome, p.telefone || '')}" target="_blank" class="alerta-btn">
                                <i data-lucide="message-circle"></i>
                            </a>
                        </div>
                    `).join('') : '<p style="padding:20px; color:#666;">Nenhum alerta para os próximos 7 dias.</p>'}
                </section>
            </div>
        `;
        setupEvents();
    };

    // --- TELA 2: ANTECEDÊNCIA ---
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
                                <span>${alerta.dias} dia${alerta.dias > 1 ? 's' : ''} antes às ${alerta.hora.substring(0,5)}</span>
                                <p>${alerta.alvo}${alerta.grupos_especificos?.length > 0 ? ': ' + alerta.grupos_especificos.join(', ') : ''}</p>
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
                        <div class="picker-item selected" data-value="1">1</div>
                        <div class="picker-item opaco">2</div>
                    </div>
                    <div class="modal-actions">
                        <button class="btn-modal-cancel" id="close-dias">Cancelar</button>
                        <button class="btn-modal-ok" id="btn-ir-hora">OK</button>
                    </div>
                </div>
            </div>

            <div class="modal-overlay" id="modal-hora">
                <div class="modal-box time-picker">
                    <span class="time-label">HORA DA NOTIFICAÇÃO</span>
                    <div class="time-inputs-row">
                        <div class="time-field active"><input type="number" id="h-val" value="08"><label>Hora</label></div>
                        <span class="time-separator">:</span>
                        <div class="time-field"><input type="number" id="m-val" value="00"><label>Minuto</label></div>
                    </div>
                    <div class="modal-actions-time">
                        <i data-lucide="clock" class="icon-clock-modal"></i>
                        <div class="right-actions">
                            <button class="btn-modal-cancel" id="close-hora">CANCELAR</button>
                            <button class="btn-modal-ok" id="btn-ir-grupos">OK</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="modal-overlay" id="modal-grupos">
                <div class="modal-box">
                    <h3>Ativar para:</h3>
                    <div class="grupos-selection-list">
                        <label class="radio-option">
                            <input type="radio" name="alvo" value="Todos os contatos" checked>
                            <span class="radio-mark"></span> Todos os contatos
                        </label>
                        <label class="radio-option">
                            <input type="radio" name="alvo" value="Grupos selecionados">
                            <span class="radio-mark"></span> Grupos selecionados
                        </label>
                    </div>

                    <div id="lista-categorias-checkbox" class="categorias-check-container" style="display:none; margin-top: 15px; max-height: 200px; overflow-y: auto;">
                        ${categoriasDisponiveis.map(cat => `
                            <label class="check-option" style="display: flex; align-items: center; gap: 10px; padding: 8px 0;">
                                <input type="checkbox" value="${cat.nome}" class="cat-check">
                                <span>${cat.nome}</span>
                            </label>
                        `).join('')}
                        <button class="btn-ir-categorias" id="go-to-categorias" style="margin-top: 10px; background: none; border: 1px dashed #ccc; width: 100%; padding: 8px; border-radius: 8px; color: #666; display: flex; align-items: center; justify-content: center; gap: 5px;">
                            <i data-lucide="plus" style="width: 14px;"></i> Gerenciar Grupos
                        </button>
                    </div>

                    <div class="modal-actions">
                        <button class="btn-modal-cancel" id="close-grupos">Cancelar</button>
                        <button class="btn-modal-ok" id="btn-salvar-notif">OK</button>
                    </div>
                </div>
            </div>
        `;
        setupEvents();
    };

    const setupEvents = () => {
        // Navegação entre telas
        document.getElementById('ir-antecedencia')?.addEventListener('click', () => { telaAtual = 'antecedencia'; render(); });
        document.getElementById('voltar-principal')?.addEventListener('click', () => { telaAtual = 'principal'; render(); });
        document.getElementById('btn-voltar-app')?.addEventListener('click', () => (window as any).navegar('list'));
        document.getElementById('go-to-categorias')?.addEventListener('click', () => (window as any).navegar('categorias'));

        // Mostrar/Esconder categorias
        document.querySelectorAll('input[name="alvo"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const containerCats = document.getElementById('lista-categorias-checkbox');
                if (containerCats) {
                    containerCats.style.display = (e.target as HTMLInputElement).value === 'Grupos selecionados' ? 'block' : 'none';
                    executarLucide();
                }
            });
        });

        // Modais
        document.getElementById('abrir-modal-dias')?.addEventListener('click', () => document.getElementById('modal-dias')?.classList.add('active'));
        document.getElementById('btn-ir-hora')?.addEventListener('click', () => {
            document.getElementById('modal-dias')?.classList.remove('active');
            document.getElementById('modal-hora')?.classList.add('active');
            executarLucide();
        });
        document.getElementById('btn-ir-grupos')?.addEventListener('click', () => {
            document.getElementById('modal-hora')?.classList.remove('active');
            document.getElementById('modal-grupos')?.classList.add('active');
            executarLucide();
        });

        // ✅ SALVAR EM BACKGROUND
        document.getElementById('btn-salvar-notif')?.addEventListener('click', async () => {
            const btn = (document.getElementById('btn-salvar-notif') as HTMLButtonElement);
            btn.disabled = true; // Evita cliques duplos

            const h = (document.getElementById('h-val') as HTMLInputElement).value.padStart(2, '0');
            const m = (document.getElementById('m-val') as HTMLInputElement).value.padStart(2, '0');
            const alvo = (document.querySelector('input[name="alvo"]:checked') as HTMLInputElement).value;
            const checks = document.querySelectorAll('.cat-check:checked');
            const grupos = Array.from(checks).map(c => (c as HTMLInputElement).value);

            try {
                await aniversarioService.salvarNotificacao({
                    dias: 1, // Aqui você pode capturar do seletor de dias se desejar
                    hora: `${h}:${m}:00`,
                    alvo: alvo,
                    grupos_especificos: grupos
                } as any);
                
                // Fecha o modal imediatamente para dar sensação de velocidade
                document.getElementById('modal-grupos')?.classList.remove('active');
                
                // Atualiza os dados e a tela sem "piscar"
                await atualizarDadosEmBackground();
                render();
            } catch (err) {
                btn.disabled = false;
                alert("Erro ao salvar.");
            }
        });

        // ✅ EXCLUIR EM BACKGROUND
        document.querySelectorAll('.btn-delete-notif').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = (e.currentTarget as HTMLElement).dataset.id;
                if (id) {
                    const row = (e.currentTarget as HTMLElement).closest('.alerta-config-item') as HTMLElement;
                    if (row) row.style.opacity = '0.5'; // Feedback visual de exclusão iniciada

                    await aniversarioService.excluirNotificacao(id);
                    await atualizarDadosEmBackground();
                    render();
                }
            });
        });

        ['dias', 'hora', 'grupos'].forEach(m => {
            document.getElementById(`close-${m}`)?.addEventListener('click', () => {
                document.getElementById(`modal-${m}`)?.classList.remove('active');
            });
        });
    };

    await render();
}