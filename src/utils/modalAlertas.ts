import '../styles/modalAlertas.css';
import { 
    createIcons, 
    CheckCircle, 
    AlertCircle, 
    Info, 
    HelpCircle, 
    Loader2 
} from 'lucide';

type ModalType = 'success' | 'error' | 'info' | 'confirm' | 'warning';

interface ModalOptions {
    title?: string;
    message: string;
    type?: ModalType;
    confirmText?: string;
    cancelText?: string;
}

export const modalAlerta = {
    show(options: ModalOptions): Promise<boolean> {
        const { title, message, type = 'info', confirmText = 'OK', cancelText = 'Cancelar' } = options;
        
        return new Promise((resolve) => {
            // Limpa qualquer modal aberto anteriormente
            this.close();

            const overlay = document.createElement('div');
            overlay.className = 'fec-modal-overlay';
            overlay.id = 'fecModalPrincipal';
            
            const iconMap: Record<string, string> = {
                success: 'check-circle',
                error: 'alert-circle',
                info: 'info',
                confirm: 'help-circle',
                warning: 'alert-circle'
            };

            overlay.innerHTML = `
                <div class="fec-modal-box">
                    <div class="fec-modal-icon ${type}">
                        <i data-lucide="${iconMap[type] || 'info'}"></i>
                    </div>
                    <div class="fec-modal-title">${title || this.getDefaultTitle(type)}</div>
                    <div class="fec-modal-message">${message}</div>
                    <div class="fec-modal-footer">
                        ${type === 'confirm' ? `<button class="btn-modal btn-modal-secondary" id="modalCancel">${cancelText}</button>` : ''}
                        <button class="btn-modal btn-modal-primary" id="modalConfirm">${confirmText}</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            // CORREÇÃO: createIcons agora só olha para dentro do overlay recém criado
            createIcons({ 
                icons: { CheckCircle, AlertCircle, Info, HelpCircle },
                nameAttr: 'data-lucide',
                attrs: { 'class': 'lucide-modal-icon' },
                root: overlay // <--- ISSO resolve os erros do console
            });

            setTimeout(() => overlay.classList.add('active'), 10);

            const fecharEPassarValor = (valor: boolean) => {
                overlay.classList.remove('active');
                setTimeout(() => {
                    overlay.remove();
                    resolve(valor);
                }, 300);
            };

            overlay.querySelector('#modalConfirm')?.addEventListener('click', () => fecharEPassarValor(true));
            overlay.querySelector('#modalCancel')?.addEventListener('click', () => fecharEPassarValor(false));
        });
    },

    showLoading(message: string) {
        this.close();
        const overlay = document.createElement('div');
        overlay.className = 'fec-modal-overlay active';
        overlay.id = 'fecModalLoading';
        
        overlay.innerHTML = `
            <div class="fec-modal-box loading">
                <div class="fec-modal-spinner">
                     <i data-lucide="loader-2"></i>
                </div>
                <div class="fec-modal-title">Processando...</div>
                <div class="fec-modal-message">${message}</div>
            </div>
        `;
        document.body.appendChild(overlay);

        createIcons({ 
            icons: { Loader2 }, 
            root: overlay 
        });
    },

    close() {
        const modais = document.querySelectorAll('.fec-modal-overlay');
        modais.forEach(m => m.remove());
    },

    getDefaultTitle(type: ModalType) {
        const titles: Record<string, string> = { 
            success: 'Sucesso!', 
            error: 'Erro!', 
            info: 'Aviso', 
            confirm: 'Confirmação',
            warning: 'Atenção'
        };
        return titles[type] || 'Aviso';
    }
};