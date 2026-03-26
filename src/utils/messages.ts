/**
 * Utilitário de Mensagens - Padrão Tricolor
 */
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
    
    // Limpa o telefone de caracteres especiais (apenas números)
    const telefoneLimpo = telefone ? telefone.replace(/\D/g, '') : '';
    
    return `https://wa.me/${telefoneLimpo}?text=${textoEncodado}`;
};