import '../styles/cadastro.css';
import { aniversarioService } from '../services/aniversarioService';
import { Aniversario, Categoria } from '../types';
import { createIcons, icons } from 'lucide'; 

export async function montarCadastro(container: HTMLElement, idEdicao?: string) {
    container.innerHTML = `<div class="fec-center-wrapper"><div class="fec-loader-minimal">Preparando...</div></div>`;

    try {
        const [categorias, todos]: [Categoria[], Aniversario[]] = await Promise.all([
            aniversarioService.listarCategorias(),
            idEdicao ? aniversarioService.listarTodos() : Promise.resolve([])
        ]);

        const dadosEdicao = idEdicao ? todos.find(t => t.id === idEdicao) || null : null;
        const ehEdicao = !!(idEdicao && dadosEdicao);
        
        // Estado inicial da imagem
        let imagemAtual = (dadosEdicao as any)?.imagem_url || '';

        container.innerHTML = `
            <div class="fec-center-wrapper">
                <div class="fec-form-wrapper">
                    <button class="fec-btn-close" id="btnFecharForm"><i data-lucide="x"></i></button>

                    <header class="fec-form-header">
                        <div class="avatar-selection-zone">
                            <div class="avatar-display" id="avatarPreview">
                                ${imagemAtual 
                                    ? `<img src="${imagemAtual}" class="img-preview-fec">` 
                                    : `<i data-lucide="user" class="avatar-icon-fec"></i>`}
                            </div>
                            <div class="avatar-btns-row">
                                <button type="button" class="btn-media-fec" id="btnGaleriaAvatar">
                                    <i data-lucide="layout-grid"></i> AVATAR
                                </button>
                                <label class="btn-media-fec" for="inputFoto">
                                    <i data-lucide="camera"></i> FOTO
                                    <input type="file" id="inputFoto" accept="image/*" hidden>
                                </label>
                            </div>
                        </div>
                    </header>

                    <form id="formAniversario" class="fec-form-main">
                        <input type="hidden" id="imagem_url" value="${imagemAtual}">
                        
                        <div class="fec-input-group-line">
                            <i data-lucide="user"></i>
                            <input type="text" id="nome" placeholder="Nome completo" required value="${dadosEdicao?.nome || ''}">
                        </div>

                        <div class="fec-input-group-line">
                            <i data-lucide="smile"></i>
                            <input type="text" id="apelido" placeholder="Apelido" value="${(dadosEdicao as any)?.apelido || ''}">
                        </div>

                        <div class="fec-input-group-line">
                             <i data-lucide="heart"></i>
                             <input type="text" id="frase_exibicao" placeholder="Mensagem carinhosa" value="${dadosEdicao?.frase_exibicao || ''}">
                        </div>

                        <div class="fec-input-group-line">
                            <i data-lucide="cake"></i>
                            <div class="fec-column-input">
                                <label class="fec-mini-label">Data de Nascimento</label>
                                <input type="date" id="data_nascimento" required value="${dadosEdicao?.data_nascimento || ''}">
                            </div>
                        </div>

                        <div class="fec-input-group-line">
                             <i data-lucide="bookmark"></i>
                             <select id="categoria_id" required>
                                <option value="" disabled ${!dadosEdicao ? 'selected' : ''}>Selecione o grupo</option>
                                <option value="GO_CATEGORIAS">⚙️ ORGANIZAR GRUPOS</option>
                                ${categorias.map(cat => `
                                    <option value="${cat.id}" ${dadosEdicao?.categoria_id === cat.id ? 'selected' : ''}>${cat.nome}</option>
                                `).join('')}
                             </select>
                        </div>

                        <div class="fec-action-footer">
                            <button type="submit" class="btn-fec-submit" id="btnSubmit">
                                ${ehEdicao ? 'SALVAR ALTERAÇÕES' : 'CONFIRMAR CADASTRO'}
                            </button>
                            <button type="button" class="btn-fec-cancel" id="btnSecondaryAction">
                                ${ehEdicao ? 'DESCARTAR' : 'LIMPAR'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Modal de Galeria de Avatares (Oculto inicialmente) -->
            <div id="modalAvatares" class="fec-modal-overlay" style="display:none">
                <div class="fec-modal-content">
                    <h3>Escolha um Avatar</h3>
                    <div class="avatar-grid">
                        ${[1,2,3,4,5,6].map(n => `<img src="assets/avatars/av-${n}.png" class="avatar-option" data-url="assets/avatars/av-${n}.png">`).join('')}
                    </div>
                    <button type="button" class="btn-close-modal" id="btnCloseModal">Fechar</button>
                </div>
            </div>
        `;

        const form = document.getElementById('formAniversario') as HTMLFormElement;
        const preview = document.getElementById('avatarPreview') as HTMLElement;
        const inputHidden = document.getElementById('imagem_url') as HTMLInputElement;

        // Lógica de Upload de Foto (Base64 para exemplo simples)
        document.getElementById('inputFoto')?.addEventListener('change', (e: any) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const url = event.target?.result as string;
                    inputHidden.value = url;
                    preview.innerHTML = `<img src="${url}" class="img-preview-fec">`;
                };
                reader.readAsDataURL(file);
            }
        });

        // Lógica da Galeria de Avatares
        const modal = document.getElementById('modalAvatares') as HTMLElement;
        document.getElementById('btnGaleriaAvatar')?.addEventListener('click', () => modal.style.display = 'flex');
        document.getElementById('btnCloseModal')?.addEventListener('click', () => modal.style.display = 'none');

        document.querySelectorAll('.avatar-option').forEach(img => {
            img.addEventListener('click', (e: any) => {
                const url = e.target.getAttribute('data-url');
                inputHidden.value = url;
                preview.innerHTML = `<img src="${url}" class="img-preview-fec">`;
                modal.style.display = 'none';
            });
        });

        const irParaDetalhes = () => {
            if (typeof (window as any).navegar === 'function') (window as any).navegar('detalhes', idEdicao);
            else window.location.hash = `#detalhes?id=${idEdicao}`;
        };

        document.getElementById('btnSecondaryAction')?.addEventListener('click', () => {
            if (ehEdicao) irParaDetalhes(); else form.reset();
        });

        form.onsubmit = async (e) => {
            e.preventDefault();
            const btnSubmit = document.getElementById('btnSubmit') as HTMLButtonElement;
            btnSubmit.disabled = true;

            const dados = {
                nome: (document.getElementById('nome') as HTMLInputElement).value,
                apelido: (document.getElementById('apelido') as HTMLInputElement).value,
                frase_exibicao: (document.getElementById('frase_exibicao') as HTMLInputElement).value,
                data_nascimento: (document.getElementById('data_nascimento') as HTMLInputElement).value,
                imagem_url: inputHidden.value,
                categoria_id: (document.getElementById('categoria_id') as HTMLSelectElement).value
            };

            try {
                if (ehEdicao && idEdicao) {
                    await aniversarioService.atualizar(idEdicao, dados);
                    irParaDetalhes();
                } else {
                    await aniversarioService.adicionar(dados);
                    form.reset();
                    alert("✅ Cadastrado!");
                }
            } catch (err) { alert("❌ Erro ao salvar."); }
            finally { btnSubmit.disabled = false; createIcons({ icons }); }
        };

        createIcons({ icons });
    } catch (error) { container.innerHTML = `Erro ao carregar.`; }
}