import '../styles/cadastro.css';
import { aniversarioService } from '../services/aniversarioService';
import { Aniversario, Categoria } from '../types';
import { createIcons, icons } from 'lucide';
import * as XLSX from 'xlsx';

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

        const formatarDataParaISO = (d: any): string => {
            if (!d) return '';
            const dataStr = String(d).trim();
            const regexBR = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;
            const matchBR = dataStr.match(regexBR);
            if (matchBR) {
                return `${matchBR[3]}-${matchBR[2]!.padStart(2, '0')}-${matchBR[1]!.padStart(2, '0')}`;
            }
            const regexISO = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/;
            const matchISO = dataStr.match(regexISO);
            if (matchISO) {
                return `${matchISO[1]}-${matchISO[2]!.padStart(2, '0')}-${matchISO[3]!.padStart(2, '0')}`;
            }
            return dataStr;
        };

        const avataresSementes = [
            'Easton','Every','Avery','Jordan','Parker','Quinn','Rowan','Skyler','Emerson','Finley',
            'Charlie','Dakota','Harper','Reese','Riley','Sawyer','Taylor','Alex','Blake','Cameron',
            'Drew','Elliot','Hayden','Jamie','Kai','Logan','Morgan','Noel','River','Sage',
            'Shawn','Terry','Tyler','Adrian','Ashton','Bailey','Casey','Corey','Devon','Eden',
            'Frankie','Gray','Hunter','Indigo','Jesse','Kendall','Lane','Micah','Nico','Oakley'
        ];

        container.innerHTML = `
            <div class="fec-center-wrapper">
                <div class="fec-form-wrapper">
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

                        <div class="fec-import-actions">
                            <span id="btnDownloadModelo" class="fec-import-icon-btn" title="${ehEdicao ? 'Exportar dados' : 'Baixar planilha modelo (.xlsx)'}">
                                <i data-lucide="download"></i>
                            </span>
                            <label for="inputPlanilha" class="fec-import-icon-btn" title="Selecionar planilha">
                                <i data-lucide="paperclip"></i>
                                <input type="file" id="inputPlanilha" accept=".xlsx, .xls" hidden>
                            </label>
                        </div>

                        <div class="fec-input-group-line">
                            <i data-lucide="user"></i>
                            <input type="text" id="nome" placeholder="Nome completo" required value="${dadosEdicao?.nome || ''}">
                        </div>

                        <div class="fec-input-group-line">
                            <i data-lucide="smile"></i>
                            <input type="text" id="apelido" placeholder="Apelido" value="${(dadosEdicao as any)?.apelido || ''}">
                        </div>

                        <div class="fec-input-group-line">
                            <i data-lucide="phone"></i>
                            <input type="tel" id="telefone" placeholder="(00) 00000-0000" maxlength="15" value="${(dadosEdicao as any)?.telefone || ''}">
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
                        <div class="avatar-circle-option" data-url=""><i data-lucide="user-minus"></i></div>
                        ${avataresSementes.map(seed => {
                            const url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
                            return `<img src="${url}" class="avatar-circle-option" data-url="${url}">`;
                        }).join('')}
                    </div>
                </div>
                <div id="drawerOverlay" class="drawer-overlay"></div>
            </div>
        `;

        const inputTelefone = document.getElementById('telefone') as HTMLInputElement;
        const selectCategoria = document.getElementById('categoria_id') as HTMLSelectElement;

        // --- MÁSCARA DE TELEFONE (Corrigido para evitar o erro de 'e' não lido) ---
        inputTelefone.addEventListener('input', () => {
            let v = inputTelefone.value.replace(/\D/g, ""); // Remove letras e caracteres
            if (v.length > 11) v = v.substring(0, 11); 

            if (v.length > 0) {
                v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
                v = v.replace(/(\d{5})(\d)/, "$1-$2");
            }
            inputTelefone.value = v;
        });

        // --- DOWNLOAD / EXPORTAÇÃO ---
        document.getElementById('btnDownloadModelo')?.addEventListener('click', () => {
            const dadosExport = ehEdicao && dadosEdicao ? [{
                nome: dadosEdicao.nome,
                apelido: (dadosEdicao as any).apelido || '',
                telefone: (dadosEdicao as any).telefone || '',
                frase_exibicao: (dadosEdicao as any).frase_exibicao || '',
                data_nascimento: dadosEdicao.data_nascimento
            }] : [{ 
                nome: "Exemplo Nome", 
                apelido: "Apelido", 
                telefone: "71999998888", 
                frase_exibicao: "Feliz Aniversário!", 
                data_nascimento: "1995-10-30" 
            }];

            const ws = XLSX.utils.json_to_sheet(dadosExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Dados");
            const nomeArquivo = ehEdicao ? `export_${dadosEdicao?.nome.replace(/\s/g, '_')}.xlsx` : "modelo_aniversariantes.xlsx";
            XLSX.writeFile(wb, nomeArquivo);
        });

        // --- IMPORTAÇÃO PLANILHA ---
        document.getElementById('inputPlanilha')?.addEventListener('change', async (e: any) => {
            const file = e.target.files[0];
            const categoriaId = selectCategoria.value;

            if (!categoriaId || categoriaId === "NOVA_CATEGORIA") {
                alert("Selecione um grupo antes de importar.");
                e.target.value = '';
                return;
            }

            if (file) {
                const reader = new FileReader();
                reader.onload = async (evt) => {
                    try {
                        const data = evt.target?.result;
                        const workbook = XLSX.read(data, { type: 'binary' });
                        const primeiraAba = workbook.SheetNames ? workbook.SheetNames[0] : null;
                        if (!primeiraAba) return;

                        const sheet = workbook.Sheets[primeiraAba];
                        if (!sheet) return;

                        const json: any[] = XLSX.utils.sheet_to_json(sheet);

                        if (json.length > 0 && confirm(`Importar ${json.length} registros?`)) {
                            const promises = json.map(row => {
                                return aniversarioService.adicionar({
                                    nome: row.nome || 'Sem Nome',
                                    apelido: row.apelido || '',
                                    telefone: String(row.telefone || '').replace(/\D/g, ''),
                                    frase_exibicao: row.frase_exibicao || '',
                                    data_nascimento: formatarDataParaISO(row.data_nascimento),
                                    categoria_id: categoriaId,
                                    imagem_url: ''
                                } as any);
                            });
                            await Promise.all(promises);
                            alert("Sucesso!");
                            window.location.hash = '#listagem';
                        }
                    } catch (err) { alert("Erro ao importar planilha."); }
                };
                reader.readAsBinaryString(file);
            }
        });

        // --- GESTÃO DE AVATARES ---
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
                preview.innerHTML = url ? `<img src="${url}" class="img-preview-fec">` : `<i data-lucide="user" class="avatar-icon-fec"></i>`;
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

        // --- SUBMISSÃO ---
        (document.getElementById('formAniversario') as HTMLFormElement).onsubmit = async (evt) => {
            evt.preventDefault();
            
            const telLimpo = inputTelefone.value.replace(/\D/g, "");
            if (telLimpo.length > 0 && telLimpo.length < 10) {
                alert("O telefone deve ter pelo menos o DDD + 8 ou 9 dígitos.");
                return;
            }

            const btn = document.getElementById('btnSubmit') as HTMLButtonElement;
            btn.disabled = true;

            try {
                const dados = {
                    nome: (document.getElementById('nome') as HTMLInputElement).value,
                    apelido: (document.getElementById('apelido') as HTMLInputElement).value,
                    telefone: telLimpo,
                    frase_exibicao: (document.getElementById('frase_exibicao') as HTMLInputElement).value,
                    data_nascimento: (document.getElementById('data_nascimento') as HTMLInputElement).value,
                    imagem_url: inputHidden.value,
                    categoria_id: (document.getElementById('categoria_id') as HTMLSelectElement).value
                };
                
                if (ehEdicao && idEdicao) {
                    await aniversarioService.atualizar(idEdicao, dados as any);
                    window.location.hash = `#detalhes?id=${idEdicao}`;
                } else {
                    await aniversarioService.adicionar(dados as any);
                    window.location.hash = '#listagem';
                }
            } catch (err) { alert("Erro ao salvar."); } 
            finally { btn.disabled = false; }
        };

        document.getElementById('btnVoltarForm')?.addEventListener('click', () => window.history.back());
        document.getElementById('btnSecondaryAction')?.addEventListener('click', () => {
            if (ehEdicao) window.location.hash = `#detalhes?id=${idEdicao}`;
            else (document.getElementById('formAniversario') as HTMLFormElement).reset();
        });

        createIcons({ icons });
    } catch (error) { container.innerHTML = "Erro ao carregar."; }
}