import '../styles/calendario.css';
import whatsappIcon from '../assets/whatsapp.png';
import { aniversarioService } from '../services/aniversarioService';
import { Aniversario, Categoria, MensagemTemplate } from '../types';
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
    MessageCircle,
    X,
    Filter 
} from 'lucide';

export async function montarCalendario(container: HTMLElement) {
    container.innerHTML = `<div class="fec-loader-minimal">Carregando calendário...</div>`;

    try {
        const hoje = new Date();
        const [todosOriginal, categorias, templates]: [Aniversario[], Categoria[], MensagemTemplate[]] = await Promise.all([
            aniversarioService.listarTodos(),
            aniversarioService.listarCategorias(),
            aniversarioService.listarTemplates()
        ]);
        
        let todos = [...todosOriginal]; 
        let mesVisualizado = hoje.getMonth();
        let anoVisualizado = hoje.getFullYear();
        let diaSelecionado: number | null = null;
        let categoriaAtiva: string | null = null; 
        let tipoTemplateAtivo: string | null = null;

        const tiposMensagensDisponiveis = [...new Set(templates.map(t => t.tipo))].sort();

        const calcularIdadeVindoura = (dataNasc: string) => {
            const nasc = new Date(dataNasc + 'T00:00:00');
            return anoVisualizado - nasc.getFullYear();
        };

        // --- FUNÇÃO DE ATUALIZAÇÃO PARCIAL (APENAS A LISTA) ---
        const atualizarListaTemplatesNoDrawer = (containerLista: HTMLElement, nomePessoa: string, telefonePessoa: string) => {
            const filtrados = tipoTemplateAtivo 
                ? templates.filter(t => t.tipo === tipoTemplateAtivo)
                : templates;

            containerLista.innerHTML = filtrados.length > 0 ? filtrados.map((t: any) => {
                const conteudoSeguro = t.conteudo || "";
                const msgFinal = conteudoSeguro.replace('[nome]', nomePessoa);
                return `
                    <div class="card-template-premium" data-msg="${encodeURIComponent(msgFinal)}">
                        <div class="template-info">
                            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                                <span style="font-size: 0.65rem; background: rgba(99, 102, 241, 0.2); padding: 2px 6px; border-radius: 4px; color: #818cf8; font-weight: bold; text-transform: uppercase;">${t.tipo}</span>
                            </div>
                            <p style="margin:0; font-size:0.9rem; color: rgba(255,255,255,0.8);">${msgFinal}</p>
                        </div>
                        <div class="template-action">
                            <img src="${whatsappIcon}" alt="WhatsApp" style="width: 20px; height: 20px;">
                        </div>
                    </div>
                `;
            }).join('') : '<p style="text-align:center; padding:40px; color:rgba(255,255,255,0.4);">Nenhum template encontrado para este filtro.</p>';

            // Re-renderiza apenas os ícones necessários na lista
            createIcons({ icons: { MessageCircle }, root: containerLista });

            // Re-vincula os eventos de envio de mensagem nos novos cards
            containerLista.querySelectorAll('.card-template-premium').forEach(card => {
                card.addEventListener('click', () => {
                    const msg = decodeURIComponent((card as HTMLElement).dataset.msg || '');
                    const link = `https://wa.me/${telefonePessoa.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
                    window.open(link, '_blank');
                    document.getElementById('drawer-mensagens-dinamico')?.remove();
                });
            });
        };

        // --- ABERTURA DO DRAWER ---
        const abrirSeletorMensagem = (nome: string, telefone: string) => {
            const drawerExistente = document.getElementById('drawer-mensagens-dinamico');
            if (drawerExistente) drawerExistente.remove();

            const drawer = document.createElement('div');
            drawer.className = 'drawer-overlay-premium active';
            drawer.id = 'drawer-mensagens-dinamico';
            
            drawer.innerHTML = `
                <div class="drawer-content-premium">
                    <div class="drawer-handle"></div>
                    <div class="drawer-header-premium" style="padding-bottom: 10px; border-bottom: border-bottom: 1px solid rgba(255,255,255,0.1);">
                        <div class="drawer-title-group">
                            <h2 style="font-size: 1rem; color: #fff;">Mensagem para ${nome}</h2>
                            <small style="color: rgba(255,255,255,0.5); display: block;">Escolha um estilo e o template</small>
                        </div>
                        <div class="drawer-header-actions">
                            <button class="btn-add-category-drawer" id="close-msg-drawer">
                                <i data-lucide="x" style="width: 20px;"></i>
                            </button>
                        </div>
                    </div>

                    <div class="category-drawer-content" style="padding-top: 0;">
                        <div id="section-filtros-templates">
                            <div class="pills-container-scroll" style="display: flex; gap: 8px; overflow-x: auto; padding: 5px 0; scrollbar-width: none; -ms-overflow-style: none;">
                                <button class="btn-pill-filter ${!tipoTemplateAtivo ? 'active' : ''}" data-tipo="">Todos</button>
                                ${tiposMensagensDisponiveis.map(tipo => `
                                    <button class="btn-pill-filter ${tipoTemplateAtivo === tipo ? 'active' : ''}" data-tipo="${tipo}">${tipo}</button>
                                `).join('')}
                            </div>
                        </div>
                        <div class="lista-templates-container" id="lista-dinamica-templates"></div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(drawer);
            createIcons({ icons: { X }, root: drawer });

            const fechar = () => drawer.remove();
            drawer.querySelector('#close-msg-drawer')?.addEventListener('click', fechar);
            drawer.addEventListener('click', (e) => { if (e.target === drawer) fechar(); });

            const containerLista = drawer.querySelector('#lista-dinamica-templates') as HTMLElement;
            
            // Renderiza a lista pela primeira vez
            atualizarListaTemplatesNoDrawer(containerLista, nome, telefone);

            // Gerencia os cliques nos filtros (sem fechar/abrir o drawer)
            drawer.querySelectorAll('.btn-pill-filter').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const target = e.currentTarget as HTMLElement;
                    
                    // Feedback visual imediato nos botões
                    drawer.querySelectorAll('.btn-pill-filter').forEach(b => b.classList.remove('active'));
                    target.classList.add('active');

                    // Atualiza dado e renderiza apenas a lista
                    tipoTemplateAtivo = target.dataset.tipo || null;
                    atualizarListaTemplatesNoDrawer(containerLista, nome, telefone);
                });
            });
        };

        // --- LÓGICA DO CALENDÁRIO ---
        const renderizarMes = () => {
            const primeiroDiaMes = new Date(anoVisualizado, mesVisualizado, 1).getDay();
            const diasNoMes = new Date(anoVisualizado, mesVisualizado + 1, 0).getDate();
            const nomeMes = new Date(anoVisualizado, mesVisualizado).toLocaleString('pt-BR', { month: 'long' });

            const niversMes = todos.filter(p => {
                const d = new Date(p.data_nascimento + 'T00:00:00');
                return d.getMonth() === mesVisualizado;
            });

            let diasHtml = '';
            for (let i = 0; i < primeiroDiaMes; i++) diasHtml += `<div class="dia-vazio"></div>`;

            for (let dia = 1; dia <= diasNoMes; dia++) {
                const niversDoDia = niversMes.filter(n => new Date(n.data_nascimento + 'T00:00:00').getDate() === dia);
                const ehHoje = dia === hoje.getDate() && mesVisualizado === hoje.getMonth() && anoVisualizado === hoje.getFullYear();
                const getAvatarUrl = (nome: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(nome)}&background=6366f1&color=fff&bold=true`;

                diasHtml += `
                    <div class="dia-card ${ehHoje ? 'hoje' : ''} ${niversDoDia.length > 0 ? 'tem-evento' : ''} ${dia === diaSelecionado ? 'selecionado' : ''}" data-dia="${dia}">
                        ${ehHoje ? '<span class="label-hoje">HOJE</span>' : ''}
                        <span class="num-dia">${dia}</span>
                        <div class="container-avatares-dia">
                            ${niversDoDia.slice(0, 2).map(n => `<img src="${getAvatarUrl(n.apelido || n.nome)}" class="avatar-mini">`).join('')}
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
                        <h2 style="text-transform: capitalize;">${nomeMes} ${anoVisualizado}</h2>
                        <button id="nextMes" class="btn-cal"><i data-lucide="chevron-right"></i></button>
                    </header>

                    <div class="dias-semana">
                        <span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span>
                    </div>

                    <div class="grade-dias">${diasHtml}</div>

                    <div class="legenda-lista">
                        <div class="secao-titulo">
                            <span style="text-transform: capitalize;">${diaSelecionado ? `Dia ${diaSelecionado}` : `Em ${nomeMes}`}</span>
                            ${diaSelecionado || categoriaAtiva ? `<span id="limpar-filtros-total" style="cursor:pointer; color:#6366f1; font-size: 0.8rem; font-weight: 600;">Ver todos</span>` : ''}
                        </div>
                        
                        <div class="filtros-categorias-scroll" style="display: flex; gap: 8px; overflow-x: auto; padding: 10px 0; margin-bottom: 10px; scrollbar-width: none; -ms-overflow-style: none;">
                             <button class="btn-cat-filter ${!categoriaAtiva ? 'active' : ''}" data-id="">Todos</button>
                             ${categorias.map(c => `
                                <button class="btn-cat-filter ${categoriaAtiva === c.id ? 'active' : ''}" data-id="${c.id}">${c.nome}</button>
                             `).join('')}
                        </div>

                        <div class="lista-contatos-cal">
                            ${niversParaExibir.length > 0 ? niversParaExibir.map(n => `
                                <div class="item-legenda" onclick="window.navegar('detalhes', '${n.id}')">
                                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(n.nome)}&background=random" class="foto-lista">
                                    <div class="info-niver">
                                        <strong>${n.nome}</strong>
                                        <span>${calcularIdadeVindoura(n.data_nascimento)} anos • Dia ${new Date(n.data_nascimento + 'T00:00:00').getDate()}</span>
                                    </div>
                                    <button class="btn-zap-cal" data-nome="${n.nome}" data-tel="${n.telefone || ''}" onclick="event.stopPropagation();">
                                        <img src="${whatsappIcon}" alt="WhatsApp" style="width: 20px; height: 20px;">
                                    </button>
                                </div>
                            `).join('') : `<p style="text-align:center; color:#94a3b8; padding:30px; font-size:0.9rem;">Nenhum encontrado.</p>`}
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

            document.querySelectorAll('.btn-cat-filter').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = (e.target as HTMLElement).dataset.id || null;
                    categoriaAtiva = id;
                    todos = categoriaAtiva 
                        ? todosOriginal.filter(p => p.categoria_id === categoriaAtiva)
                        : [...todosOriginal];
                    renderizarMes();
                });
            });

            document.getElementById('limpar-filtros-total')?.addEventListener('click', () => {
                diaSelecionado = null;
                categoriaAtiva = null;
                todos = [...todosOriginal];
                renderizarMes();
            });

            document.querySelectorAll('.btn-zap-cal').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const target = e.currentTarget as HTMLElement;
                    abrirSeletorMensagem(target.dataset.nome || '', target.dataset.tel || '');
                });
            });

            createIcons({ 
                icons: { 
                    ChevronLeft, ChevronRight, Sparkles, LogOut, 
                    LayoutGrid, Contact2, Plus, CalendarHeart, 
                    Settings2, MessageCircle, X, Filter 
                } 
            });
        };

        renderizarMes();

    } catch (error) {
        console.error(error);
        container.innerHTML = `<div class="error-msg">Erro ao carregar. Verifique o console.</div>`;
    }
}