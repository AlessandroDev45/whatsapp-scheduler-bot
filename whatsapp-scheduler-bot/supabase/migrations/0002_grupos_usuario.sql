-- Migration: Criar tabela grupos_usuario para cache local de grupos/contatos
-- Data: 2025-10-23
-- Descrição: Armazena grupos e contatos do WhatsApp de cada usuário para busca rápida

-- Criar tabela grupos_usuario
CREATE TABLE IF NOT EXISTS public.grupos_usuario (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES public.usuarios_autorizados(id) ON DELETE CASCADE,
  grupo_jid TEXT NOT NULL,
  grupo_nome TEXT NOT NULL,
  tipo TEXT DEFAULT 'grupo' CHECK (tipo IN ('grupo', 'contato')),
  membros INTEGER DEFAULT 0,
  ultima_sincronizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Garantir que não haja duplicatas (mesmo grupo para mesmo usuário)
  UNIQUE(usuario_id, grupo_jid)
);

-- Criar índices para otimizar buscas
CREATE INDEX IF NOT EXISTS idx_grupos_usuario_usuario_id ON public.grupos_usuario(usuario_id);
CREATE INDEX IF NOT EXISTS idx_grupos_usuario_grupo_nome ON public.grupos_usuario(grupo_nome);
CREATE INDEX IF NOT EXISTS idx_grupos_usuario_ativo ON public.grupos_usuario(ativo);
CREATE INDEX IF NOT EXISTS idx_grupos_usuario_tipo ON public.grupos_usuario(tipo);

-- Criar índice composto para busca por nome + usuário (mais comum)
CREATE INDEX IF NOT EXISTS idx_grupos_usuario_busca ON public.grupos_usuario(usuario_id, ativo, grupo_nome);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_grupos_usuario_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_grupos_usuario_updated_at ON public.grupos_usuario;
CREATE TRIGGER trigger_update_grupos_usuario_updated_at
  BEFORE UPDATE ON public.grupos_usuario
  FOR EACH ROW
  EXECUTE FUNCTION public.update_grupos_usuario_updated_at();

-- Habilitar RLS
ALTER TABLE public.grupos_usuario ENABLE ROW LEVEL SECURITY;

-- Política de acesso (apenas se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'grupos_usuario'
    AND policyname = 'Permitir acesso total para service_role'
  ) THEN
    CREATE POLICY "Permitir acesso total para service_role"
    ON public.grupos_usuario
    FOR ALL
    USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Comentários na tabela
COMMENT ON TABLE public.grupos_usuario IS 'Cache local de grupos e contatos do WhatsApp de cada usuário';
COMMENT ON COLUMN public.grupos_usuario.usuario_id IS 'Referência ao usuário dono do grupo/contato';
COMMENT ON COLUMN public.grupos_usuario.grupo_jid IS 'JID do grupo/contato no WhatsApp (ex: 120363XXXXX@g.us)';
COMMENT ON COLUMN public.grupos_usuario.grupo_nome IS 'Nome do grupo/contato';
COMMENT ON COLUMN public.grupos_usuario.tipo IS 'Tipo: grupo ou contato';
COMMENT ON COLUMN public.grupos_usuario.membros IS 'Número de membros (apenas para grupos)';
COMMENT ON COLUMN public.grupos_usuario.ultima_sincronizacao IS 'Data/hora da última sincronização com WhatsApp';
COMMENT ON COLUMN public.grupos_usuario.ativo IS 'Se o grupo/contato ainda está ativo';

