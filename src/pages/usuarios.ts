import '../styles/usuarios.css';
import { aniversarioService, calcularStatusPresenca } from '../services/aniversarioService';
import { modalAlerta } from '../utils/modalAlertas';
import { 
    createIcons, 
    ShieldCheck, 
    UserCheck, 
    UserX, 
    Search, 
    ChevronLeft, 
    Sparkles, 
    ShieldAlert, 
    Users, 
    Lock, 
    Unlock, 
    Crown,
    Radio,
    Activity,
    Wifi,
    WifiOff,
    RefreshCw,
    Clock
} from 'lucide';

const ICON_MAP = { 
    ShieldCheck, UserCheck, UserX, Search, ChevronLeft, 
    Sparkles, ShieldAlert, Users, Lock, Unlock, Crown,
    Radio, Activity, Wifi, WifiOff, RefreshCw, Clock
};

export async function montarUsuarios(container: HTMLElement) {
    container.innerHTML = `<div class="fec-center-wrapper"><div class="fec-loader-minimal">Carregando painel de usuários...</div></div>`;

    try {
        const perfil = await aniversarioService.getPerfilUsuario();

        if (!perfil?.isAdmin) {
            modalAlerta.show({ title: "Acesso Negado", message: "Apenas o Administrador tem permissão para acessar este painel.", type: "error" });
            if (typeof (window as any).navegar === 'function') {
                (window as any).navegar('dash');
            } else {
                window.location.hash = '#dash';
            }
            return;
        }

        const usuarios = await aniversarioService.listarTodosUsuarios();

        // Cálculo de estatísticas de presença
        const totalUsuarios = usuarios.length;
        const onlineCount = usuarios.filter(u => calcularStatusPresenca(u.is_online, u.last_seen).online).length;
        const offlineCount = totalUsuarios - onlineCount;

        container.innerHTML = `
            <div class="users-container">
                <!-- BOTÃO VOLTAR -->
                <button class="users-btn-back" id="btnVoltarUsuarios" title="Voltar">
                    <i data-lucide="chevron-left"></i>
                </button>

                <!-- HEADER DO PAINEL ADMIN -->
                <div class="users-header">
                    <div class="admin-badge-title">
                        <i data-lucide="crown"></i> PAINEL DO ADMINISTRADOR
                    </div>
                    <h2>Gestão de Usuários</h2>
                    <p>Gerencie permissões, papéis de acesso e monitore a presença online</p>
                </div>

                <!-- BARRA DE PESQUISA (DIRETAMENTE ABAIXO DA DESCRIÇÃO) -->
                <div class="users-search-wrapper">
                    <i data-lucide="search" class="users-search-icon"></i>
                    <input type="text" class="users-search-input" id="searchUser" placeholder="Buscar usuário por e-mail ou nome...">
                    <button class="users-btn-refresh" id="btnRefreshUsers" title="Atualizar Lista">
                        <i data-lucide="refresh-cw"></i>
                    </button>
                </div>

                <!-- LINHA INTERMEDIÁRIA COM FILTROS DE PRESENÇA NO CANTO SUPERIOR DIREITO -->
                <div class="users-toolbar-row">
                    <span class="users-count-label">
                        <i data-lucide="users"></i> <strong>${totalUsuarios}</strong> ${totalUsuarios === 1 ? 'usuário' : 'usuários'}
                    </span>

                    <div class="presence-filter-chips align-right">
                        <button class="presence-chip active" data-filter="all">
                            Todos (${totalUsuarios})
                        </button>
                        <button class="presence-chip" data-filter="online">
                            <span class="chip-dot dot-green"></span> Online (${onlineCount})
                        </button>
                        <button class="presence-chip" data-filter="offline">
                            <span class="chip-dot dot-grey"></span> Offline (${offlineCount})
                        </button>
                    </div>
                </div>

                <!-- LISTA DE USUÁRIOS (BENTO CARDS) -->
                <div class="users-list" id="usersListContainer">
                    ${usuarios.length === 0 ? `
                        <div class="empty-users-state">Nenhum usuário encontrado.</div>
                    ` : usuarios.map(u => renderUserCard(u)).join('')}
                </div>
            </div>
        `;

        createIcons({ icons: ICON_MAP, root: container });

        // Evento Voltar
        document.getElementById('btnVoltarUsuarios')?.addEventListener('click', () => {
            if (typeof (window as any).navegar === 'function') {
                (window as any).navegar('perfil');
            } else {
                window.location.hash = '#perfil';
            }
        });

        // Evento Recarregar
        document.getElementById('btnRefreshUsers')?.addEventListener('click', () => {
            const icon = container.querySelector('#btnRefreshUsers i');
            if (icon) icon.classList.add('spinning');
            montarUsuarios(container);
        });

        // Lógica de Filtro e Busca Integrada
        let currentFilter = 'all';
        const searchInput = container.querySelector('#searchUser') as HTMLInputElement;

        const aplicarFiltros = () => {
            const query = (searchInput?.value || '').toLowerCase().trim();
            const cards = container.querySelectorAll('.user-card-item');

            cards.forEach(card => {
                const searchData = (card as HTMLElement).dataset.search || '';
                const presenceData = (card as HTMLElement).dataset.presence || 'offline';

                const matchesSearch = searchData.includes(query);
                const matchesPresence = currentFilter === 'all' || presenceData === currentFilter;

                (card as HTMLElement).style.display = (matchesSearch && matchesPresence) ? 'flex' : 'none';
            });
        };

        // Evento da caixa de pesquisa
        searchInput?.addEventListener('input', aplicarFiltros);

        // Eventos dos Chips de Filtro
        container.querySelectorAll('.presence-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                container.querySelectorAll('.presence-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                currentFilter = (chip as HTMLElement).dataset.filter || 'all';
                aplicarFiltros();
            });
        });

        // Registrar handlers de ações nos cards
        vincularEventosUsuarios(container, () => montarUsuarios(container));

    } catch (e: any) {
        container.innerHTML = `<div class="fec-center-wrapper">Erro ao carregar usuários.</div>`;
    }
}

