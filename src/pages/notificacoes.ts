import '../styles/notificacoes.css';
import { aniversarioService } from '../services/aniversarioService';
import { gerarLinkWhatsapp } from '../utils/messages';
import { modalAlerta } from '../utils/modalAlertas';
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
let somSelecionadoNome = 'Padrão do Sistema';

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

                <div class="notif-section-label">CONFIGURAÇÕES DO DISPOSITIVO</div>
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
                    
                    <div class="settings-item clickable" id="abrir-seletor-nativo">
                        <div class="settings-info">
                            <span>Som da Notificação</span>
                            <p id="txt-som-atual">Atual: ${somSelecionadoNome}</p>
                        </div>
                        <i data-lucide="volume-2"></i>
                    </div>
                    <input type="file" id="input-audio-nativo" accept="audio/*" style="display:none;">
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
                    `).join('') : '<p style="padding:20px; color:#666;">Nenhum alerta próximo.</p>'}
                </section>
            </div>
        `;
        setupEvents();
    };

    const renderAntecedencia = () => {
        container.innerHTML = `
            <div class="notif-page-light">
                <header class="notif-header-simple">
                    <button class="btn-back-minimal" id="voltar-principal"><i data-lucide="chevron-left"></i></button>
                    <h1>Antecedência</h1>
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

            <div class="modal-overlay" id="modal-dias"><div class="modal-box"><h3>Dias antes</h3><div class="picker-container"><div class="picker-item selected" data-value="1">1</div></div><div class="modal-actions"><button class="btn-modal-cancel" id="close-dias">Cancelar</button><button class="btn-modal-ok" id="btn-ir-hora">OK</button></div></div></div>
            <div class="modal-overlay" id="modal-hora"><div class="modal-box time-picker"><span class="time-label">HORA</span><div class="time-inputs-row"><div class="time-field active"><input type="number" id="h-val" value="08"></div><span>:</span><div class="time-field"><input type="number" id="m-val" value="00"></div></div><div class="modal-actions-time"><div class="right-actions"><button class="btn-modal-cancel" id="close-hora">CANCELAR</button><button class="btn-modal-ok" id="btn-ir-grupos">OK</button></div></div></div></div>
            <div class="modal-overlay" id="modal-grupos"><div class="modal-box"><h3>Ativar para:</h3><div class="grupos-selection-list"><label class="radio-option"><input type="radio" name="alvo" value="Todos os contatos" checked><span class="radio-mark"></span> Todos</label><label class="radio-option"><input type="radio" name="alvo" value="Grupos selecionados"><span class="radio-mark"></span> Grupos</label></div><div class="modal-actions"><button class="btn-modal-cancel" id="close-grupos">Cancelar</button><button class="btn-modal-ok" id="btn-salvar-notif">OK</button></div></div></div>
        `;
        setupEvents();
    };

    const setupEvents = () => {
        document.getElementById('ir-antecedencia')?.addEventListener('click', () => { telaAtual = 'antecedencia'; render(); });
        document.getElementById('voltar-principal')?.addEventListener('click', () => { telaAtual = 'principal'; render(); });
        document.getElementById('btn-voltar-app')?.addEventListener('click', () => (window as any).navegar('list'));

        // --- LÓGICA DO SELETOR NATIVO ---
        const btnSom = document.getElementById('abrir-seletor-nativo');
        const inputSom = document.getElementById('input-audio-nativo') as HTMLInputElement;

        btnSom?.addEventListener('click', () => inputSom?.click());

        inputSom?.addEventListener('change', async () => {
            if (inputSom.files && inputSom.files[0]) {
                const arquivo = inputSom.files[0];
                somSelecionadoNome = arquivo.name;
                
                // Opcional: Aqui você pode converter o arquivo para Base64 se precisar salvar o áudio localmente no IndexedDB/SQLite
                modalAlerta.show({ 
                    message: `Som "${somSelecionadoNome}" selecionado!`, 
                    type: 'success' 
                });
                render();
            }
        });

        // --- LÓGICA DE EXCLUSÃO (CORRIGIDA) ---
        document.querySelectorAll('.btn-delete-notif').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                // Captura imediata das referências antes de qualquer await
                const currentBtn = e.currentTarget as HTMLElement;
                const id = currentBtn.dataset.id;
                const row = currentBtn.closest('.alerta-config-item') as HTMLElement;

                if (id && row) {
                    const confirmar = await modalAlerta.show({
                        message: "Deseja excluir esta notificação?",
                        type: 'confirm',
                        confirmText: 'Excluir'
                    });

                    if (confirmar) {
                        row.style.opacity = '0.5';
                        try {
                            await aniversarioService.excluirNotificacao(id);
                            await atualizarDadosEmBackground();
                            render();
                        } catch (err) {
                            row.style.opacity = '1';
                            modalAlerta.show({ message: "Erro ao excluir.", type: 'error' });
                        }
                    }
                }
            });
        });

        // --- SALVAMENTO ---
        document.getElementById('btn-salvar-notif')?.addEventListener('click', async () => {
            const h = (document.getElementById('h-val') as HTMLInputElement).value.padStart(2, '0');
            const m = (document.getElementById('m-val') as HTMLInputElement).value.padStart(2, '0');
            const alvo = (document.querySelector('input[name="alvo"]:checked') as HTMLInputElement).value;

            modalAlerta.showLoading("Salvando...");
            try {
                await aniversarioService.salvarNotificacao({
                    dias: 1, 
                    hora: `${h}:${m}:00`,
                    alvo: alvo,
                    grupos_especificos: [] 
                } as any);
                
                modalAlerta.close();
                telaAtual = 'antecedencia';
                await atualizarDadosEmBackground();
                render();
                modalAlerta.show({ message: "Configuração salva!", type: 'success' });
            } catch (err) {
                modalAlerta.show({ message: "Erro ao salvar.", type: 'error' });
            }
        });

        // Eventos básicos de modais
        document.getElementById('abrir-modal-dias')?.addEventListener('click', () => document.getElementById('modal-dias')?.classList.add('active'));
        document.getElementById('btn-ir-hora')?.addEventListener('click', () => {
            document.getElementById('modal-dias')?.classList.remove('active');
            document.getElementById('modal-hora')?.classList.add('active');
        });
        document.getElementById('btn-ir-grupos')?.addEventListener('click', () => {
            document.getElementById('modal-hora')?.classList.remove('active');
            document.getElementById('modal-grupos')?.classList.add('active');
        });

        ['dias', 'hora', 'grupos'].forEach(m => {
            document.getElementById(`close-${m}`)?.addEventListener('click', () => {
                document.getElementById(`modal-${m}`)?.classList.remove('active');
            });
        });
    };

    await render();
}