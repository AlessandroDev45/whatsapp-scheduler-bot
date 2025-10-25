import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const agora = new Date()
const minutos = agora.getMinutes() + 2
const horas = agora.getHours()
const horario = `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:00`

console.log(`⏰ Horário atual: ${agora.toLocaleTimeString('pt-BR')}`)
console.log(`📅 Agendamento para: ${horario}`)

const { data: usuario } = await supabase
  .from('usuarios_autorizados')
  .select('*')
  .eq('telefone', '553184549893')
  .single()

const { data: grupos } = await supabase
  .from('grupos_usuario')
  .select('*')
  .eq('usuario_id', usuario.id)
  .eq('grupo_jid', '120363318862188145@g.us')

const grupo = grupos && grupos.length > 0 ? grupos[0] : null

if (!grupo) {
  console.error('❌ Grupo não encontrado!')
  process.exit(1)
}

const hoje = new Date()
const diaDaSemana = hoje.getDay() === 0 ? 7 : hoje.getDay()
const proximoEnvio = new Date()
proximoEnvio.setHours(horas, minutos, 0, 0)

const agendamento = {
  usuario_id: usuario.id,
  mensagem: `🧪 TESTE AUTOMÁTICO - ${new Date().toLocaleTimeString('pt-BR')}\n\n✅ Sistema funcionando!\n\nSe você recebeu esta mensagem, o scheduler está enviando corretamente! 🎉`,
  destinatario_tipo: 'grupo',
  destinatario_id: grupo.grupo_jid,
  destinatario_nome: grupo.grupo_nome,
  hora_envio: horario,
  dias_semana: [diaDaSemana],
  data_termino: hoje.toISOString().split('T')[0],
  ativo: true,
  proximo_envio: proximoEnvio.toISOString(),
  modificado_por: usuario.id
}

const { data, error } = await supabase
  .from('agendamentos')
  .insert(agendamento)
  .select()
  .single()

if (error) {
  console.error('❌ Erro:', error)
} else {
  console.log('\n✅ Agendamento criado!')
  console.log(`🆔 ID: ${data.id}`)
  console.log(`👥 Grupo: ${grupo.grupo_nome}`)
  console.log(`⏰ Horário: ${horario}`)
  console.log(`📅 Próximo envio: ${proximoEnvio.toLocaleString('pt-BR')}`)
  console.log(`\n🚀 Rode o scheduler agora:`)
  console.log(`   npm run start:scheduler\n`)
  
  await supabase.from('auditoria_agendamentos').insert({
    agendamento_id: data.id,
    usuario_id: usuario.id,
    acao: 'criado',
    dados_anteriores: null,
    dados_novos: data
  })
}