function renderUserCard(u: any): string {
    const isMaster = u.email.toLowerCase() === 'gleidson.fig@gmail.com';
    const isAdmin = u.role === 'admin';
    const isBlocked = u.status === 'blocked';
    const isDeleted = u.status === 'deleted';

    const presenca = calcularStatusPresenca(u.is_online, u.last_seen);

    const roleBadgeText = isAdmin ? 'ADMINISTRADOR' : 'USUÁRIO';
    const roleBadgeClass = isAdmin ? 'role-admin' : 'role-user';

    const searchStr = `${u.nome} ${u.email}`.toLowerCase();
    const presenceKey = presenca.online ? 'online' : 'offline';

    // Badge de status de conta somente para bloqueados ou excluídos para remover redundância visual
    let accountStatusBadge = '';
    if (isDeleted) {
        accountStatusBadge = `<span class="badge-pill status-blocked">EXCLUÍDO</span>`;
    } else if (isBlocked) {
        accountStatusBadge = `<span class="badge-pill status-blocked">BLOQUEADO</span>`;
    }

    return `
        <div class="user-card-item ${isBlocked || isDeleted ? 'card-is-blocked' : ''}" data-search="${searchStr}" data-presence="${presenceKey}">
            <div class="user-avatar-box">
                <img src="${u.avatar}" alt="${u.nome}">
                <span class="avatar-presence-dot ${presenca.online ? 'dot-online' : 'dot-offline'}" title="${presenca.label}"></span>
            </div>
            
            <div class="user-card-info">
                <div class="user-card-name-row">
                    <span class="user-card-name">${u.nome}</span>
                    ${isMaster ? `<span class="badge-master" title="Administrador Mestre"><i data-lucide="crown"></i> MESTRE</span>` : ''}
                </div>
                <span class="user-card-email">${u.email}</span>
                
                <div class="user-badges-row">
                    <span class="badge-pill ${roleBadgeClass}">${roleBadgeText}</span>
                    ${accountStatusBadge}
                    <span class="badge-pill ${presenca.online ? 'presence-badge-online' : 'presence-badge-offline'}" title="Última atividade: ${presenca.label}">
                        <span class="badge-status-dot ${presenca.online ? 'pulse-dot' : ''}"></span>
                        ${presenca.label}
                    </span>
                </div>
            </div>

            ${!isMaster ? `
                <div class="user-card-actions">
                    <button class="user-action-btn btn-toggle-role" data-email="${u.email}" data-role="${u.role}" title="${isAdmin ? 'Rebaixar a Usuário' : 'Promover a Admin'}">
                        <i data-lucide="${isAdmin ? 'user-check' : 'shield-check'}"></i>
                        <span>${isAdmin ? 'Tornar Usuário' : 'Tornar Admin'}</span>
                    </button>

                    <button class="user-action-btn ${isBlocked ? 'btn-unblock' : 'btn-block'}" data-email="${u.email}" data-status="${u.status}" title="${isBlocked ? 'Desbloquear Usuário' : 'Bloquear Acesso'}">
                        <i data-lucide="${isBlocked ? 'unlock' : 'lock'}"></i>
                        <span>${isBlocked ? 'Desbloquear' : 'Bloquear'}</span>
                    </button>

                    <button class="user-action-btn btn-delete-user" data-email="${u.email}" title="Excluir Usuário Definitivamente" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.3);">
                        <i data-lucide="user-x"></i>
                        <span>Excluir</span>
                    </button>
                </div>
            ` : `
                <div class="user-card-actions">
                    <span class="text-protected"><i data-lucide="shield-check"></i> Conta Protegida</span>
                </div>
            `}
        </div>
    `;
}

