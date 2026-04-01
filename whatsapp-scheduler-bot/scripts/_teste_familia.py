import requests
from datetime import datetime, timezone, timedelta

URL = 'https://aiwwocigvktmtiawslrx.supabase.co'
KEY = ('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im'
       'Fpd3dvY2lndmt0bXRpYXdzbHJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MT'
       'E2MzAxNCwiZXhwIjoyMDc2NzM5MDE0fQ.08l6K4GMKS4fHaFdljOc3Mh_qglmoXTh1BZjOu1WbmQ')
H = {
    'apikey': KEY,
    'Authorization': f'Bearer {KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

# Buscar admin
r = requests.get(f'{URL}/rest/v1/usuarios_autorizados?role=eq.admin&select=id,nome&limit=1', headers=H)
admins = r.json()
if not admins:
    print('Erro: nenhum admin encontrado')
    exit(1)
admin = admins[0]
print(f"Admin: {admin['nome']} ({admin['id']})")

# proximo_envio = agora UTC + 5 min
agora_utc = datetime.now(timezone.utc)
proximo_envio = agora_utc + timedelta(minutes=5)
proximo_envio_iso = proximo_envio.strftime('%Y-%m-%dT%H:%M:%S+00:00')

# hora em BRT
agora_brt   = agora_utc - timedelta(hours=3)
dispara_brt = agora_brt + timedelta(minutes=5)
horario_brt = dispara_brt.strftime('%d/%m/%Y %H:%M')
hora_envio  = dispara_brt.strftime('%H:%M')

GROUP_JID  = '553199120921-1585154002@g.us'
GROUP_NAME = 'Grupo da família'

mensagem = (
    '*Teste WhatsMatic* ✅\n\n'
    'Olá família! Esta é uma mensagem de teste enviada automaticamente pelo bot.\n\n'
    f'🕐 Horário programado: {horario_brt} (Brasília)\n\n'
    '🤖 Bot funcionando corretamente!'
)

payload = {
    'usuario_id':        admin['id'],
    'destinatario_id':   GROUP_JID,
    'destinatario_nome': GROUP_NAME,
    'destinatario_tipo': 'grupo',
    'mensagem':          mensagem,
    'hora_envio':        hora_envio,
    'dias_semana':       None,
    'proximo_envio':     proximo_envio_iso,
    'ativo':             True,
    'randomizar':        False,
    'data_termino':      proximo_envio_iso,
}

r = requests.post(f'{URL}/rest/v1/agendamentos', headers=H, json=payload)
if r.status_code in (200, 201):
    novo = r.json()
    if isinstance(novo, list):
        novo = novo[0]
    print()
    print('✅ Agendamento criado!')
    print(f"   ID:         {novo['id']}")
    print(f"   Grupo:      {GROUP_NAME}")
    print(f"   Dispara em: {horario_brt} BRT")
    print(f"   UTC:        {proximo_envio_iso}")
    print()
    print('⚠️  Certifique-se que o bot está rodando!')
    print('   cd bot && docker compose up -d')
    print('   OU: node src/index.js')
else:
    print(f'Erro {r.status_code}: {r.text}')
