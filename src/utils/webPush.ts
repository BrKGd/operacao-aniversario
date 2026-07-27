import { Aniversario } from '../types';
import { ehAniversarioHoje } from './dateUtils';

const STORAGE_KEY = 'webpush_enabled';

export const webPushService = {
  /**
   * Verifica se o navegador suporta a API de Notificações
   */
  isSupported(): boolean {
    return 'Notification' in window;
  },

  /**
   * Verifica se o recurso está ativado pelo usuário e autorizado no navegador
   */
  isEnabled(): boolean {
    if (!this.isSupported()) return false;
    const pref = localStorage.getItem(STORAGE_KEY);
    const estaAtivoNoStorage = pref === null || pref === 'true'; // Padrão ativado se houver permissão
    return estaAtivoNoStorage && Notification.permission === 'granted';
  },

  /**
   * Salva a preferência de ativação/desativação do usuário
   */
  setStatus(ativo: boolean) {
    localStorage.setItem(STORAGE_KEY, ativo ? 'true' : 'false');
  },

  /**
   * Solicita autorização para exibir notificações nativas no navegador (compatível com Android & Desktop)
   */
  async solicitarPermissao(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('Este navegador não suporta notificações nativas.');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.setStatus(true);
      return true;
    }

    if (Notification.permission !== 'denied') {
      const status = await Notification.requestPermission();
      const concedido = status === 'granted';
      this.setStatus(concedido);
      return concedido;
    }

    this.setStatus(false);
    return false;
  },

  /**
   * Dispara uma notificação nativa local compatível com Android, PWA e Desktop
   */
  async enviarNotificacao(titulo: string, opcoes?: NotificationOptions) {
    if (!this.isEnabled()) return;

    const notificationOptions: NotificationOptions = {
      icon: './favicon.ico',
      badge: './favicon.ico',
      vibrate: [100, 50, 100],
      ...opcoes
    };

    try {
      // 1. Método Obrigatório para Android Chrome & PWA: via Service Worker
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          await reg.showNotification(titulo, notificationOptions);
          return;
        }
      }

      // 2. Fallback para Desktop (Chrome / Edge Desktop)
      new Notification(titulo, notificationOptions);
    } catch (e) {
      console.warn('Fallback de notificação para API de janela:', e);
      try {
        new Notification(titulo, notificationOptions);
      } catch (err) {
        console.error('Erro ao disparar notificação:', err);
      }
    }
  },

  /**
   * Verifica se há aniversariantes hoje e notifica o usuário caso as notificações estejam ativas
   */
  async verificarENotificarAniversariantes(aniversariantes: Aniversario[]) {
    if (!this.isEnabled()) return;

    const hojeAniversariantes = aniversariantes.filter(a => ehAniversarioHoje(a.data_nascimento));

    if (hojeAniversariantes.length === 0) return;

    const pessoa = hojeAniversariantes[0];
    if (hojeAniversariantes.length === 1 && pessoa) {
      await this.enviarNotificacao(`🎉 Aniversário Hoje: ${pessoa.apelido || pessoa.nome}!`, {
        body: pessoa.frase_exibicao || `Hoje é o dia especial de ${pessoa.nome}. Envie um abraço!`,
        tag: `niver-${pessoa.id}`
      });
    } else {
      const nomes = hojeAniversariantes.map(a => a.apelido || a.nome).join(', ');
      await this.enviarNotificacao(`🎉 ${hojeAniversariantes.length} Aniversariantes Hoje!`, {
        body: `Celebrando hoje: ${nomes}. Clique para dar parabéns!`,
        tag: `niver-multi-hoje`
      });
    }
  }
};
