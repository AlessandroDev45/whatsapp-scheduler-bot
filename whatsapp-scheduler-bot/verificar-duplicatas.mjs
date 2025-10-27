import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const telefone = '553196797442'

console.log('\n🔍 VERIFICANDO DUPLICATAS...\n')
console.log('='.repeat(70))
console.log(`📞 Telefone: ${telefone}`)
console.log('')

// Buscar TODOS os registros com esse telefone (sem .single())
const { data: usuarios, error } = await supabase
  .from('usuarios_autorizados')
  .select('*')
  .eq('telefone', telefone)
  .order('criado_em', { ascending: false })

if (error) {
  console.log('❌ ERRO:', error)
} else {
  console.log(`📊 Encontrados ${usuarios.length} registro(s):\n`)
  
  usuarios.forEach((u, index) => {
    console.log(`${index + 1}. ${u.ativo ? '✅' : '❌'} ${u.nome}`)
    console.log(`   ID: ${u.id}`)
    console.log(`   Telefone: ${u.telefone}`)
    console.log(`   Role: ${u.role}`)
    console.log(`   Ativo: ${u.ativo}`)
    console.log(`   Criado em: ${new Date(u.criado_em).toLocaleString('pt-BR')}`)
    console.log('')
  })
  
  if (usuarios.length > 1) {
    console.log('⚠️  ATENÇÃO: Há DUPLICATAS!')
    console.log('   Isso pode causar problemas.')
    console.log('')
    console.log('💡 SOLUÇÃO: Deletar os registros duplicados e manter apenas 1.')
  }
}

console.log('='.repeat(70))
console.log('')

