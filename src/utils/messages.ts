/**
 * Utilitário de Mensagens - Padrão Tricolor
 */

/**
 * Formata um número de telefone para o padrão internacional do WhatsApp.
 * Se o número possuir 10 ou 11 dígitos (DDD + número), adiciona o código de país '55' (Brasil).
 */
export const formatarTelefoneWhatsapp = (telefone?: string): string => {
    if (!telefone) return '';
    let limpo = telefone.replace(/\D/g, '');
    if (!limpo) return '';

    // Se tiver 10 ou 11 dígitos (DDD + número no Brasil), adiciona o DDI 55
    if (limpo.length === 10 || limpo.length === 11) {
        limpo = `55${limpo}`;
    } else if (!limpo.startsWith('55') && limpo.length <= 11) {
        limpo = `55${limpo}`;
    }
    return limpo;
};

export const gerarLinkWhatsapp = (nome: string, telefone?: string): string => {
    const mensagens: string[] = [
        `Parabéns, ${nome}! Que seu dia seja repleto de alegrias e muitas conquistas. 🎂`,
        `Fala, ${nome}! Passando para desejar um feliz aniversário e muita saúde! 🎉`,
        `Hoje é o seu dia, ${nome}! Tudo de bom hoje e sempre. Grande abraço! 🎈`,
        `Parabéns pelo seu dia, ${nome}! Muita paz, saúde e felicidades! 🎊`
    ];
    
    // Seleção aleatória da mensagem
    const indice = Math.floor(Math.random() * mensagens.length);
    
    // O operador '??' garante que se algo falhar, teremos uma string vazia (evita o erro 2345)
    const mensagemSelecionada = mensagens[indice] ?? "";
    
    const textoEncodado = encodeURIComponent(mensagemSelecionada);
    
    // Limpa e formata o telefone garantindo o DDI 55
    const telefoneLimpo = formatarTelefoneWhatsapp(telefone);
    
    return `https://wa.me/${telefoneLimpo}?text=${textoEncodado}`;
};