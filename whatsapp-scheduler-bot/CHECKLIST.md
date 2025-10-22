# ✅ CHECKLIST DE IMPLANTAÇÃO

Use este checklist para acompanhar seu progresso na implantação do bot.

---

## 📋 FASE 1: SUPABASE

- [ ] 1.1 - Projeto criado no Supabase
- [ ] 1.2 - Script SQL executado (4 tabelas criadas)
- [ ] 1.3 - Credenciais copiadas e salvas:
  - [ ] Project URL
  - [ ] service_role Key
  - [ ] Project Ref ID
- [ ] 1.4 - Arquivo `.env` criado e preenchido
- [ ] 1.5 - Link com projeto Supabase feito (`npx supabase link`)
- [ ] 1.6 - Segredos configurados (`npx supabase secrets set`)
- [ ] 1.7 - Edge Function implantada (`npx supabase functions deploy`)
- [ ] 1.7.1 - URL da Edge Function copiada

**Valores Salvos:**
```
Project URL: _______________________________________
service_role Key: __________________________________
Project Ref ID: ____________________________________
Edge Function URL: _________________________________
```

---

## 📋 FASE 2: GITHUB

- [ ] 2.1 - Repositório criado no GitHub (PRIVATE)
- [ ] 2.2 - Código enviado para o GitHub
- [ ] 2.3 - Segredos configurados no GitHub Actions:
  - [ ] SUPABASE_URL
  - [ ] SUPABASE_SERVICE_KEY
  - [ ] EVOLUTION_API_URL (temporário)
  - [ ] EVOLUTION_API_KEY (temporário)
  - [ ] GROUP_ID (temporário)
  - [ ] BOT_INSTANCE_NAME

**Valores Salvos:**
```
URL do Repositório: ________________________________
```

---

## 📋 FASE 3: EVOLUTION API

- [ ] 3.1 - Deploy no Render.com iniciado
- [ ] 3.1.1 - Variável AUTHENTICATION_API_KEY configurada
- [ ] 3.1.2 - Deploy concluído (status "live")
- [ ] 3.2 - URL da Evolution API copiada
- [ ] 3.3 - Manager acessado (/manager)
- [ ] 3.3.1 - Instância "main" criada
- [ ] 3.3.2 - Webhook configurado (URL da Edge Function)
- [ ] 3.3.3 - QR Code escaneado com +55 19 98720 0383
- [ ] 3.3.4 - Status "Connected" confirmado
- [ ] 3.4 - Grupo "Envios" criado
- [ ] 3.4.1 - Bot (+55 19 98720 0383) adicionado ao grupo
- [ ] 3.5 - ID do grupo copiado

**Valores Salvos:**
```
EVOLUTION_API_URL: _________________________________
EVOLUTION_API_KEY: _________________________________
GROUP_ID: __________________________________________
```

---

## 📋 FASE 4: ATUALIZAÇÃO DOS SEGREDOS

- [ ] 4.1 - Segredos atualizados no GitHub:
  - [ ] EVOLUTION_API_URL
  - [ ] EVOLUTION_API_KEY
  - [ ] GROUP_ID
- [ ] 4.2 - Arquivo `.env` local atualizado
- [ ] 4.3 - Segredos atualizados no Supabase
- [ ] 4.3.1 - Edge Function reimplantada

---

## 📋 FASE 5: TESTE FINAL

- [ ] 5.1 - Workflow "Sync Group Members" executado
- [ ] 5.2 - Mensagem `/menu` enviada no grupo
- [ ] 5.2.1 - Mensagem privada recebida do bot ✅

---

## 🎉 STATUS FINAL

- [ ] **BOT FUNCIONANDO PERFEITAMENTE!**

---

## 📝 NOTAS E OBSERVAÇÕES

Use este espaço para anotar qualquer problema ou observação durante a implantação:

```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

