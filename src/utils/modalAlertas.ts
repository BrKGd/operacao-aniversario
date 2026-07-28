import '../styles/modalAlertas.css';
import { 
    createIcons, 
    CheckCircle2, 
    AlertTriangle, 
    Info, 
    HelpCircle, 
    Trash2,
    Loader2,
    Sparkles
} from 'lucide';

type ModalType = 'success' | 'error' | 'info' | 'confirm' | 'warning' | 'delete';

interface ModalOptions {
    title?: string;
    message: string;
    type?: ModalType;
    confirmText?: string;
    cancelText?: string;
}

export const modalAlerta = {
    show(options: ModalOptions): Promise<boolean> {
        const { title, message, type = 'info', confirmText, cancelText = 'Cancelar' } = options;
        
        return new Promise((resolve) => {
            this.close();

            const overlay = document.createElement('div');
            overlay.className = 'fec-modal-overlay';
            overlay.id = 'fecModalPrincipal';
            
            const iconMap: Record<string, string> = {
                success: 'check-circle-2',
                error: 'alert-triangle',
                info: 'info',
                confirm: 'help-circle',
                warning: 'alert-triangle',
                delete: 'trash-2'
            };

            const defaultConfirmText = type === 'delete' ? 'Sim, Excluir' : (type === 'confirm' ? 'Confirmar' : 'OK');
            const finalConfirmText = confirmText || defaultConfirmText;

            overlay.innerHTML = `
                <div class="fec-modal-box modal-type-${type}">
                    <div class="fec-modal-icon ${type}">
                        <div class="icon-pulse-glow"></div>
                        <i data-lucide="${iconMap[type] || 'info'}"></i>
                    </div>
                    <div class="fec-modal-title">${title || this.getDefaultTitle(type)}</div>
                    <div class="fec-modal-message">${message}</div>
                    <div class="fec-modal-footer">
                        ${(type === 'confirm' || type === 'delete' || type === 'warning') 
                            ? `<button class="btn-modal btn-modal-secondary" id="modalCancel">${cancelText}</button>` 
                            : ''}
                        <button class="btn-modal btn-modal-primary btn-${type}" id="modalConfirm">${finalConfirmText}</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            createIcons({ 
                icons: { CheckCircle2, AlertTriangle, Info, HelpCircle, Trash2, Sparkles },
                nameAttr: 'data-lucide',
                root: overlay
            });

            setTimeout(() => overlay.classList.add('active'), 10);

            const fecharEPassarValor = (valor: boolean) => {
                overlay.classList.remove('active');
                setTimeout(() => {
                    overlay.remove();
                    resolve(valor);
                }, 250);
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
                <div class="fec-modal-loading-wrapper">
                    <div class="fec-spinner-ring"></div>
                    <div class="fec-modal-spinner">
                         <i data-lucide="loader-2"></i>
                    </div>
                </div>
                <div class="fec-modal-title loading-title">
                    Processando<span class="loading-dots"><span>.</span><span>.</span><span>.</span></span>
                </div>
                <div class="fec-modal-message">${message}</div>
            </div>
        `;
        document.body.appendChild(overlay);

        createIcons({ 
            icons: { Loader2, Sparkles }, 
            root: overlay 
        });
    },

    close() {
        const modais = document.querySelectorAll('.fec-modal-overlay');
        modais.forEach(m => m.remove());
    },

    getDefaultTitle(type: ModalType) {
        const titles: Record<string, string> = { 
            success: 'Concluído com Sucesso!', 
            error: 'Ops, ocorreu um erro', 
            info: 'Informação', 
            confirm: 'Tem certeza?',
            warning: 'Atenção Necessária',
            delete: 'Confirmar Exclusão'
        };
        return titles[type] || 'Aviso';
    }
};