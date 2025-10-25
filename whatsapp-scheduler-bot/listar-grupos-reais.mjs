import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const { data: grupos } = await supabase
  .from('grupos_usuario')
  .select('grupo_jid, grupo_nome, tipo, ativo')
  .order('grupo_nome')

console.log('\n📋 GRUPOS NO SUPABASE:\n')
console.log('='.repeat(60))

grupos?.forEach(g => {
  const emoji = g.tipo === 'grupo' ? '👥' : '📱'
  const status = g.ativo ? '✅' : '⏸️'
  console.log(`${emoji} ${status} ${g.grupo_nome}`)
  console.log(`   JID: ${g.grupo_jid}`)
  console.log('')
})

console.log('='.repeat(60))
console.log(`Total: ${grupos?.length || 0} grupos/contatos`)
console.log('')

