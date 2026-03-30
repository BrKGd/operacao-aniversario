import '../styles/lista.css'; 
import { aniversarioService } from '../services/aniversarioService';
import { Aniversario, Categoria } from '../types';
import { modalAlerta } from '../utils/modalAlertas';

export async function montarLista(container: HTMLElement) {
    container.innerHTML = `<div class="fec-loader-minimal">Buscando elenco...</div>`;

    try {
        const [contatos, categorias]: [Aniversario[], Categoria[]] = await Promise.all([
            aniversarioService.listarTodos(),
            aniversarioService.listarCategorias()
        ]);

        let filtroTexto = "";
        let filtroCategoriaId = "todos";

        const calcularInfoNiver = (dataNasc: string) => {
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            const nasc = new Date(dataNasc + 'T00:00:00');
            const proxNiver = new Date(hoje.getFullYear(), nasc.getMonth(), nasc.getDate());
            
            if (proxNiver < hoje) proxNiver.setFullYear(hoje.getFullYear() + 1);
            
            const diffTime = proxNiver.getTime() - hoje.getTime();
            const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const idadeNova = proxNiver.getFullYear() - nasc.getFullYear();
            
            return { 
                dias: diasRestantes, 
                idade: idadeNova, 
                dataFormatada: `${nasc.getDate().toString().padStart(2, '0')}/${(nasc.getMonth() + 1).toString().padStart(2, '0')}` 
            };
        };

        const renderizarGrid = () => {
            let filtrados = contatos.filter(c => 
                c.nome.toLowerCase().includes(filtroTexto.toLowerCase())
            );

            if (filtroCategoriaId !== "todos") {
                filtrados = filtrados.filter(c => c.categoria_id === filtroCategoriaId);
            }

            if (filtrados.length === 0) {
                return `<div class="no-data">Nenhum integrante encontrado.</div>`;
            }

            const ordenados = filtrados.map(c => ({ ...c, info: calcularInfoNiver(c.data_nascimento) }))
                                     .sort((a, b) => a.info.dias - b.info.dias);

            return ordenados.map(c => `
                <div class="card-aniversario">
                    <div class="info-principal" onclick="window.navegar('detalhes', '${c.id}')">
                        <div class="avatar-box">
                             <img src="${(c as any).imagem_url || ''}" class="img-avatar-list" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                             <span class="avatar-letter" style="display:none">${c.nome.charAt(0)}</span>
                        </div>
                        <div class="textos-contato">
                            <span class="nome-contato">${c.nome}</span>
                            <span class="subtexto-contato">${c.info.dataFormatada} • Faz ${c.info.idade} anos</span>
                            <span class="categoria-tag">${c.categorias?.nome || 'Geral'}</span>
                        </div>
                    </div>
                    
                    <div class="contagem-container">
                        <div class="dias-regressiva">
                            <span class="numero-dias">${c.info.dias}</span>
                            <span class="label-dias">Dias</span>
                        </div>
                    </div>
                </div>
            `).join('');
        };

        container.innerHTML = `
            <div class="lista-wrapper">
                <div class="header-busca">
                    <div class="search-box">
                        <i data-lucide="search"></i>
                        <input type="text" id="inputBusca" placeholder="Buscar no elenco...">
                    </div>
                </div>
                
                <div class="filtros-rapidos">
                    <button class="chip active" data-id="todos">Todos</button>
                    ${categorias.map(cat => `
                        <button class="chip" data-id="${cat.id}">${cat.nome}</button>
                    `).join('')}
                </div>

                <div id="listaContatos" class="grid-cards">
                    ${renderizarGrid()}
                </div>
            </div>
        `;

        const atualizarInterface = () => {
            const lista = document.getElementById('listaContatos');
            if (lista) {
                lista.innerHTML = renderizarGrid();
                if ((window as any).lucide) (window as any).lucide.createIcons();
            }
        };

        // Evento de Busca
        document.getElementById('inputBusca')?.addEventListener('input', (e) => {
            filtroTexto = (e.target as HTMLInputElement).value;
            atualizarInterface();
        });

        // Evento de Filtro por Categoria (Chips)
        document.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                filtroCategoriaId = chip.getAttribute('data-id') || "todos";
                atualizarInterface();
            });
        });

        if ((window as any).lucide) (window as any).lucide.createIcons();

    } catch (error) {
        console.error(error);
        container.innerHTML = `<div class="error-msg">Erro ao carregar lista.</div>`;
    }
}