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
        let imagemSelecionada = (dadosEdicao as any)?.imagem_url || '';

        const avataresSementes = ['Mia', 'Jack', 'Aria', 'Noah', 'Zoe', 'Max', 'Luna', 'Caleb', 'Iris'];

        container.innerHTML = `
            <div class="fec-center-wrapper">
                <div class="fec-form-wrapper">
                    <!-- BOTÃO VOLTAR COM ESTILO MELHORADO -->
                    <button class="fec-btn-back-nav" id="btnVoltarForm" title="Voltar">
                        <i data-lucide="chevron-left"></i>
                    </button>

                    <header class="fec-form-header">
                        <div class="avatar-squircle-fec" id="avatarPreview">
                            ${imagemSelecionada 
                                ? `<img src="${imagemSelecionada}" class="img-preview-fec">` 
                                : `<i data-lucide="user" class="avatar-icon-fec"></i>`}
                        </div>
                        <div class="avatar-action-btns">
                            <button type="button" class="btn-fec-outline-sm" id="btnAbrirGaleria">
                                <i data-lucide="layout-grid"></i> Avatares
                            </button>
                            <label class="btn-fec-outline-sm" for="inputFoto">
                                <i data-lucide="camera"></i> Foto
                                <input type="file" id="inputFoto" accept="image/*" hidden>
                            </label>
                        </div>
                    </header>

                    <form id="formAniversario" class="fec-form-main">
                        <input type="hidden" id="imagem_url" value="${imagemSelecionada}">
                        
                        <div class="fec-input-group-line">
                            <i data-lucide="user"></i>
                            <input type="text" id="nome" placeholder="Nome completo" required value="${dadosEdicao?.nome || ''}">
                        </div>

                        <div class="fec-input-group-line">
                            <i data-lucide="smile"></i>
                            <input type="text" id="apelido" placeholder="Apelido" value="${(dadosEdicao as any)?.apelido || ''}">
                        </div>

                        <!-- CAMPO WHATSAPP MAPEADO PARA A COLUNA TELEFONE -->
                        <div class="fec-input-group-line">
                            <i data-lucide="phone"></i>
                            <input type="tel" id="telefone" placeholder="WhatsApp (DDD + Número)" value="${(dadosEdicao as any)?.telefone || ''}">
                        </div>

                        <div class="fec-input-group-line">
                            <i data-lucide="quote"></i>
                            <input type="text" id="frase_exibicao" placeholder="Frase de exibição" value="${(dadosEdicao as any)?.frase_exibicao || ''}">
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
                                <option value="NOVA_CATEGORIA" style="font-weight: bold; color: #e63946;">+ Adicionar categoria</option>
                                
                                ${categorias.map(cat => `<option value="${cat.id}" ${dadosEdicao?.categoria_id === cat.id ? 'selected' : ''}>${cat.nome}</option>`).join('')}
                             </select>
                        </div>

                        <div class="fec-action-footer">
                            <button type="submit" class="btn-fec-submit" id="btnSubmit">
                                ${ehEdicao ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                            </button>
                            <button type="button" class="btn-fec-cancel" id="btnSecondaryAction">
                                ${ehEdicao ? 'Descartar' : 'Limpar'}
                            </button>
                        </div>
                    </form>
                </div>

                <div id="avatarDrawer" class="avatar-drawer">
                    <div class="drawer-handle"></div>
                    <div class="drawer-header">Escolha seu Avatar</div>
                    <div class="avatar-grid-scroll">
                        <div class="avatar-circle-option" data-url="">
                             <i data-lucide="user-minus"></i>
                        </div>
                        ${avataresSementes.map(seed => {
                            const url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
                            return `<img src="${url}" class="avatar-circle-option" data-url="${url}">`;
                        }).join('')}
                    </div>
                </div>
                <div id="drawerOverlay" class="drawer-overlay"></div>
            </div>
        `;

        // LÓGICA DE NAVEGAÇÃO
        const selectCategoria = document.getElementById('categoria_id') as HTMLSelectElement;
        selectCategoria.addEventListener('change', () => {
            if (selectCategoria.value === "NOVA_CATEGORIA") {
                if (typeof (window as any).navegar === 'function') {
                    (window as any).navegar('categorias'); 
                } else {
                    window.location.hash = '#categorias';
                }
            }
        });

        // --- LÓGICA DE AVATARES E UPLOAD ---
        const drawer = document.getElementById('avatarDrawer') as HTMLElement;
        const overlay = document.getElementById('drawerOverlay') as HTMLElement;
        const preview = document.getElementById('avatarPreview') as HTMLElement;
        const inputHidden = document.getElementById('imagem_url') as HTMLInputElement;

        const toggleDrawer = (open: boolean) => {
            drawer.classList.toggle('active', open);
            overlay.classList.toggle('active', open);
        };

        document.getElementById('btnAbrirGaleria')?.addEventListener('click', () => toggleDrawer(true));
        overlay.addEventListener('click', () => toggleDrawer(false));

        document.querySelectorAll('.avatar-circle-option').forEach(el => {
            el.addEventListener('click', () => {
                const url = el.getAttribute('data-url') || '';
                inputHidden.value = url;
                preview.innerHTML = url 
                    ? `<img src="${url}" class="img-preview-fec">` 
                    : `<i data-lucide="user" class="avatar-icon-fec"></i>`;
                toggleDrawer(false);
                createIcons({ icons });
            });
        });

        document.getElementById('inputFoto')?.addEventListener('change', (e: any) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const url = ev.target?.result as string;
                    inputHidden.value = url;
                    preview.innerHTML = `<img src="${url}" class="img-preview-fec">`;
                };
                reader.readAsDataURL(file);
            }
        });

        const irParaDetalhes = () => {
            if (typeof (window as any).navegar === 'function') (window as any).navegar('detalhes', idEdicao);
            else window.location.hash = `#detalhes?id=${idEdicao}`;
        };

        // LÓGICA DO BOTÃO VOLTAR
        document.getElementById('btnVoltarForm')?.addEventListener('click', () => {
            if (ehEdicao) irParaDetalhes();
            else window.history.back();
        });

        document.getElementById('btnSecondaryAction')?.addEventListener('click', () => {
            if (ehEdicao) irParaDetalhes(); else (document.getElementById('formAniversario') as HTMLFormElement).reset();
        });

        (document.getElementById('formAniversario') as HTMLFormElement).onsubmit = async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnSubmit') as HTMLButtonElement;
            btn.disabled = true;
            try {
                const dados = {
                    nome: (document.getElementById('nome') as HTMLInputElement).value,
                    apelido: (document.getElementById('apelido') as HTMLInputElement).value,
                    telefone: (document.getElementById('telefone') as HTMLInputElement).value, // Coluna correta
                    frase_exibicao: (document.getElementById('frase_exibicao') as HTMLInputElement).value,
                    data_nascimento: (document.getElementById('data_nascimento') as HTMLInputElement).value,
                    imagem_url: inputHidden.value,
                    categoria_id: (document.getElementById('categoria_id') as HTMLSelectElement).value
                };
                
                if (dados.categoria_id === "NOVA_CATEGORIA") {
                    alert("Por favor, selecione uma categoria válida.");
                    btn.disabled = false;
                    return;
                }

                if (ehEdicao && idEdicao) {
                    await aniversarioService.atualizar(idEdicao, dados);
                    irParaDetalhes();
                } else {
                    await aniversarioService.adicionar(dados);
                    if (typeof (window as any).navegar === 'function') (window as any).navegar('list');
                    else window.location.hash = '#listagem';
                }
            } catch (err) { 
                console.error(err);
                alert("Erro ao salvar. Verifique se a coluna 'telefone' existe no banco."); 
            }
            finally { btn.disabled = false; }
        };

        createIcons({ icons });
    } catch (error) { container.innerHTML = "Erro ao carregar."; }
}