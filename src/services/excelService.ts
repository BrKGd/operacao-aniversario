import * as XLSX from 'xlsx';
import { Aniversario, Categoria } from '../types';
import { formatDateBR } from '../utils/dateUtils';

export const excelService = {
  /**
   * Exporta a lista de aniversariantes para um arquivo .xlsx formatado
   */
  exportarParaExcel(aniversariantes: Aniversario[], categorias: Categoria[], nomeArquivo: string = 'leao_festivo_aniversariantes.xlsx') {
    const mapCategorias = new Map<string, string>();
    categorias.forEach(cat => mapCategorias.set(cat.id, cat.nome));

    const dadosExcel = aniversariantes.map(item => ({
      'Nome Completo': item.nome || '',
      'Apelido': item.apelido || '',
      'Data de Nascimento': item.data_nascimento ? formatDateBR(item.data_nascimento) : '',
      'Data ISO (YYYY-MM-DD)': item.data_nascimento || '',
      'Telefone / WhatsApp': item.telefone || '',
      'Categoria': item.categorias?.nome || mapCategorias.get(item.categoria_id) || 'Geral',
      'Frase de Exibição': item.frase_exibicao || '',
      'Observações': item.observacoes || '',
      'Favorito': item.favorito ? 'Sim' : 'Não',
      'Enviar Mensagem': item.send_msg ? 'Sim' : 'Não'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dadosExcel);
    
    // Ajusta largura automática das colunas
    const colWidths = Object.keys(dadosExcel[0] || {}).map(key => ({
      wch: Math.max(key.length + 5, 18)
    }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Aniversariantes');

    XLSX.writeFile(workbook, nomeArquivo);
  },

  /**
   * Lê uma planilha (.xlsx ou .csv) enviada e converte em registros compatíveis com Aniversario
   */
  async importarDoExcel(file: File, categoriasDisponiveis: Categoria[]): Promise<Array<Omit<Aniversario, 'id' | 'created_at'>>> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          if (!firstSheetName) {
            throw new Error('Nenhuma aba encontrada na planilha.');
          }
          const worksheet = workbook.Sheets[firstSheetName];
          if (!worksheet) {
            throw new Error('Conteúdo da aba não encontrado.');
          }
          const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

          if (!rows || rows.length === 0) {
            throw new Error('A planilha está vazia.');
          }

          const categoriaPadrao = categoriasDisponiveis[0]?.id || '';
          const registrosImportados: Array<Omit<Aniversario, 'id' | 'created_at'>> = [];

          for (const row of rows) {
            // Suporte flexível para cabeçalhos em português ou inglês
            const nome = row['Nome Completo'] || row['Nome'] || row['nome'] || row['Name'] || '';
            if (!nome.trim()) continue; // Ignora linhas sem nome

            const apelido = row['Apelido'] || row['apelido'] || row['Nickname'] || nome.split(' ')[0];
            
            // Tratamento de Data
            let dataNasc = row['Data ISO (YYYY-MM-DD)'] || row['Data de Nascimento'] || row['data_nascimento'] || row['Data'] || '';
            dataNasc = normalizarDataExcel(dataNasc);

            if (!dataNasc) continue; // Data é obrigatória

            const telefone = String(row['Telefone / WhatsApp'] || row['Telefone'] || row['telefone'] || row['Phone'] || '').trim();
            const fraseExibicao = row['Frase de Exibição'] || row['Frase'] || row['frase_exibicao'] || '';
            const observacoes = row['Observações'] || row['observacoes'] || '';
            
            // Mapeamento de Categoria por nome ou ID
            const nomeCat = row['Categoria'] || row['categoria'] || '';
            const catEncontrada = categoriasDisponiveis.find(c => c.nome.toLowerCase() === String(nomeCat).toLowerCase());
            const categoria_id = catEncontrada ? catEncontrada.id : categoriaPadrao;

            const favorito = String(row['Favorito'] || row['favorito']).toLowerCase() === 'sim' || row['Favorito'] === true;
            const send_msg = String(row['Enviar Mensagem'] || row['send_msg']).toLowerCase() !== 'não';

            registrosImportados.push({
              nome,
              apelido,
              data_nascimento: dataNasc,
              telefone,
              frase_exibicao: fraseExibicao,
              observacoes,
              categoria_id,
              favorito,
              send_msg,
              idadeNova: 0
            });
          }

          resolve(registrosImportados);
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  }
};

/**
 * Normaliza variações de formatos de data para 'YYYY-MM-DD'
 */
function normalizarDataExcel(val: any): string {
  if (!val) return '';
  
  if (typeof val === 'number') {
    // Converte serial date do Excel
    const dateObj = XLSX.SSF.parse_date_code(val);
    if (dateObj) {
      const y = dateObj.y;
      const m = String(dateObj.m).padStart(2, '0');
      const d = String(dateObj.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  const str = String(val).trim();
  
  // Se já estiver em YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Se estiver em DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const parts = str.split('/');
    const d = parts[0] ?? '';
    const m = parts[1] ?? '';
    const y = parts[2] ?? '';
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return str;
}
