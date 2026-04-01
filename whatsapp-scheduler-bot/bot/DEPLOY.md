# 🚀 DEPLOY — GitHub Actions (grátis, 24/7)

O bot roda **dentro do GitHub Actions** como workflow agendado. Sem servidor externo, sem custo.

**Como funciona:**
- GitHub executa o bot a cada 5 horas (limite de 6h por job)
- A sessão WhatsApp fica salva no **GitHub Actions Cache** — não precisa escanear QR Code toda vez
- O scheduler continua funcionando normalmente dentro do job

---

## PASSO 1 — Colocar o código no GitHub

Se ainda não tem o repositório criado:

1. Acesse [github.com/new](https://github.com/new) e crie um repositório (ex: `whatsmatic`)
2. Na pasta do projeto, rode:

```bash
git init
git add .
git commit -m "primeiro commit"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/whatsmatic.git
git push -u origin main
```

---

## PASSO 2 — Configurar os Secrets

No repositório GitHub: **Settings → Secrets and variables → Actions → New repository secret**

Adicione cada um destes secrets:

| Secret | Onde pegar |
|---|---|
| `SUPABASE_URL` | `https://aiwwocigvktmtiawslrx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase → Project Settings → API → service_role key |
| `SUPABASE_WEBHOOK_URL` | `https://aiwwocigvktmtiawslrx.supabase.co/functions/v1/webhook-whatsapp` |
| `MISTRAL_API_KEY` | Sua chave da Mistral AI |
| `BOT_INSTANCE_NAME` | `whatsapp_bot` |

---

## PASSO 3 — Ativar o workflow

1. Vá em **Actions** no repositório
2. Clique em **"🤖 Run WhatsApp Bot"**
3. Clique em **"Run workflow"** → **"Run workflow"** (botão verde)
4. O job vai iniciar em segundos

---

## PASSO 4 — Escanear o QR Code (apenas na primeira vez)

1. Abra o job em execução em **Actions → Run WhatsApp Bot → run-bot**
2. Expanda o step **"Iniciar bot WhatsApp"**
3. Aguarde o QR Code aparecer nos logs
4. Abra o WhatsApp → **Dispositivos Conectados → Conectar dispositivo**
5. Escaneie o QR Code

Após escanear, nos logs vai aparecer:
```
✅ WhatsApp conectado com sucesso!
```

A sessão fica salva no cache. **Nas próximas execuções não precisa escanear.**

---

## Como o bot reinicia automaticamente

O workflow está configurado para rodar a cada 5 horas via `cron`:

```yaml
schedule:
  - cron: '0 */5 * * *'
```

Quando um job termina (por timeout de 5h30), o próximo já está agendado para iniciar. O bot fica rodando 24/7 sem intervenção manual.

---

## Comandos úteis

### Iniciar manualmente
GitHub → **Actions → 🤖 Run WhatsApp Bot → Run workflow**

### Ver logs em tempo real
GitHub → **Actions → Run WhatsApp Bot** → clique no job em execução → step "Iniciar bot WhatsApp"

### Parar o bot
GitHub → **Actions → Run WhatsApp Bot** → clique no job → **Cancel workflow**

### Forçar novo QR Code (reconectar)
1. Cancele o job em execução
2. Exclua o cache: **Actions → Caches** → delete `whatsapp-auth-session`
3. Rode o workflow novamente e escaneie o novo QR Code

---

## Limites do plano grátis do GitHub

| Recurso | Limite grátis |
|---|---|
| Minutos/mês | 2.000 min (repositório público: **ilimitado**) |
| Armazenamento de cache | 10 GB |
| Duração máxima de um job | 6 horas |

> 💡 **Recomendação:** Deixe o repositório **público** para ter minutos ilimitados.
> Se preferir privado, 2.000 min/mês = ~33h — insuficiente para 24/7. Nesse caso use Docker local ou uma VPS.

---

## Alternativa: Docker local

Se preferir rodar na sua máquina com Docker:

```bash
cp .env.example .env   # preencher com as credenciais
docker compose up -d
docker compose logs -f   # ver QR Code na primeira vez
```

