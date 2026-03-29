import '../styles/notificacoes.css';
import { aniversarioService } from '../services/aniversarioService';
import { gerarLinkWhatsapp } from '../utils/messages';
import { modalAlerta } from '../utils/modalAlertas'; // Importado
import { 
    createIcons, 
    ChevronLeft, 
    ChevronRight, 
    MessageCircle, 
    Trash2, 
    PlusCircle, 
    Clock,
    Plus,
    Music,
    Volume2
} from 'lucide';

let telaAtual: 'principal' | 'antecedencia' = 'principal';
let alertasConfigurados: any[] = [];
let categoriasDisponiveis: any[] = [];
let somSelecionado = 'Padrão do Sistema';

export async function montarNotificacoes(container: HTMLElement) {
    
    const atualizarDadosEmBackground = async () => {
        const [alertas, categorias] = await Promise.all([
            aniversarioService.listarNotificacoes(),
            aniversarioService.listarCategorias()
        ]);
        alertasConfigurados = alertas;
        categoriasDisponiveis = categorias;
    };

    const obterNomesCategorias = (idsSelecionados: any[]) => {
        if (!idsSelecionados || idsSelecionados.length === 0) return "";
        const nomes = categoriasDisponiveis
            .filter(cat => idsSelecionados.includes(cat.id))
            .map(cat => cat.nome);
        return nomes.length > 0 ? nomes.join(', ') : "Grupos não encontrados";
    };

    const executarLucide = () => {
        createIcons({
            icons: { ChevronLeft, ChevronRight, MessageCircle, Trash2, PlusCircle, Clock, Plus, Music, Volume2 },
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

                    <div class="settings-item clickable" id="btn-escolher-som">
                        <div class="settings-info">
                            <span>Som da Notificação</span>
                            <p id="label-som">${somSelecionado}</p>
                        </div>
                        <i data-lucide="volume-2"></i>
                    </div>
                    <input type="file" id="input-som-sistema" accept="audio/*" style="display:none;">
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
                                <p>${alerta.alvo === 'Grupos selecionados' 
                                    ? 'Grupos: ' + obterNomesCategorias(alerta.grupos_especificos) 
                                    : 'Todos os contatos'}</p>
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
                            <input type="radio" name="alvo" value="Grupos selecionados" id="radio-especificos">
                            <span class="radio-mark"></span> Grupos selecionados
                        </label>
                    </div>

                    <div id="lista-categorias-checkbox" class="categorias-check-container" style="display:none; margin-top: 15px;">
                        ${categoriasDisponiveis.map(cat => `
                            <label class="check-option">
                                <input type="checkbox" value="${cat.id}" class="cat-check">
                                <span class="check-box"></span> 
                                <span class="category-name">${cat.nome}</span>
                            </label>
                        `).join('')}
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
        document.getElementById('ir-antecedencia')?.addEventListener('click', () => { telaAtual = 'antecedencia'; render(); });
        document.getElementById('voltar-principal')?.addEventListener('click', () => { telaAtual = 'principal'; render(); });
        document.getElementById('btn-voltar-app')?.addEventListener('click', () => (window as any).navegar('list'));

        // --- LÓGICA DE SOM DO SISTEMA ---
        const btnSom = document.getElementById('btn-escolher-som');
        const inputSom = document.getElementById('input-som-sistema') as HTMLInputElement;

        btnSom?.addEventListener('click', () => {
            inputSom.click(); // Abre o seletor nativo do sistema
        });

        inputSom?.addEventListener('change', () => {
            if (inputSom.files && inputSom.files[0]) {
                somSelecionado = inputSom.files[0].name;
                modalAlerta.show({ 
                    message: `Som "${somSelecionado}" definido com sucesso!`, 
                    type: 'success' 
                });
                render();
            }
        });

        // --- LÓGICA DE SALVAMENTO ---
        document.getElementById('btn-salvar-notif')?.addEventListener('click', async () => {
            const btn = (document.getElementById('btn-salvar-notif') as HTMLButtonElement);
            const h = (document.getElementById('h-val') as HTMLInputElement).value.padStart(2, '0');
            const m = (document.getElementById('m-val') as HTMLInputElement).value.padStart(2, '0');
            const alvo = (document.querySelector('input[name="alvo"]:checked') as HTMLInputElement).value;
            const checks = document.querySelectorAll('.cat-check:checked');
            const gruposIds = Array.from(checks).map(c => (c as HTMLInputElement).value);

            if (alvo === 'Grupos selecionados' && gruposIds.length === 0) {
                modalAlerta.show({ message: "Selecione pelo menos um grupo!", type: 'warning' });
                return;
            }

            btn.disabled = true;
            modalAlerta.showLoading("Salvando configurações...");

            try {
                await aniversarioService.salvarNotificacao({
                    dias: 1, 
                    hora: `${h}:${m}:00`,
                    alvo: alvo,
                    grupos_especificos: alvo === 'Grupos selecionados' ? gruposIds : []
                } as any);
                
                modalAlerta.close();
                document.getElementById('modal-grupos')?.classList.remove('active');
                await atualizarDadosEmBackground();
                render();
                modalAlerta.show({ message: "Notificação configurada!", type: 'success' });
            } catch (err) {
                btn.disabled = false;
                modalAlerta.show({ message: "Erro ao salvar.", type: 'error' });
            }
        });

        // ✅ CORREÇÃO DO ERRO 'CLOSEST': Capturamos a referência ANTES do await do modal
        document.querySelectorAll('.btn-delete-notif').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const elementoClicado = e.currentTarget as HTMLElement;
                const id = elementoClicado.dataset.id;
                const linhaParaRemover = elementoClicado.closest('.alerta-config-item') as HTMLElement;

                if (id && linhaParaRemover) {
                    const confirmou = await modalAlerta.show({
                        message: "Deseja realmente excluir este alerta?",
                        type: 'confirm',
                        confirmText: 'Excluir'
                    });

                    if (confirmou) {
                        linhaParaRemover.style.opacity = '0.5';
                        await aniversarioService.excluirNotificacao(id);
                        await atualizarDadosEmBackground();
                        render();
                    }
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