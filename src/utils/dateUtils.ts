/**
 * Utilitário para tratamento estrito de datas locais sem perda por conversão de fuso horário UTC.
 */

/**
 * Converte string 'YYYY-MM-DD' em um objeto Date no fuso horário local.
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const rawDate = dateStr.split('T')[0] ?? '';
  const parts = rawDate.split('-');
  const yearStr = parts[0];
  const monthStr = parts[1];
  const dayStr = parts[2];

  if (!yearStr || !monthStr || !dayStr) {
    return new Date(dateStr);
  }

  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);
  return new Date(year, month, day);
}

/**
 * Formata a data 'YYYY-MM-DD' para o formato brasileiro ('DD/MM/YYYY' ou 'DD/MM').
 */
export function formatDateBR(dateStr: string, includeYear: boolean = true): string {
  if (!dateStr) return '';
  const rawDate = dateStr.split('T')[0] ?? '';
  const parts = rawDate.split('-');
  const yearStr = parts[0];
  const monthStr = parts[1];
  const dayStr = parts[2];

  if (!yearStr || !monthStr || !dayStr) {
    return dateStr;
  }

  const formattedDay = dayStr.padStart(2, '0');
  const formattedMonth = monthStr.padStart(2, '0');
  return includeYear ? `${formattedDay}/${formattedMonth}/${yearStr}` : `${formattedDay}/${formattedMonth}`;
}

/**
 * Calcula a idade atual a partir da data de nascimento 'YYYY-MM-DD'.
 */
export function calcularIdade(dateStr: string): number {
  if (!dateStr) return 0;
  const nascimento = parseLocalDate(dateStr);
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const m = hoje.getMonth() - nascimento.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }
  return Math.max(0, idade);
}

/**
 * Retorna o número de dias que faltam para o próximo aniversário.
 * 0 indica que o aniversário é HOJE.
 */
export function diasAteAniversario(dateStr: string): number {
  if (!dateStr) return 999;
  const nascimento = parseLocalDate(dateStr);
  const hoje = new Date();
  
  // Normaliza horas/minutos/segundos para comparação precisa por dia
  const hojeZerado = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  let proximoNiver = new Date(hoje.getFullYear(), nascimento.getMonth(), nascimento.getDate());

  if (proximoNiver < hojeZerado) {
    // Se o aniversário já passou este ano, considera o próximo ano
    proximoNiver = new Date(hoje.getFullYear() + 1, nascimento.getMonth(), nascimento.getDate());
  }

  const diffTime = proximoNiver.getTime() - hojeZerado.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Verifica se a data de nascimento 'YYYY-MM-DD' é hoje (coincidência de dia e mês).
 */
export function ehAniversarioHoje(dateStr: string): boolean {
  if (!dateStr) return false;
  const nascimento = parseLocalDate(dateStr);
  const hoje = new Date();
  return nascimento.getDate() === hoje.getDate() && nascimento.getMonth() === hoje.getMonth();
}

/**
 * Verifica se o aniversário ocorrerá nos próximos `diasNoFuturo` dias.
 */
export function ehAniversarioNaSemana(dateStr: string, diasNoFuturo: number = 7): boolean {
  const dias = diasAteAniversario(dateStr);
  return dias >= 0 && dias <= diasNoFuturo;
}
