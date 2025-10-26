-- Adicionar coluna para randomização em tempo real
-- A IA gerará variações no momento do envio, sem armazenar no banco
ALTER TABLE agendamentos
ADD COLUMN IF NOT EXISTS randomizar BOOLEAN DEFAULT false;

-- Comentário
COMMENT ON COLUMN agendamentos.randomizar IS 'Indica se o agendamento usa randomização de mensagens em tempo real (IA gera variação a cada envio)';

