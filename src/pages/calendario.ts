import '../styles/calendario.css';
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
        let categoriaAtiva: string | null = null; // Filtro de aniversariantes (Grupos)
        let tipoTemplateAtivo: string | null = null; // Filtro de templates (Mensagens)

        // Extrai os tipos únicos das mensagens para o filtro dinâmico
        const tiposMensagensDisponiveis = [...new Set(templates.map(t => t.tipo))].sort();

        const calcularIdadeVindoura = (dataNasc: string) => {
            const nasc = new Date(dataNasc + 'T00:00:00');
            return anoVisualizado - nasc.getFullYear();
        };

        // --- DRAWER DE MENSAGENS COM FILTRO POR TIPO DE MENSAGEM ---
        const abrirSeletorMensagem = (nome: string, telefone: string) => {
            const drawerExistente = document.getElementById('drawer-mensagens-dinamico');
            if (drawerExistente) drawerExistente.remove();

            const drawer = document.createElement('div');
            drawer.className = 'drawer-overlay-premium active';
            drawer.id = 'drawer-mensagens-dinamico';
            
            // Filtra os templates baseados no tipo selecionado internamente no drawer
            const templatesExibidos = tipoTemplateAtivo 
                ? templates.filter(t => t.tipo === tipoTemplateAtivo)
                : templates;

            drawer.innerHTML = `
                <div class="drawer-content-premium">
                    <div class="drawer-handle"></div>
                    <div class="drawer-header-premium">
                        <div class="drawer-title-group">
                            <h2 style="font-size: 1rem; color: #fff;">Mensagem para ${nome}</h2>
                            <small style="color: rgba(255,255,255,0.5); display: block;">Escolha um template abaixo</small>
                        </div>
                        <div class="drawer-header-actions">
                            <button class="btn-add-category-drawer" id="btn-toggle-filtros-templates" title="Filtrar Mensagens">
                                <i data-lucide="filter" style="width: 20px; ${tipoTemplateAtivo ? 'color: #0088ff;' : ''}"></i>
                            </button>
                            <button class="btn-add-category-drawer" id="close-msg-drawer">
                                <i data-lucide="x" style="width: 20px;"></i>
                            </button>
                        </div>
                    </div>

                    <div class="category-drawer-content" id="drawer-scroll-area">
                        <div id="section-filtros-templates" style="display: none; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                            <p style="color: #fff; font-size: 0.8rem; margin-bottom: 10px; font-weight: bold;">Estilo da mensagem:</p>
                            <div style="display: flex; flex-direction: column; gap: 8px;">
                                <label class="category-item-radio" style="padding: 10px 0;">
                                    <span>Todos os Tipos</span>
                                    <input type="radio" name="filtro-tipo-msg" value="" ${!tipoTemplateAtivo ? 'checked' : ''} class="radio-tipo-template">
                                </label>
                                ${tiposMensagensDisponiveis.map(tipo => `
                                    <label class="category-item-radio" style="padding: 10px 0;">
                                        <span>${tipo}</span>
                                        <input type="radio" name="filtro-tipo-msg" value="${tipo}" ${tipoTemplateAtivo === tipo ? 'checked' : ''} class="radio-tipo-template">
                                    </label>
                                `).join('')}
                            </div>
                        </div>

                        <div class="lista-templates-container">
                            ${templatesExibidos.length > 0 ? templatesExibidos.map((t: any) => {
                                const conteudoSeguro = t.conteudo || "";
                                const msgFinal = conteudoSeguro.replace('[nome]', nome);
                                return `
                                    <div class="card-template-premium" data-msg="${encodeURIComponent(msgFinal)}">
                                        <div class="template-info">
                                            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                                                <span style="font-size: 0.65rem; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; color: #6366f1; font-weight: bold; text-transform: uppercase;">${t.tipo}</span>
                                            </div>
                                            <p style="margin:0; font-size:0.9rem; color: rgba(255,255,255,0.8);">${msgFinal}</p>
                                        </div>
                                        <div class="template-action">
                                            <i data-lucide="message-circle" style="width: 18px; color: #25d366;"></i>
                                        </div>
                                    </div>
                                `;
                            }).join('') : '<p style="text-align:center; padding:40px; color:rgba(255,255,255,0.4);">Nenhum template encontrado para este filtro.</p>'}
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(drawer);
            createIcons({ icons: { X, Filter, MessageCircle }, root: drawer });

            const fechar = () => drawer.remove();
            drawer.querySelector('#close-msg-drawer')?.addEventListener('click', fechar);
            drawer.addEventListener('click', (e) => { if (e.target === drawer) fechar(); });

            // Toggle da seção de filtros
            const sectionFiltrosMsg = drawer.querySelector('#section-filtros-templates') as HTMLElement;
            drawer.querySelector('#btn-toggle-filtros-templates')?.addEventListener('click', () => {
                const isHidden = sectionFiltrosMsg.style.display === 'none';
                sectionFiltrosMsg.style.display = isHidden ? 'block' : 'none';
            });

            // Evento de troca de filtro de template
            drawer.querySelectorAll('.radio-tipo-template').forEach(radio => {
                radio.addEventListener('change', (e) => {
                    tipoTemplateAtivo = (e.target as HTMLInputElement).value || null;
                    // Reabre para atualizar a lista filtrada
                    abrirSeletorMensagem(nome, telefone);
                    // Mantém o menu de filtro aberto se o usuário estava filtrando
                    const novaSecao = document.querySelector('#section-filtros-templates') as HTMLElement;
                    if(novaSecao) novaSecao.style.display = 'block';
                });
            });

            // Enviar mensagem
            drawer.querySelectorAll('.card-template-premium').forEach(card => {
                card.addEventListener('click', () => {
                    const msg = decodeURIComponent((card as HTMLElement).dataset.msg || '');
                    const link = `https://wa.me/${telefone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
                    window.open(link, '_blank');
                    fechar();
                });
            });
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
                        
                        <div class="filtros-categorias-scroll" style="display: flex; gap: 8px; overflow-x: auto; padding: 10px 0; margin-bottom: 10px; scrollbar-width: none;">
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
                                        <i data-lucide="message-circle" style="width:20px;"></i>
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

            // Filtro por categoria no calendário
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