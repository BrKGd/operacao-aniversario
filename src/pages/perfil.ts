import '../styles/perfil.css';
import { aniversarioService } from '../services/aniversarioService';
import { modalAlerta } from '../utils/modalAlertas';
import { auth } from '../config/firebase';
import { signOut } from 'firebase/auth';
import { 
    createIcons, 
    User, 
    Mail, 
    Calendar, 
    ShieldCheck, 
    KeyRound, 
    LogOut, 
    ChevronLeft, 
    Pencil, 
    Sparkles, 
    Camera, 
    Check, 
    RotateCcw,
    Users,
    Tag,
    Star,
    Crown
} from 'lucide';

const ICON_MAP = { 
    User, Mail, Calendar, ShieldCheck, KeyRound, LogOut, ChevronLeft, 
    Pencil, Sparkles, Camera, Check, RotateCcw, Users, Tag, Star, Crown
};

export async function montarPerfil(container: HTMLElement) {
    container.innerHTML = `<div class="fec-center-wrapper"><div class="fec-loader-minimal">Carregando perfil...</div></div>`;

    try {
        const perfil = await aniversarioService.getPerfilUsuario();
        const aniversarios = await aniversarioService.listarTodos();
        const categorias = await aniversarioService.listarCategorias();

        if (!perfil) {
            container.innerHTML = `<div class="fec-center-wrapper">Nenhum usuário conectado.</div>`;
            return;
        }

        const dataFormatada = perfil.created_at 
            ? new Date(perfil.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
            : 'Data não informada';

        container.innerHTML = `
            <div class="perfil-container">
                <!-- BOTÃO VOLTAR -->
                <button class="perfil-btn-back" id="btnVoltarPerfil" title="Voltar">
                    <i data-lucide="chevron-left"></i>
                </button>

                <!-- HEADER DO PERFIL -->
                <div class="perfil-header-card">
                    <div class="perfil-avatar-wrapper">
                        <img src="${perfil.avatar}" alt="${perfil.nome}" class="perfil-avatar-img" id="imgAvatarPerfil">
                        <button class="perfil-avatar-edit-btn" id="btnEditAvatar" title="Alterar Foto">
                            <i data-lucide="camera"></i>
                        </button>
                    </div>
                    <h2 class="perfil-nome" id="textNomePerfil">${perfil.nome}</h2>
                    <span class="perfil-email"><i data-lucide="mail"></i> ${perfil.email}</span>
                    <span class="perfil-badge-membro"><i data-lucide="shield-check"></i> Membro desde ${dataFormatada}</span>
                </div>

                <!-- CARDS DE ESTATÍSTICAS DA CONTA (BENTO GRID) -->
                <div class="perfil-stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon blue">
                            <i data-lucide="users"></i>
                        </div>
                        <div class="stat-info">
                            <span class="stat-number">${aniversarios.length}</span>
                            <span class="stat-label">Aniversariantes</span>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon gold">
                            <i data-lucide="tag"></i>
                        </div>
                        <div class="stat-info">
                            <span class="stat-number">${categorias.length}</span>
                            <span class="stat-label">Categorias</span>
                        </div>
                    </div>
                </div>

                <!-- OPÇÕES E AÇÕES DO PERFIL -->
                <div class="perfil-actions-list">
                    ${perfil.isAdmin ? `
                        <div class="perfil-action-card" id="cardGerenciarUsuarios" style="border-color: rgba(245, 158, 11, 0.4); background: rgba(245, 158, 11, 0.05);">
                            <div class="action-icon key" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b;"><i data-lucide="crown"></i></div>
                            <div class="action-info">
                                <span class="action-title" style="color: #d97706;">Painel do Administrador</span>
                                <span class="action-sub">Gerenciar usuários, papéis e bloqueios</span>
                            </div>
                            <i data-lucide="pencil" class="action-arrow"></i>
                        </div>
                    ` : ''}

                    <div class="perfil-action-card" id="cardEditNome">
                        <div class="action-icon"><i data-lucide="user"></i></div>
                        <div class="action-info">
                            <span class="action-title">Editar Nome de Exibição</span>
                            <span class="action-sub">${perfil.nome}</span>
                        </div>
                        <i data-lucide="pencil" class="action-arrow"></i>
                    </div>

                    <div class="perfil-action-card" id="cardAlterarSenha">
                        <div class="action-icon key"><i data-lucide="key-round"></i></div>
                        <div class="action-info">
                            <span class="action-title">Alterar Senha de Acesso</span>
                            <span class="action-sub">Redefinir credencial da sua conta</span>
                        </div>
                        <i data-lucide="pencil" class="action-arrow"></i>
                    </div>
                </div>

                <!-- BOTÃO DE LOGOUT -->
                <button class="perfil-btn-logout" id="btnSairConta">
                    <i data-lucide="log-out"></i> Encerrar Sessão
                </button>
            </div>
        `;

        createIcons({ icons: ICON_MAP, root: container });

        // Voltar
        document.getElementById('btnVoltarPerfil')?.addEventListener('click', () => {
            if (typeof (window as any).navegar === 'function') {
                (window as any).navegar('dashboard');
            } else {
                window.location.hash = '#dashboard';
            }
        });

        // Ir para Painel Admin de Usuarios
        document.getElementById('cardGerenciarUsuarios')?.addEventListener('click', () => {
            if (typeof (window as any).navegar === 'function') {
                (window as any).navegar('usuarios');
            } else {
                window.location.hash = '#usuarios';
            }
        });

        // Editar Foto / Avatar
        document.getElementById('btnEditAvatar')?.addEventListener('click', () => {
            abrirModalAlterarAvatar(perfil.avatar, async (novoAvatar) => {
                modalAlerta.showLoading("Atualizando avatar...");
                try {
                    await aniversarioService.atualizarPerfilUsuario({ avatar: novoAvatar });
                    modalAlerta.close();
                    montarPerfil(container);
                    modalAlerta.show({ message: "Avatar atualizado!", type: "success" });
                } catch (e) {
                    modalAlerta.close();
                    modalAlerta.show({ message: "Erro ao atualizar avatar.", type: "error" });
                }
            });
        });

        // Editar Nome
        document.getElementById('cardEditNome')?.addEventListener('click', () => {
            abrirModalAlterarNome(perfil.nome, async (novoNome) => {
                modalAlerta.showLoading("Atualizando nome...");
                try {
                    await aniversarioService.atualizarPerfilUsuario({ nome: novoNome });
                    modalAlerta.close();
                    montarPerfil(container);
                    modalAlerta.show({ message: "Nome atualizado!", type: "success" });
                } catch (e) {
                    modalAlerta.close();
                    modalAlerta.show({ message: "Erro ao atualizar nome.", type: "error" });
                }
            });
        });

        // Alterar Senha
        document.getElementById('cardAlterarSenha')?.addEventListener('click', () => {
            abrirModalAlterarSenha();
        });

        // Encerrar Sessão (Logout)
        document.getElementById('btnSairConta')?.addEventListener('click', async () => {
            const confirmou = await modalAlerta.show({
                title: "Encerrar Sessão?",
                message: "Deseja realmente sair da sua conta?",
                type: "confirm",
                confirmText: "Sim, Sair",
                cancelText: "Permanecer"
            });

            if (confirmou) {
                modalAlerta.showLoading("Saindo...");
                aniversarioService.invalidarCache();
                await signOut(auth);
                modalAlerta.close();
                window.location.reload();
            }
        });

    } catch (e) {
        container.innerHTML = `<div class="fec-center-wrapper">Erro ao carregar perfil.</div>`;
    }
}

// MODAL PARA EDITAR NOME
function abrirModalAlterarNome(nomeAtual: string, onSave: (novoNome: string) => void) {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'fec-modal-overlay active';
    
    modalOverlay.innerHTML = `
        <div class="fec-modal-box modal-type-info">
            <div class="fec-modal-icon info">
                <i data-lucide="user"></i>
            </div>
            <div class="fec-modal-title">Editar Nome</div>
            <div class="fec-modal-message">Como você gostaria de ser chamado?</div>
            
            <input type="text" class="catg-input-text" id="inNovoNomePerfil" value="${nomeAtual}" placeholder="Digite seu nome..." style="margin-bottom: 20px;">

            <div class="fec-modal-footer">
                <button class="btn-modal btn-modal-secondary" id="btnCancelNome">Cancelar</button>
                <button class="btn-modal btn-modal-primary" id="btnConfirmNome">Salvar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modalOverlay);
    createIcons({ icons: ICON_MAP, root: modalOverlay });

    modalOverlay.querySelector('#btnCancelNome')?.addEventListener('click', () => modalOverlay.remove());
    modalOverlay.querySelector('#btnConfirmNome')?.addEventListener('click', () => {
        const input = modalOverlay.querySelector('#inNovoNomePerfil') as HTMLInputElement;
        const val = input.value.trim();
        if (val) {
            modalOverlay.remove();
            onSave(val);
        }
    });
}

// MODAL PARA ALTERAR AVATAR
function abrirModalAlterarAvatar(avatarAtual: string, onSave: (novoAvatar: string) => void) {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'fec-modal-overlay active';

    const avataresOpcoes = [
        'https://api.dicebear.com/7.x/bottts/svg?seed=Felix',
        'https://api.dicebear.com/7.x/bottts/svg?seed=Aneka',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=Maya',
        'https://api.dicebear.com/7.x/micah/svg?seed=Alex'
    ];
    
    modalOverlay.innerHTML = `
        <div class="fec-modal-box modal-type-info" style="max-width: 440px;">
            <div class="fec-modal-icon info">
                <i data-lucide="camera"></i>
            </div>
            <div class="fec-modal-title">Escolher Avatar</div>
            <div class="fec-modal-message">Selecione uma ilustração ou insira uma URL de imagem</div>

            <div class="perfil-avatar-preset-grid">
                ${avataresOpcoes.map(url => `
                    <div class="avatar-preset-item ${avatarAtual === url ? 'active' : ''}" data-url="${url}">
                        <img src="${url}">
                    </div>
                `).join('')}
            </div>

            <input type="text" class="catg-input-text" id="inUrlAvatar" placeholder="OU cole a URL de uma foto (https://...)" value="${avatarAtual.startsWith('http') ? avatarAtual : ''}" style="margin-bottom: 20px; font-size: 0.82rem;">

            <div class="fec-modal-footer">
                <button class="btn-modal btn-modal-secondary" id="btnCancelAvatar">Cancelar</button>
                <button class="btn-modal btn-modal-primary" id="btnConfirmAvatar">Salvar Foto</button>
            </div>
        </div>
    `;

    document.body.appendChild(modalOverlay);
    createIcons({ icons: ICON_MAP, root: modalOverlay });

    let urlSelecionada = avatarAtual;

    modalOverlay.querySelectorAll('.avatar-preset-item').forEach(item => {
        item.addEventListener('click', () => {
            modalOverlay.querySelectorAll('.avatar-preset-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            urlSelecionada = (item as HTMLElement).dataset.url || avatarAtual;
            (modalOverlay.querySelector('#inUrlAvatar') as HTMLInputElement).value = urlSelecionada;
        });
    });

    modalOverlay.querySelector('#btnCancelAvatar')?.addEventListener('click', () => modalOverlay.remove());
    modalOverlay.querySelector('#btnConfirmAvatar')?.addEventListener('click', () => {
        const input = modalOverlay.querySelector('#inUrlAvatar') as HTMLInputElement;
        const val = input.value.trim() || urlSelecionada;
        if (val) {
            modalOverlay.remove();
            onSave(val);
        }
    });
}

// MODAL PARA ALTERAR SENHA
function abrirModalAlterarSenha() {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'fec-modal-overlay active';
    
    modalOverlay.innerHTML = `
        <div class="fec-modal-box modal-type-confirm">
            <div class="fec-modal-icon confirm">
                <i data-lucide="key-round"></i>
            </div>
            <div class="fec-modal-title">Alterar Senha</div>
            <div class="fec-modal-message">Digite sua nova senha de acesso</div>

            <input type="password" class="catg-input-text" id="inNovaSenhaPerfil" placeholder="Nova senha (mínimo 6 caracteres)..." style="margin-bottom: 12px;">
            <input type="password" class="catg-input-text" id="inConfirmaNovaSenhaPerfil" placeholder="Confirme a nova senha..." style="margin-bottom: 20px;">

            <div class="fec-modal-footer">
                <button class="btn-modal btn-modal-secondary" id="btnCancelSenha">Cancelar</button>
                <button class="btn-modal btn-modal-primary btn-confirm" id="btnConfirmSenha">Atualizar Senha</button>
            </div>
        </div>
    `;

    document.body.appendChild(modalOverlay);
    createIcons({ icons: ICON_MAP, root: modalOverlay });

    modalOverlay.querySelector('#btnCancelSenha')?.addEventListener('click', () => modalOverlay.remove());
    modalOverlay.querySelector('#btnConfirmSenha')?.addEventListener('click', async () => {
        const senha1 = (modalOverlay.querySelector('#inNovaSenhaPerfil') as HTMLInputElement).value.trim();
        const senha2 = (modalOverlay.querySelector('#inConfirmaNovaSenhaPerfil') as HTMLInputElement).value.trim();

        if (!senha1 || senha1.length < 6) {
            return modalAlerta.show({ message: "A senha deve conter no mínimo 6 caracteres.", type: "warning" });
        }
        if (senha1 !== senha2) {
            return modalAlerta.show({ message: "As senhas não coincidem. Tente novamente.", type: "warning" });
        }

        modalAlerta.showLoading("Atualizando senha...");
        try {
            await aniversarioService.atualizarSenha(senha1);
            modalAlerta.close();
            modalOverlay.remove();
            modalAlerta.show({ message: "Senha alterada com sucesso!", type: "success" });
        } catch (e: any) {
            modalAlerta.close();
            modalAlerta.show({ message: e.message || "Erro ao atualizar senha.", type: "error" });
        }
    });
}
