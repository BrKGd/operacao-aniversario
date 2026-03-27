import '../styles/modalAlertas.css';
import { createIcons, CheckCircle, AlertCircle, Info, HelpCircle } from 'lucide';

type ModalType = 'success' | 'error' | 'info' | 'confirm';

interface ModalOptions {
    title?: string;
    message: string;
    type?: ModalType;
    confirmText?: string;
    cancelText?: string;
}

export const modalAlerta = {
    show({ title, message, type = 'info', confirmText = 'OK', cancelText = 'Cancelar' }: ModalOptions): Promise<boolean> {
        return new Promise((resolve) => {
            // Remove modal anterior se existir
            document.querySelector('.fec-modal-overlay')?.remove();

            const overlay = document.createElement('div');
            overlay.className = 'fec-modal-overlay';
            
            const iconMap = {
                success: 'check-circle',
                error: 'alert-circle',
                info: 'info',
                confirm: 'help-circle'
            };

            overlay.innerHTML = `
                <div class="fec-modal-box">
                    <div class="fec-modal-icon ${type}">
                        <i data-lucide="${iconMap[type]}"></i>
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
            createIcons({ icons: { CheckCircle, AlertCircle, Info, HelpCircle } });

            // Animação de entrada
            setTimeout(() => overlay.classList.add('active'), 10);

            const fechar = (resultado: boolean) => {
                overlay.classList.remove('active');
                setTimeout(() => {
                    overlay.remove();
                    resolve(resultado);
                }, 300);
            };

            overlay.querySelector('#modalConfirm')?.addEventListener('click', () => fechar(true));
            overlay.querySelector('#modalCancel')?.addEventListener('click', () => fechar(false));
        });
    },

    getDefaultTitle(type: ModalType) {
        const titles = { success: 'Sucesso!', error: 'Ops!', info: 'Aviso', confirm: 'Confirmação' };
        return titles[type];
    }
};