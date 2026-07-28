import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import '../styles/app.css';
import '../styles/registros.css';
import { createIcons, icons } from 'lucide';

export function montarTelaRegistro() {
    document.body.innerHTML = `
        <div class="auth-full-page">
            <div class="auth-content-wrapper">
                <header class="auth-hero">
                    <i data-lucide="user-plus" class="hero-icon"></i>
                    <h1>Criar Conta</h1>
                    <p>Comece a organizar suas celebrações</p>
                </header>

                <div class="auth-form-main">
                    <div id="reg-error" class="error-msg-toast" style="display:none; margin-bottom: 20px;"></div>

                    <div class="input-modern-group">
                        <i data-lucide="mail"></i>
                        <input type="email" id="reg-email" placeholder="Seu e-mail" spellcheck="false" required>
                    </div>
                    
                    <div class="input-modern-group">
                        <i data-lucide="lock"></i>
                        <input type="password" id="reg-password" placeholder="Sua senha (mínimo 6 caracteres)" required>
                    </div>

                    <div class="input-modern-group">
                        <i data-lucide="shield-check"></i>
                        <input type="password" id="reg-password-confirm" placeholder="Confirme sua senha" required>
                    </div>
                    
                    <button id="btnFinalizarRegistro" class="btn-auth-submit">
                        <span>Concluir Cadastro</span>
                        <i data-lucide="sparkles"></i>
                    </button>

                    <div class="auth-links-footer">
                        <p>Já tem uma conta? <a href="#" id="btnVoltarLogin">Fazer Login</a></p>
                    </div>
                </div>
            </div>
        </div>
    `;

    createIcons({ icons });

    const emailEl = document.getElementById('reg-email') as HTMLInputElement;
    const passEl = document.getElementById('reg-password') as HTMLInputElement;
    const confirmEl = document.getElementById('reg-password-confirm') as HTMLInputElement;
    const errEl = document.getElementById('reg-error');

    const limparErro = () => {
        if (errEl && errEl.style.display !== 'none') {
            errEl.style.display = 'none';
            errEl.innerText = "";
        }
    };

    emailEl?.addEventListener('input', limparErro);
    passEl?.addEventListener('input', limparErro);
    confirmEl?.addEventListener('input', limparErro);

    document.getElementById('btnVoltarLogin')?.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.reload();
    });

    document.getElementById('btnFinalizarRegistro')?.addEventListener('click', async () => {
        const email = emailEl.value.trim();
        const password = passEl.value;
        const confirm = confirmEl.value;

        if (!email) {
            exibirErro("Por favor, digite seu e-mail.");
            return;
        }

        if (password.length < 6) {
            exibirErro("A senha deve ter pelo menos 6 caracteres.");
            return;
        }

        if (password !== confirm) {
            exibirErro("As senhas não conferem!");
            return;
        }

        const btn = document.getElementById('btnFinalizarRegistro') as HTMLButtonElement;
        btn.disabled = true;
        const originalContent = btn.innerHTML;
        btn.innerHTML = `<span>Criando conta...</span>`;

        try {
            await createUserWithEmailAndPassword(auth, email, password);
            alert("🎉 Cadastro realizado com sucesso!");
            window.location.reload();
        } catch (error: any) {
            let msg = "Erro ao realizar cadastro.";
            if (error.code === 'auth/api-key-not-valid') {
                msg = "⚠️ Credenciais do Firebase não configuradas! Cole sua API Key real no arquivo .env.";
            } else if (error.code === 'auth/email-already-in-use') {
                msg = "Este e-mail já está em uso por outra conta.";
            } else if (error.code === 'auth/invalid-email') {
                msg = "O e-mail digitado é inválido.";
            } else if (error.code === 'auth/weak-password') {
                msg = "A senha digitada é muito fraca.";
            } else if (error.message) {
                msg = error.message;
            }
            exibirErro(msg);
            btn.disabled = false;
            btn.innerHTML = originalContent;
            createIcons({ icons });
        }
    });

    function exibirErro(msg: string) {
        if (errEl) {
            errEl.innerText = msg;
            errEl.style.display = 'block';
        }
    }
}