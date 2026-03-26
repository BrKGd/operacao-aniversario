// src/pages/registros.ts
import { supabase } from '../supabaseClient';
import '../styles/registros.css';

export function montarTelaRegistro() {
    const container = document.body;
    
    container.innerHTML = `
        <div class="reg-container">
            <div class="reg-card">
                <div class="reg-header">
                    <h2>Nova Escalação</h2>
                    <p>Crie sua conta para gerenciar os aniversários</p>
                </div>

                <div class="reg-form">
                    <input type="email" id="reg-email" placeholder="Seu melhor e-mail" required>
                    <input type="password" id="reg-password" placeholder="Crie uma senha forte" required>
                    <input type="password" id="reg-password-confirm" placeholder="Confirme a senha" required>
                    
                    <button id="btnFinalizarRegistro">Concluir Cadastro</button>
                    
                    <div class="reg-footer">
                        <p>Já tem conta? <a href="#" id="btnVoltarLogin">Voltar para o Login</a></p>
                    </div>
                    
                    <p id="reg-error" class="error-msg" style="display:none; color: red; margin-top: 10px;"></p>
                </div>
            </div>
        </div>
    `;

    // Evento para voltar ao login (Recarrega a página para acionar o main.ts)
    document.getElementById('btnVoltarLogin')?.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.reload();
    });

    // Evento de Cadastro
    document.getElementById('btnFinalizarRegistro')?.addEventListener('click', async () => {
        const email = (document.getElementById('reg-email') as HTMLInputElement).value;
        const password = (document.getElementById('reg-password') as HTMLInputElement).value;
        const confirm = (document.getElementById('reg-password-confirm') as HTMLInputElement).value;
        const errEl = document.getElementById('reg-error');

        if (password !== confirm) {
            if (errEl) {
                errEl.innerText = "As senhas não conferem!";
                errEl.style.display = 'block';
            }
            return;
        }

        try {
            const { error } = await supabase.auth.signUp({ email, password });
            if (error) throw error;

            alert("Cadastro realizado! Verifique sua caixa de entrada para confirmar o e-mail.");
            window.location.reload();
        } catch (error: any) {
            if (errEl) {
                errEl.innerText = error.message;
                errEl.style.display = 'block';
            }
        }
    });
}