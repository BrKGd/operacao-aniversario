-- ============================================================
-- SCRIPT DE MIGRAÇÃO E OTIMIZAÇÃO SUPABASE - OPERAÇÃO ANIVERSÁRIO
-- Executar no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. ADICIONAR COLUNA STATUS NA TABELA DE PERFIS (PUBLIC.PROFILES)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Garantir restrição de valores (active, blocked, deleted)
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS check_profiles_status;

ALTER TABLE public.profiles 
ADD CONSTRAINT check_profiles_status CHECK (status IN ('active', 'blocked', 'deleted'));

-- 2. CRIAR ÍNDICES DE PERFORMANCE NA TABELA DE PROFILES
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 3. ATUALIZAR FUNÇÃO TRIGGER HANDLE_NEW_USER COM COLUNA STATUS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, status, updated_at)
  VALUES (
    new.id, 
    new.email, 
    'active', 
    now()
  )
  ON CONFLICT (id) DO UPDATE 
  SET email = EXCLUDED.email, 
      updated_at = now();
  RETURN new;
END;
$$;

-- Recriar trigger se necessário
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. OTIMIZAÇÃO E ÍNDICES DE ALTA PERFORMANCE PARA OS ANIVERSÁRIOS
CREATE INDEX IF NOT EXISTS idx_aniversarios_user_id ON public.aniversarios(user_id);

CREATE INDEX IF NOT EXISTS idx_aniversarios_mes_dia 
ON public.aniversarios (EXTRACT(MONTH FROM data_nascimento), EXTRACT(DAY FROM data_nascimento));

CREATE INDEX IF NOT EXISTS idx_aniversarios_favorito ON public.aniversarios(favorito);

-- 5. CONFIGURAÇÃO DE SEGURANÇA RLS (ROW LEVEL SECURITY) NA TABELA ANIVERSARIOS
ALTER TABLE public.aniversarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários lêem apenas seus aniversariantes" ON public.aniversarios;
CREATE POLICY "Usuários lêem apenas seus aniversariantes" 
ON public.aniversarios FOR SELECT 
USING (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "Usuários inserem com seu user_id" ON public.aniversarios;
CREATE POLICY "Usuários inserem com seu user_id" 
ON public.aniversarios FOR INSERT 
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "Usuários atualizam apenas seus aniversariantes" ON public.aniversarios;
CREATE POLICY "Usuários atualizam apenas seus aniversariantes" 
ON public.aniversarios FOR UPDATE 
USING (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "Usuários excluem apenas seus aniversariantes" ON public.aniversarios;
CREATE POLICY "Usuários excluem apenas seus aniversariantes" 
ON public.aniversarios FOR DELETE 
USING (user_id = auth.uid() OR user_id IS NULL);

-- 6. POLÍTICAS RLS E FUNÇÕES RPC PARA ALTERAÇÃO E EXCLUSÃO DE USUÁRIOS EM PUBLIC.PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura de perfis para usuários autenticados" ON public.profiles;
CREATE POLICY "Permitir leitura de perfis para usuários autenticados" 
ON public.profiles FOR SELECT 
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Permitir atualização de perfil do próprio usuário" ON public.profiles;
CREATE POLICY "Permitir atualização de perfil do próprio usuário" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Permitir inserção de perfil" ON public.profiles;
CREATE POLICY "Permitir inserção de perfil" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Permitir exclusão de perfil" ON public.profiles;
CREATE POLICY "Permitir exclusão de perfil" 
ON public.profiles FOR DELETE 
USING (auth.role() = 'authenticated');

-- FUNÇÃO RPC PARA ALTERAR STATUS DE USUÁRIO
CREATE OR REPLACE FUNCTION public.alterar_status_usuario(target_email text, novo_status text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET status = novo_status,
      updated_at = now()
  WHERE LOWER(email) = LOWER(target_email);
  
  RETURN FOUND;
END;
$$;

-- FUNÇÃO RPC PARA EXCLUIR USUÁRIO (DELETE REAL DO BANCO DE DADOS SUPABASE)
CREATE OR REPLACE FUNCTION public.excluir_usuario(target_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Buscar o ID do perfil a ser excluído
  SELECT id INTO target_user_id 
  FROM public.profiles 
  WHERE LOWER(email) = LOWER(target_email);

  IF target_user_id IS NOT NULL THEN
    -- Remover dados vinculados ao usuário
    DELETE FROM public.aniversarios WHERE user_id = target_user_id;
    DELETE FROM public.user_settings WHERE user_id = target_user_id;
    DELETE FROM public.notificacoes WHERE user_id = target_user_id;
    
    -- Remover perfil da tabela public.profiles
    DELETE FROM public.profiles WHERE id = target_user_id;

    -- Tentar remover da tabela auth.users se for permitido
    BEGIN
      DELETE FROM auth.users WHERE id = target_user_id;
    EXCEPTION WHEN OTHERS THEN
      -- Se a auth.users for protegida pelo Supabase Auth, o perfil em public.profiles já foi removido
    END;

    RETURN true;
  END IF;

  -- Se não achou na profiles, tentar deletar diretamente por email se existir
  DELETE FROM public.profiles WHERE LOWER(email) = LOWER(target_email);

  RETURN true;
END;
$$;

-- CONCEDER PERMISSÕES DE EXECUÇÃO DAS RPCS PARA USUÁRIOS AUTENTICADOS
GRANT EXECUTE ON FUNCTION public.alterar_status_usuario(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.excluir_usuario(text) TO authenticated;

-- ============================================================
-- SCRIPT CONCLUÍDO COM SUCESSO!
-- ============================================================
