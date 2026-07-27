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
   * Solicita autorização para exibir notificações nativas no navegador
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
   * Dispara uma notificação nativa local se ativada
   */
  enviarNotificacao(titulo: string, opcoes?: NotificationOptions) {
    if (this.isEnabled()) {
      try {
        new Notification(titulo, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          ...opcoes
        });
      } catch (e) {
        console.error('Erro ao disparar notificação local:', e);
      }
    }
  },

  /**
   * Verifica se há aniversariantes hoje e notifica o usuário caso as notificações estejam ativas
   */
  verificarENotificarAniversariantes(aniversariantes: Aniversario[]) {
    if (!this.isEnabled()) return;

    const hojeAniversariantes = aniversariantes.filter(a => ehAniversarioHoje(a.data_nascimento));

    if (hojeAniversariantes.length === 0) return;

    const pessoa = hojeAniversariantes[0];
    if (hojeAniversariantes.length === 1 && pessoa) {
      this.enviarNotificacao(`🎉 Aniversário Hoje: ${pessoa.apelido || pessoa.nome}!`, {
        body: pessoa.frase_exibicao || `Hoje é o dia especial de ${pessoa.nome}. Envie um abraço!`,
        tag: `niver-${pessoa.id}`
      });
    } else {
      const nomes = hojeAniversariantes.map(a => a.apelido || a.nome).join(', ');
      this.enviarNotificacao(`🎉 ${hojeAniversariantes.length} Aniversariantes Hoje!`, {
        body: `Celebrando hoje: ${nomes}. Clique para dar parabéns!`,
        tag: `niver-multi-hoje`
      });
    }
  }
};
