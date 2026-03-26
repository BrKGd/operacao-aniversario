import '../styles/lista.css'; 
import { aniversarioService } from '../services/aniversarioService';
import { Aniversario } from '../types';

export async function montarLista(container: HTMLElement) {
    container.innerHTML = `<div class="loading-state">Buscando elenco...</div>`;

    try {
        const contatos: Aniversario[] = await aniversarioService.listarTodos();

        // Função interna para calcular dias restantes e idade
        const calcularInfoNiver = (dataNasc: string) => {
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            
            const nasc = new Date(dataNasc);
            const proxNiver = new Date(hoje.getFullYear(), nasc.getMonth(), nasc.getDate());
            
            if (proxNiver < hoje) {
                proxNiver.setFullYear(hoje.getFullYear() + 1);
            }
            
            const diffTime = proxNiver.getTime() - hoje.getTime();
            const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const idadeNova = proxNiver.getFullYear() - nasc.getFullYear();
            
            return { 
                dias: diasRestantes, 
                idade: idadeNova, 
                dataFormatada: `${nasc.getDate().toString().padStart(2, '0')}/${(nasc.getMonth() + 1).toString().padStart(2, '0')}` 
            };
        };

        const renderizarGrid = (filtro = "") => {
            const filtrados = contatos.filter(c => 
                c.nome.toLowerCase().includes(filtro.toLowerCase())
            );

            if (filtrados.length === 0) {
                return `<div class="no-data">Nenhum integrante encontrado.</div>`;
            }

            // Ordenar por proximidade de dias
            const ordenados = filtrados.map(c => ({ ...c, info: calcularInfoNiver(c.data_nascimento) }))
                                     .sort((a, b) => a.info.dias - b.info.dias);

            return ordenados.map(c => `
                <div class="card-aniversario">
                    <div class="info-principal" onclick="window.navegar('detalhes', '${c.id}')">
                        <div class="avatar-box">
                            ${c.nome.charAt(0)}
                        </div>
                        <div class="textos-contato">
                            <span class="nome-contato">${c.nome}</span>
                            <span class="subtexto-contato">${c.info.dataFormatada} • Faz ${c.info.idade} anos</span>
                            <span class="categoria-tag">${c.categoria || 'Geral'}</span>
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
                    <button class="chip active">Todos</button>
                    <button class="chip">Amigos</button>
                    <button class="chip">Família</button>
                    <button class="chip">Trabalho</button>
                </div>

                <div id="listaContatos" class="grid-cards">
                    ${renderizarGrid()}
                </div>
            </div>
        `;

        const atribuirEventos = () => {
            document.querySelectorAll('.btn-mini.edit').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = btn.getAttribute('data-id');
                    (window as any).navegar('form', id);
                });
            });

            document.querySelectorAll('.btn-mini.del').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const id = btn.getAttribute('data-id');
                    if (id && confirm("Remover do elenco?")) {
                        await aniversarioService.excluir(id);
                        montarLista(container);
                    }
                });
            });
        };

        document.getElementById('inputBusca')?.addEventListener('input', (e) => {
            const val = (e.target as HTMLInputElement).value;
            const lista = document.getElementById('listaContatos');
            if (lista) {
                lista.innerHTML = renderizarGrid(val);
                atribuirEventos();
                if ((window as any).lucide) (window as any).lucide.createIcons();
            }
        });

        atribuirEventos();
        if ((window as any).lucide) (window as any).lucide.createIcons();

    } catch (error) {
        container.innerHTML = `<div class="error-msg">Erro ao carregar lista.</div>`;
    }
}