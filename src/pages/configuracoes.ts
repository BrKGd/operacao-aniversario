import '../styles/configuracoes.css';
import { aniversarioService } from '../services/aniversarioService';
import { excelService } from '../services/excelService';
import { webPushService } from '../utils/webPush';
import { modalAlerta } from '../utils/modalAlertas';
import { createIcons, icons } from 'lucide';

export async function montarConfiguracoes(container: HTMLElement) {
    // 1. Skeleton Loading Moderno
    container.innerHTML = `
        <div class="config-container skeleton-loading">
            <div class="skeleton-header" style="height: 90px; margin-bottom: 24px; border-radius: 28px;"></div>
            <div class="skeleton-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 24px;">
                <div class="skeleton-card" style="height: 120px; border-radius: 20px;"></div>
                <div class="skeleton-card" style="height: 120px; border-radius: 20px;"></div>
            </div>
            <div class="skeleton-list" style="height: 180px; border-radius: 20px;"></div>
        </div>
    `;

    try {
        const [todos, categorias] = await Promise.all([
            aniversarioService.listarTodos(),
            aniversarioService.listarCategorias()
        ]);

        const mesAtual = new Date().getMonth();
        const nomeMesAtual = new Date().toLocaleString('pt-BR', { month: 'long' });
        const nomeMesCapitalizado = nomeMesAtual.charAt(0).toUpperCase() + nomeMesAtual.slice(1);
        
        const niverMes = todos.filter(a => {
            if (!a.data_nascimento) return false;
            const parts = a.data_nascimento.split('-');
            return parts.length >= 2 && parseInt(parts[1] ?? '0', 10) - 1 === mesAtual;
        }).length;

        const temaAtual = localStorage.getItem('theme') || 'light';
        const pushAtivo = webPushService.isEnabled();

        container.innerHTML = `
            <div class="config-container">
                <header class="config-header-premium">
                    <div class="profile-card-hero">
                        <div class="profile-section">
                            <div class="avatar-wrapper">
                                <img src="https://ui-avatars.com/api/?name=Admin+Leao&background=4361EE&color=fff&bold=true" alt="User">
                                <div class="status-indicator online"></div>
                            </div>
                            <div class="profile-info">
                                <h1>Painel de Ajustes</h1>
                                <p>Administrador • <strong>${todos.length}</strong> contatos ativos</p>
                            </div>
                        </div>
                        <span class="badge-rank-pro">PRO</span>
                    </div>
                </header>

                <section class="config-section">
                    <div class="section-label">
                        <i data-lucide="bar-chart-3"></i>
                        <span>Resumo do Elenco</span>
                    </div>

                    <div class="bento-grid">
                        <div class="bento-card main-stats">
                            <div class="card-header-icon">
                                <span class="card-label">Total Cadastrados</span>
                                <div class="card-icon-pill">
                                    <i data-lucide="users"></i>
                                </div>
                            </div>
                            <div class="card-value">${todos.length}</div>
                            <div class="card-subtext">Integrantes no elenco</div>
                        </div>
                        
                        <div class="bento-card main-stats">
                            <div class="card-header-icon">
                                <span class="card-label">Em ${nomeMesCapitalizado}</span>
                                <div class="card-icon-pill" style="color: #f59e0b;">
                                    <i data-lucide="party-popper"></i>
                                </div>
                            </div>
                            <div class="card-value" style="background: var(--gold-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${niverMes}</div>
                            <div class="card-subtext">Aniversariantes este mês</div>
                        </div>

                        <div class="bento-card categories-bento">
                            <span class="card-label" style="display: block; margin-bottom: 14px;">Grupos & Categorias</span>
                            <div class="stat-grid-premium">
                                ${categorias.map((cat: any) => {
                                    const count = todos.filter(t => t.categoria_id === cat.id).length;
                                    return `
                                        <div class="card-2x3" style="--cat-color: ${cat.cor || '#4361ee'}">
                                            <div class="cat-icon-large-wrapper">
                                                <i data-lucide="${cat.icone || 'tag'}" class="cat-icon-large"></i>
                                            </div>
                                            <span class="cat-name">${cat.nome}</span>
                                            <span class="badge-membros-gold">${count} ${count === 1 ? 'Membro' : 'Membros'}</span>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                </section>

                <section class="config-section">
                    <div class="section-label">
                        <i data-lucide="sliders"></i>
                        <span>Experiência & Preferências</span>
                    </div>
                    
                    <div class="action-card" id="btnToggleTema">
                        <div class="action-icon">
                            <i data-lucide="${temaAtual === 'light' ? 'moon' : 'sun'}"></i>
                        </div>
                        <div class="action-content">
                            <span>Aparência do Sistema</span>
                            <small>${temaAtual === 'light' ? 'Modo Claro ativo (clique para escurecer)' : 'Modo Escuro ativo (clique para clarear)'}</small>
                        </div>
                        <div class="toggle-switch ${temaAtual === 'dark' ? 'active' : ''}"></div>
                    </div>

                    <div class="action-card" id="btnSmartNotifications">
                        <div class="action-icon smart">
                            <i data-lucide="zap"></i>
                        </div>
                        <div class="action-content">
                            <span>Notificações Nativas do Browser</span>
                            <small>${pushAtivo ? 'Notificações ativadas no navegador (clique para desativar)' : 'Notificações desativadas (clique para ativar)'}</small>
                        </div>
                        <div class="toggle-switch ${pushAtivo ? 'active' : ''}"></div>
                    </div>
                </section>

                <section class="config-section">
                    <div class="section-label">
                        <i data-lucide="database"></i>
                        <span>Dados & Sincronização</span>
                    </div>

                    <div class="menu-group">
                        <div class="menu-item-clean" id="btnSyncCloud">
                            <div class="item-lead">
                                <i data-lucide="cloud-lightning"></i>
                                <span>Backup Cloud (Supabase)</span>
                            </div>
                            <span class="status-text">Sincronizado</span>
                        </div>

                        <div class="menu-item-clean" id="btnExportarExcel">
                            <div class="item-lead">
                                <i data-lucide="file-spreadsheet"></i>
                                <span>Exportar Relatório Excel (.xlsx)</span>
                            </div>
                            <i data-lucide="chevron-right" class="arrow"></i>
                        </div>

                        <div class="menu-item-clean" id="btnImportar">
                            <div class="item-lead">
                                <i data-lucide="file-up"></i>
                                <span>Importar Dados (Excel / CSV / JSON)</span>
                            </div>
                            <input type="file" id="inputImportar" style="display:none" accept=".xlsx, .xls, .csv, .json">
                            <i data-lucide="chevron-right" class="arrow"></i>
                        </div>
                    </div>
                </section>

                <footer class="config-footer">
                    <button class="btn-optimize" id="btnOtimizar">
                        <i data-lucide="sparkles"></i>
                        <span>Otimizar Banco de Dados</span>
                    </button>
                    <div class="version-tag">LEÃO FESTIVO • v1.4.0-PRO • 2026</div>
                </footer>
            </div>
        `;

        // 1. Otimização Inteligente
        document.getElementById('btnOtimizar')?.addEventListener('click', () => {
            modalAlerta.showLoading('Otimizando cache e integridade...');
            setTimeout(() => {
                aniversarioService.invalidarCache();
                modalAlerta.show({
                    title: 'Sistema Otimizado!',
                    message: 'Cache local renovado e dados revalidados com o Supabase.',
                    type: 'success'
                });
            }, 1200);
        });

        // 2. Toggle de Tema com Persistência
        document.getElementById('btnToggleTema')?.addEventListener('click', () => {
            const isDark = document.body.getAttribute('data-theme') === 'dark';
            const novoTema = isDark ? 'light' : 'dark';
            document.body.setAttribute('data-theme', novoTema);
            localStorage.setItem('theme', novoTema);
            montarConfiguracoes(container);
        });

        // 3. Notificações Nativas do Browser (Alternar Ativado / Desativado)
        document.getElementById('btnSmartNotifications')?.addEventListener('click', async () => {
            if (webPushService.isEnabled()) {
                // Se já estiver ativo, desativa
                webPushService.setStatus(false);
                modalAlerta.show({
                    title: 'Notificações Desativadas',
                    message: 'Você não receberá mais alertas nativos de aniversários no navegador.',
                    type: 'info'
                });
            } else {
                // Se estiver desativado, ativa (ou pede permissão se necessário)
                const concedido = await webPushService.solicitarPermissao();
                if (concedido) {
                    webPushService.setStatus(true);
                    modalAlerta.show({
                        title: 'Notificações Ativadas!',
                        message: 'Você receberá alertas nativos no navegador quando houver aniversariantes.',
                        type: 'success'
                    });
                    webPushService.verificarENotificarAniversariantes(todos);
                } else {
                    modalAlerta.show({
                        title: 'Permissão Necessária',
                        message: 'Autorize as notificações nas configurações do seu navegador para receber os alertas.',
                        type: 'error'
                    });
                }
            }
            montarConfiguracoes(container);
        });

        // 4. Exportação Excel (.xlsx)
        document.getElementById('btnExportarExcel')?.addEventListener('click', () => {
            if (todos.length === 0) {
                return modalAlerta.show({ message: 'Nenhum aniversariante para exportar.', type: 'error' });
            }
            excelService.exportarParaExcel(todos, categorias);
            modalAlerta.show({ message: `${todos.length} registros exportados para Excel com sucesso!`, type: 'success' });
        });

        // 5. Importação (Excel, CSV ou JSON)
        const inputImportar = document.getElementById('inputImportar') as HTMLInputElement;
        document.getElementById('btnImportar')?.addEventListener('click', () => inputImportar.click());

        inputImportar?.addEventListener('change', async (e) => {
            const target = e.target as HTMLInputElement;
            const file = target.files?.[0];
            if (!file) return;

            try {
                modalAlerta.showLoading('Processando arquivo...');
                let novosRegistros: any[] = [];

                if (file.name.endsWith('.json')) {
                    const text = await file.text();
                    novosRegistros = JSON.parse(text);
                } else {
                    novosRegistros = await excelService.importarDoExcel(file, categorias);
                }

                if (!Array.isArray(novosRegistros) || novosRegistros.length === 0) {
                    throw new Error('Nenhum registro válido encontrado no arquivo.');
                }

                let importados = 0;
                for (const item of novosRegistros) {
                    try {
                        await aniversarioService.adicionar({
                            nome: item.nome,
                            apelido: item.apelido || item.nome.split(' ')[0],
                            data_nascimento: item.data_nascimento,
                            telefone: item.telefone || '',
                            frase_exibicao: item.frase_exibicao || '',
                            observacoes: item.observacoes || '',
                            categoria_id: item.categoria_id || categorias[0]?.id || '',
                            favorito: !!item.favorito,
                            send_msg: item.send_msg !== false,
                            idadeNova: 0
                        });
                        importados++;
                    } catch (err) {
                        console.error('Erro ao importar linha:', item, err);
                    }
                }

                modalAlerta.show({
                    title: 'Importação Concluída!',
                    message: `${importados} de ${novosRegistros.length} aniversariantes foram cadastrados no Supabase!`,
                    type: 'success'
                });
                
                montarConfiguracoes(container);
            } catch (err: any) {
                console.error('Erro na importação:', err);
                modalAlerta.show({
                    title: 'Erro na Importação',
                    message: err.message || 'Falha ao processar o arquivo enviado.',
                    type: 'error'
                });
            } finally {
                inputImportar.value = '';
            }
        });

        // 6. Cloud Sync Manual
        document.getElementById('btnSyncCloud')?.addEventListener('click', () => {
            modalAlerta.showLoading('Sincronizando com a Nuvem...');
            aniversarioService.revalidarAniversariosEmBackground().then(() => {
                modalAlerta.show({ title: 'Nuvem Atualizada', message: 'Dados sincronizados com o Supabase.', type: 'success' });
            });
        });

        createIcons({ icons });

    } catch (error) {
        console.error("Config Error:", error);
        container.innerHTML = `
            <div class="error-container" style="text-align: center; padding: 40px;">
                <i data-lucide="alert-octagon" style="width: 48px; height: 48px; color: #ef4444; margin-bottom: 12px;"></i>
                <p style="color: var(--text-muted);">Falha ao carregar configurações.</p>
                <button onclick="location.reload()" style="background: #4361ee; color: white; border: none; padding: 10px 20px; border-radius: 12px; margin-top: 10px; cursor: pointer;">Tentar novamente</button>
            </div>
        `;
        createIcons({ icons });
    }
}