function vincularEventosUsuarios(container: HTMLElement, onRefresh: () => void) {
    // Alternar Papel (Promover / Rebaixar)
    container.querySelectorAll('.btn-toggle-role').forEach(btn => {
        btn.addEventListener('click', async () => {
            const email = (btn as HTMLElement).dataset.email!;
            const roleAtual = (btn as HTMLElement).dataset.role!;
            const novoPapel = roleAtual === 'admin' ? 'user' : 'admin';

            const confirmou = await modalAlerta.show({
                title: novoPapel === 'admin' ? 'Promover a Administrador?' : 'Rebaixar a Usuário Padrão?',
                message: `Deseja alterar a função de ${email} para ${novoPapel === 'admin' ? 'Administrador' : 'Usuário Padrão'}?`,
                type: 'confirm'
            });

            if (confirmou) {
                modalAlerta.showLoading("Atualizando permissão...");
                try {
                    await aniversarioService.atualizarRoleUsuario(email, novoPapel);
                    modalAlerta.close();
                    onRefresh();
                    modalAlerta.show({ message: `Função de ${email} alterada com sucesso!`, type: 'success' });
                } catch (e: any) {
                    modalAlerta.close();
                    modalAlerta.show({ message: e.message || "Erro ao alterar função.", type: 'error' });
                }
            }
        });
    });

    // Alternar Status (Bloquear / Desbloquear)
    container.querySelectorAll('.btn-block, .btn-unblock').forEach(btn => {
        btn.addEventListener('click', async () => {
            const email = (btn as HTMLElement).dataset.email!;
            const statusAtual = (btn as HTMLElement).dataset.status!;
            const novoStatus = statusAtual === 'blocked' ? 'active' : 'blocked';

            const isBloqueando = novoStatus === 'blocked';

            const confirmou = await modalAlerta.show({
                title: isBloqueando ? 'Bloquear Acesso do Usuário?' : 'Desbloquear Usuário?',
                message: isBloqueando 
                    ? `Deseja suspender temporariamente a conta de ${email}? O usuário não conseguirá acessar o app.` 
                    : `Deseja restaurar o acesso da conta de ${email}?`,
                type: isBloqueando ? 'delete' : 'confirm',
                confirmText: isBloqueando ? 'Sim, Bloquear' : 'Desbloquear'
            });

            if (confirmou) {
                modalAlerta.showLoading(isBloqueando ? "Bloqueando conta..." : "Desbloqueando conta...");
                try {
                    await aniversarioService.alterarStatusUsuario(email, novoStatus);
                    modalAlerta.close();
                    onRefresh();
                    modalAlerta.show({ 
                        message: isBloqueando ? `A conta ${email} foi bloqueada com sucesso.` : `A conta ${email} foi desbloqueada!`, 
                        type: 'success' 
                    });
                } catch (e: any) {
                    modalAlerta.close();
                    modalAlerta.show({ message: e.message || "Erro ao alterar status do usuário.", type: 'error' });
                }
            }
        });
    });

    // Excluir Usuário
    container.querySelectorAll('.btn-delete-user').forEach(btn => {
        btn.addEventListener('click', async () => {
            const email = (btn as HTMLElement).dataset.email!;

            const confirmou = await modalAlerta.show({
                title: 'Excluir Usuário Definitivamente?',
                message: `Deseja remover permanentemente a conta de ${email}? O acesso será revogado e a notificação de e-mail será disparada.`,
                type: 'delete',
                confirmText: 'Sim, Excluir Usuário'
            });

            if (confirmou) {
                modalAlerta.showLoading("Excluindo conta do usuário...");
                try {
                    await aniversarioService.excluirUsuario(email);
                    modalAlerta.close();
                    onRefresh();
                    modalAlerta.show({ 
                        message: `A conta ${email} foi excluída com sucesso e o e-mail de aviso foi enviado automaticamente!`, 
                        type: 'success' 
                    });
                } catch (e: any) {
                    modalAlerta.close();
                    modalAlerta.show({ message: e.message || "Erro ao excluir usuário.", type: 'error' });
                }
            }
        });
    });
}
