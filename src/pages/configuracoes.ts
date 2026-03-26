import '../styles/configuracoes.css';
import { aniversarioService } from '../services/aniversarioService';

export async function montarConfiguracoes(container: HTMLElement) {
    container.innerHTML = `<div class="loading">Carregando painel de controle...</div>`;

    try {
        const todos = await aniversarioService.listarTodos();
        
        // Agrupando por categorias para o resumo
        const categorias = todos.reduce((acc: any, curr) => {
            const cat = curr.categorias?.nome || 'Geral';
            acc[cat] = (acc[cat] || 0) + 1;
            return acc;
        }, {});

        container.innerHTML = `
            <div class="config-container">
                <header class="config-header">
                    <h1>Configurações</h1>
                    <p>Gerenciamento do sistema de elenco</p>
                </header>

                <section class="config-section">
                    <div class="section-label">ESTATÍSTICAS DO CLUBE</div>
                    <div class="stats-card">
                        <div class="stat-row">
                            <span>Total de Integrantes</span>
                            <strong>${todos.length}</strong>
                        </div>
                        <hr>
                        <div class="stat-categories">
                            ${Object.entries(categorias).map(([nome, total]) => `
                                <div class="cat-pill">
                                    <span>${nome}</span>
                                    <span class="cat-count">${total}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </section>

                <section class="config-section">
                    <div class="section-label">MENSAGENS PADRÃO</div>
                    <div class="menu-item" onclick="alert('Funcionalidade em breve!')">
                        <div class="menu-info">
                            <i data-lucide="message-square"></i>
                            <span>Editar texto do WhatsApp</span>
                        </div>
                        <i data-lucide="chevron-right"></i>
                    </div>
                </section>

                <section class="config-section">
                    <div class="section-label">DADOS E SEGURANÇA</div>
                    <div class="menu-item" onclick="location.reload()">
                        <div class="menu-info">
                            <i data-lucide="refresh-cw"></i>
                            <span>Sincronizar Banco de Dados</span>
                        </div>
                    </div>
                    
                    <div class="menu-item" id="btnExportar">
                        <div class="menu-info">
                            <i data-lucide="download"></i>
                            <span>Exportar Elenco (JSON)</span>
                        </div>
                    </div>
                </section>

                <div class="app-version">
                    🦁 App Aniversariantes v1.0.0
                </div>
            </div>
        `;

        // Lógica de exportação simples
        document.getElementById('btnExportar')?.addEventListener('click', () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(todos));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "elenco_aniversariantes.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        });

        if ((window as any).lucide) (window as any).lucide.createIcons();

    } catch (error) {
        container.innerHTML = `<div class="error-msg">Erro ao carregar ajustes.</div>`;
    }
}