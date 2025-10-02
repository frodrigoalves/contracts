# ============================================================================
# SingulAI MVP - Configuração de Deploy VPS
# ============================================================================

## 🔧 Pré-requisitos

1. **VPS com Ubuntu 20.04+ ou Debian 10+**
2. **Acesso SSH configurado com chave ed25519**
3. **Domínio apontado para o IP da VPS**

### 🔑 Configuração SSH

Sua chave pública SSH:
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMiP/EvRcH3kfh6wkto6mrPGRDSA0kn49z8jE76aXPi5 f.rodrigoalves12@gmail.com
```

**Configure o SSH:**
```bash
# 1. Execute o script de configuração SSH
chmod +x setup-ssh.sh
./setup-ssh.sh

# 2. Copie sua chave para a VPS (substitua pelo IP real)
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@SEU_IP_VPS
```

## 🚀 Deploy Automático

### 1. Configurar SSH e variáveis de ambiente
```bash
# Configurar SSH
chmod +x setup-ssh.sh
./setup-ssh.sh

# Configurar environment
cp .env.example .env
```

Edite o arquivo `.env` com os dados da sua VPS:
```bash
# VPS Configuration - Hostinger Brazil KVM 2
VPS_IP=72.60.147.56
VPS_USER=root
VPS_HOSTNAME=srv993737.hstgr.cloud
DOMAIN=singulai.site

# VPS Specs: 2 CPU cores, 8GB RAM, 100GB disk, Ubuntu 22.04 LTS
# Location: Brazil - São Paulo

# SSH Configuration (já configurado)
SSH_KEY_PATH=~/.ssh/id_ed25519
SSH_PUBLIC_KEY=ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMiP/EvRcH3kfh6wkto6mrPGRDSA0kn49z8jE76aXPi5 f.rodrigoalves12@gmail.com

# Blockchain (já configurado)
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
SGL_TOKEN_ADDRESS=0xF281a68ae5Baf227bADC1245AC5F9B2F53b7EDe1
FAUCET_ADDRESS=0x83a7DEF4072487738979b1aa0816044B533CF2aE
```

### 1.5. Autorizar chave SSH na VPS
```bash
# Copiar chave para VPS Hostinger Brazil
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@72.60.147.56

# Testar conexão
ssh -i ~/.ssh/id_ed25519 root@72.60.147.56

# Ou usando hostname
ssh -i ~/.ssh/id_ed25519 root@srv993737.hstgr.cloud
```

### 2. Executar deploy
```bash
chmod +x deploy-vps.sh
./deploy-vps.sh
```

O script irá:
- ✅ Instalar Node.js, Nginx, PM2, SQLite
- ✅ Configurar aplicação em `/var/www/singulai-mvp`
- ✅ Configurar Nginx com proxy reverso
- ✅ Configurar SSL com Let's Encrypt
- ✅ Iniciar aplicação com PM2

### 3. Atualizar aplicação
```bash
chmod +x update-vps.sh
./update-vps.sh
```

## 🗄️ Banco de Dados

O sistema usa **SQLite** para simplicidade e performance:

### Tabelas criadas automaticamente:
- `users` - Usuários e carteiras
- `conversations` - Conversas com avatares
- `timecapsules` - Cápsulas temporais
- `analytics` - Métricas e eventos

### Backup do banco:
```bash
ssh user@vps "cd /var/www/singulai-mvp && cp singulai_mvp.sqlite backup_$(date +%Y%m%d).sqlite"
```

## 🔍 Monitoramento

### Comandos úteis na VPS:
```bash
# Status da aplicação
pm2 status

# Logs em tempo real
pm2 logs

# Reiniciar aplicação
pm2 reload ecosystem.config.js

# Status do Nginx
systemctl status nginx

# Logs do Nginx
tail -f /var/log/nginx/singulai.site.access.log
```

### Métricas importantes:
- CPU e RAM do processo Node.js
- Conexões ativas no banco SQLite
- Logs de requisições HTTP
- Status dos certificados SSL

## 🔒 Segurança

### Configurações implementadas:
- ✅ SSL/TLS com Let's Encrypt
- ✅ Firewall UFW configurado
- ✅ Headers de segurança HTTP
- ✅ Rate limiting para APIs
- ✅ Validação de entrada de dados
- ✅ JWT para autenticação

### Recomendações adicionais:
```bash
# Configurar firewall
ufw enable
ufw allow ssh
ufw allow 'Nginx Full'

# Configurar fail2ban
apt install fail2ban
systemctl enable fail2ban
```

## 🧪 Teste Local

Antes do deploy, teste localmente:

```bash
# Instalar dependências
npm install

# Criar .env local
cp .env.example .env

# Iniciar servidor
npm start
```

Acesse: http://localhost:3000

## 📊 Estrutura de Arquivos na VPS

```
/var/www/singulai-mvp/
├── index.js              # Servidor principal
├── package.json          # Dependências
├── ecosystem.config.js   # Configuração PM2
├── .env                  # Variáveis de ambiente
├── singulai_mvp.sqlite   # Banco de dados
├── logs/                 # Logs da aplicação
└── public/               # Arquivos estáticos
    ├── index.html
    ├── app.js
    └── style.css
```

## 🔄 Processo de Deploy

1. **Preparação**: Arquivo tar.gz com código atualizado
2. **Upload**: SCP para `/tmp/` na VPS
3. **Backup**: Backup da versão atual
4. **Extração**: Arquivos no diretório da aplicação
5. **Instalação**: `npm install` para dependências
6. **Configuração**: Permissões e ambiente
7. **Restart**: PM2 reload da aplicação

## 🆘 Troubleshooting

### Aplicação não inicia:
```bash
pm2 logs
```

### Nginx não funciona:
```bash
nginx -t
systemctl status nginx
```

### SSL não funciona:
```bash
certbot certificates
certbot renew --dry-run
```

### Banco de dados corrompido:
```bash
sqlite3 singulai_mvp.sqlite ".schema"
```