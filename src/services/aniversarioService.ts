import { supabase } from '../supabaseClient';
import { Aniversario, Categoria } from '../types';

export const aniversarioService = {

// ==============================
// 🎂 ANIVERSÁRIOS
// ==============================

async listarPorMes(mes: number): Promise<Aniversario[]> {
const { data, error } = await supabase
.from('aniversarios')
.select(`         *,
        categorias (
          id,
          nome,
          icone,
          cor
        )
      `)
.filter('data_nascimento', 'raw', `extract(month from data_nascimento) = ${mes + 1}`)
.order('nome', { ascending: true });

if (error) {
  console.error('Erro ao buscar dados por mês:', error.message);
  return [];
}

return (data as any[]) || [];


},

async listarTodos(): Promise<Aniversario[]> {
const { data, error } = await supabase
.from('aniversarios')
.select(`         *,
        categorias (
          id,
          nome,
          icone,
          cor
        )
      `)
.order('nome', { ascending: true });

if (error) {
  console.error('Erro ao buscar todos:', error.message);
  return [];
}

return (data as any[]) || [];


},

async adicionar(aniversario: Omit<Aniversario, 'id' | 'created_at' | 'categorias'>): Promise<Aniversario> {
const { data, error } = await supabase
.from('aniversarios')
.insert([aniversario])
.select()
.single();


if (error) {
  console.error('Erro ao adicionar:', error.message);
  throw error;
}

return data as Aniversario;


},

async atualizar(id: string, dados: Partial<Aniversario>): Promise<Aniversario> {
const { categorias, ...dadosParaEnvio } = dados as any;


const { data, error } = await supabase
  .from('aniversarios')
  .update(dadosParaEnvio)
  .eq('id', id)
  .select()
  .single();

if (error) {
  console.error('Erro ao atualizar:', error.message);
  throw error;
}

return data as Aniversario;


},

async excluir(id: string): Promise<void> {
const { error } = await supabase
.from('aniversarios')
.delete()
.eq('id', id);


if (error) {
  console.error('Erro ao excluir:', error.message);
  throw error;
}

},

// ==============================
// 🗂️ CATEGORIAS
// ==============================

async listarCategorias(): Promise<Categoria[]> {
const { data, error } = await supabase
.from('categorias')
.select('*')
.order('nome', { ascending: true });

if (error) {
  console.error('Erro ao listar categorias:', error.message);
  return [];
}

return data as Categoria[];


},

async adicionarCategoria(
categoria: Omit<Categoria, 'id' | 'created_at'>
): Promise<Categoria> {
const { data, error } = await supabase
.from('categorias')
.insert([categoria])
.select()
.single();

if (error) {
  console.error('Erro ao criar categoria:', error.message);
  throw error;
}

return data as Categoria;


},

async atualizarCategoria(
id: string,
dados: Partial<Categoria>
): Promise<Categoria> {
const { data, error } = await supabase
.from('categorias')
.update(dados)
.eq('id', id)
.select()
.single();


if (error) {
  console.error('Erro ao atualizar categoria:', error.message);
  throw error;
}

return data as Categoria;

},

async excluirCategoria(id: string): Promise<void> {
const { error } = await supabase
.from('categorias')
.delete()
.eq('id', id);


if (error) {
  console.error('Erro ao excluir categoria:', error.message);
  throw error;
}


}

};
