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
    container.innerHTML = `
        <div class="perfil-container skeleton-loading-wrapper" style="padding: 20px; max-width: 600px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px;">
            <div style="text-align: center; margin-top: 40px; display: flex; flex-direction: column; align-items: center; gap: 12px;">
                <div class="skeleton-box" style="width: 90px; height: 90px; border-radius: 50%;"></div>
                <div class="skeleton-box" style="width: 180px; height: 26px; border-radius: 8px;"></div>
                <div class="skeleton-box" style="width: 220px; height: 16px; border-radius: 6px;"></div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px;">
                <div class="skeleton-box" style="height: 90px; border-radius: 20px;"></div>
                <div class="skeleton-box" style="height: 90px; border-radius: 20px;"></div>
            </div>
            <div class="skeleton-box" style="height: 200px; border-radius: 24px; margin-top: 10px;"></div>
        </div>
    `;

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

import { abrirCropperModal } from '../utils/imageCropper';

// MODAL PARA ALTERAR AVATAR (REDESENHADO COM CROPPER & PREVIEW INTEGRADO)
function abrirModalAlterarAvatar(avatarAtual: string, onSave: (novoAvatar: string) => void) {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'fec-modal-overlay active perfil-avatar-modal-overlay';
    modalOverlay.style.zIndex = '15000';

    const avataresOpcoes = [
        'https://api.dicebear.com/7.x/bottts/svg?seed=Felix',
        'https://api.dicebear.com/7.x/bottts/svg?seed=Aneka',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=Maya',
        'https://api.dicebear.com/7.x/micah/svg?seed=Alex'
    ];

    let urlSelecionada = avatarAtual;

    modalOverlay.innerHTML = `
        <div class="fec-modal-box modal-type-info perfil-avatar-modal-box">
            <div class="perfil-avatar-modal-header">
                <div class="perfil-avatar-modal-icon">
                    <i data-lucide="camera"></i>
                </div>
                <div class="perfil-avatar-modal-titles">
                    <h3 class="perfil-avatar-modal-title">Escolher Foto de Perfil</h3>
                    <p class="perfil-avatar-modal-subtitle">Toque no avatar para enviar foto ou selecione uma ilustração</p>
                </div>
            </div>

            <!-- HERO PREVIEW INTERATIVO (CLIQUE PARA ENVIAR FOTO) -->
            <div class="perfil-avatar-preview-section">
                <div class="perfil-avatar-preview-hero" id="btnUploadAvatarHero" title="Clique para enviar ou cortar uma foto">
                    <img id="imgAvatarPreviewModal" src="${avatarAtual}" alt="Preview do Avatar">
                    <div class="preview-hero-overlay">
                        <i data-lucide="camera"></i>
                        <span>Alterar Foto</span>
                    </div>
                </div>
                <span class="preview-hero-hint">
                    <i data-lucide="sparkles"></i> Clique no avatar para enviar da galeria/câmera
                </span>
                <input type="file" id="inputFotoPerfilModal" accept="image/*" style="display: none;">
            </div>

            <!-- GRID DE ILUSTRAÇÕES / PRESETS -->
            <div class="perfil-avatar-preset-label">
                <span>Ou escolha uma ilustração:</span>
            </div>

            <div class="perfil-avatar-preset-grid">
                ${avataresOpcoes.map(url => `
                    <div class="avatar-preset-item ${avatarAtual === url ? 'active' : ''}" data-url="${url}" title="Selecionar ilustração">
                        <img src="${url}">
                    </div>
                `).join('')}
            </div>

            <!-- ENTRADA DE URL OPCIONAL -->
            <div class="fec-input-group-line perfil-avatar-url-input">
                <i data-lucide="link-2"></i>
                <input type="text" class="catg-input-text" id="inUrlAvatar" placeholder="Cole a URL da imagem (https://...)" value="${avatarAtual.startsWith('http') && !avatarAtual.startsWith('data:') ? avatarAtual : ''}">
            </div>

            <div class="fec-modal-footer">
                <button class="btn-modal btn-modal-secondary" id="btnCancelAvatar">Cancelar</button>
                <button class="btn-modal btn-modal-primary" id="btnConfirmAvatar">
                    <i data-lucide="check"></i> Salvar Foto
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modalOverlay);
    createIcons({ icons: ICON_MAP, root: modalOverlay });

    const imgPreviewModal = modalOverlay.querySelector('#imgAvatarPreviewModal') as HTMLImageElement;
    const inputUrl = modalOverlay.querySelector('#inUrlAvatar') as HTMLInputElement;
    const btnUploadHero = modalOverlay.querySelector('#btnUploadAvatarHero');
    const inputFotoFile = modalOverlay.querySelector('#inputFotoPerfilModal') as HTMLInputElement;

    // Clique no avatar aciona o input de arquivo
    btnUploadHero?.addEventListener('click', () => {
        inputFotoFile.click();
    });

    // Atualiza preview ao digitar URL personalizada
    inputUrl?.addEventListener('input', () => {
        const urlTyped = inputUrl.value.trim();
        if (urlTyped) {
            urlSelecionada = urlTyped;
            imgPreviewModal.src = urlTyped;
            modalOverlay.querySelectorAll('.avatar-preset-item').forEach(i => i.classList.remove('active'));
        }
    });

    // UPLOAD E ACIONAMENTO DO CROPPER
    inputFotoFile?.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
            abrirCropperModal(file, {
                title: "Ajustar Foto do Perfil",
                outputWidth: 500,
                outputHeight: 500,
                onCrop: (croppedBase64) => {
                    urlSelecionada = croppedBase64;
                    imgPreviewModal.src = croppedBase64;
                    inputUrl.value = ""; // Limpa a URL de texto pois agora é imagem cortada
                    modalOverlay.querySelectorAll('.avatar-preset-item').forEach(i => i.classList.remove('active'));
                },
                onCancel: () => {
                    inputFotoFile.value = '';
                }
            });
            inputFotoFile.value = '';
        }
    });

    // SELEÇÃO DE AVATAR PRESET
    modalOverlay.querySelectorAll('.avatar-preset-item').forEach(item => {
        item.addEventListener('click', () => {
            modalOverlay.querySelectorAll('.avatar-preset-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            urlSelecionada = (item as HTMLElement).dataset.url || avatarAtual;
            imgPreviewModal.src = urlSelecionada;
            inputUrl.value = urlSelecionada.startsWith('http') ? urlSelecionada : '';
        });
    });

    modalOverlay.querySelector('#btnCancelAvatar')?.addEventListener('click', () => modalOverlay.remove());
    modalOverlay.querySelector('#btnConfirmAvatar')?.addEventListener('click', () => {
        const val = inputUrl.value.trim() || urlSelecionada;
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
