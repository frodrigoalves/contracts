# 🚀 SingulAI MVP - Deploy para singulai.site

Este é o MVP da SingulAI, uma plataforma de avatares inteligentes e TimeCapsules para preservação de memórias e legados digitais.

## 📋 Funcionalidades

### 🤖 Avatares Especializados
- **Laura** (👩‍💼): Especialista em memórias familiares e ética digital
- **Letícia** (👩‍🎨): Curadora afetiva para mensagens emocionais
- **Pedro** (👨‍💻): Executor técnico para contratos e blockchain

### 🔧 Recursos
- ✅ Sistema de autenticação (login/registro)
- ✅ Chat inteligente com múltiplos avatares
- ✅ TimeCapsules para entrega futura de mensagens
- ✅ Interface responsiva e moderna
- ✅ Banco de dados SQLite integrado
- ✅ Autenticação JWT
- ✅ Design mobile-first

## 🏗️ Arquitetura Técnica

### Backend (Node.js + Express)
```
- Express.js server
- SQLite database
- JWT authentication
- bcrypt password hashing
- CORS enabled
- API RESTful completa
```

### Frontend (Vanilla JS)
```
- Responsive design
- Modern CSS animations
- Real-time chat interface
- Modal system
- Toast notifications
- Loading states
```

### Base de Dados
```sql
-- Tabelas principais:
- users (id, name, email, password_hash, created_at)
- conversations (id, user_id, avatar, message, response, session_id, created_at)
- timecapsules (id, user_id, title, message, recipient_name, recipient_email, unlock_date, is_delivered, created_at)
```

## 🚀 Deploy no VPS

### 1. Preparação do VPS
```bash
# SSH no servidor
ssh root@srv993737.hostinger.com

# Instalar Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Instalar PM2 globalmente
npm install -g pm2

# Criar diretório do projeto
mkdir -p /opt/singulai-mvp
cd /opt/singulai-mvp
```

### 2. Upload dos Arquivos
```bash
# No seu computador local (PowerShell), subir os arquivos:
scp -r singulai-mvp-simple/* root@srv993737.hostinger.com:/opt/singulai-mvp/

# Ou comprimir e enviar:
tar -czf singulai-mvp.tar.gz singulai-mvp-simple/*
scp singulai-mvp.tar.gz root@srv993737.hostinger.com:/opt/
```

### 3. Instalação no Servidor
```bash
# SSH no servidor
ssh root@srv993737.hostinger.com

# Ir para o diretório
cd /opt/singulai-mvp

# Instalar dependências
npm install --production

# Criar banco de dados e diretórios necessários
mkdir -p data logs
touch data/singulai.db

# Configurar permissões
chown -R www-data:www-data /opt/singulai-mvp
chmod -R 755 /opt/singulai-mvp

# Iniciar aplicação com PM2
pm2 start ecosystem.config.js

# Configurar PM2 para inicializar no boot
pm2 startup
pm2 save
```

### 4. Configurar Nginx

```bash
# Criar configuração do Nginx
nano /etc/nginx/sites-available/singulai.site
```

```nginx
server {
    listen 80;
    server_name singulai.site www.singulai.site;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

```bash
# Ativar o site
ln -s /etc/nginx/sites-available/singulai.site /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### 5. Configurar SSL com Certbot
```bash
# Instalar Certbot
apt update
apt install certbot python3-certbot-nginx

# Obter certificado SSL
certbot --nginx -d singulai.site -d www.singulai.site

# Configurar renovação automática
crontab -e
# Adicionar linha:
0 12 * * * /usr/bin/certbot renew --quiet
```

### 6. Configurar DNS na Hostinger

No painel da Hostinger (hpanel):
1. Ir em **Domínios** → **singulai.site** → **DNS**
2. Alterar os registros A:
   - **@** → IP do VPS (srv993737.hostinger.com)
   - **www** → IP do VPS (srv993737.hostinger.com)
3. Remover redirecionamentos do Netlify se existirem

## 📊 Monitoramento

### Logs da Aplicação
```bash
# Ver logs em tempo real
pm2 logs singulai-mvp

# Ver status
pm2 status

# Reiniciar aplicação
pm2 restart singulai-mvp

# Ver métricas
pm2 monit
```

### Logs do Sistema
```bash
# Logs do Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Logs do sistema
journalctl -fu nginx
journalctl -fu pm2-root
```

## 🔧 Comandos Úteis de Manutenção

```bash
# Backup do banco de dados
cp /opt/singulai-mvp/data/singulai.db /opt/singulai-mvp/data/backup_$(date +%Y%m%d_%H%M%S).db

# Ver uso de recursos
htop
df -h
free -h

# Limpar logs antigos
pm2 flush
find /opt/singulai-mvp/logs -name "*.log" -mtime +7 -delete

# Reiniciar todos os serviços
pm2 restart all
systemctl restart nginx
```

## 🚀 Deploy Rápido (Script de Uma Linha)

Criar arquivo `deploy.sh`:
```bash
#!/bin/bash
cd /opt/singulai-mvp
git pull origin main  # se usar Git
npm install --production
pm2 reload ecosystem.config.js
echo "✅ Deploy realizado com sucesso!"
```

## 📱 Testes Pós-Deploy

1. **Frontend**: Acessar https://singulai.site
2. **API**: Testar endpoints em https://singulai.site/api/avatars
3. **SSL**: Verificar certificado válido
4. **Performance**: Testar tempo de resposta
5. **Mobile**: Testar em dispositivos móveis

## 🔒 Segurança

- ✅ HTTPS com certificado válido
- ✅ Headers de segurança configurados
- ✅ Senhas hasheadas com bcrypt
- ✅ JWT para autenticação
- ✅ Validação de entrada de dados
- ✅ CORS configurado adequadamente

## 📈 Performance Esperada

- **RAM**: ~200MB por processo
- **CPU**: Baixo uso (<10% em idle)
- **Disk**: ~50MB para aplicação
- **Response Time**: <500ms média
- **Concurrent Users**: ~100 usuários simultâneos

## 🎯 Próximos Passos

1. Configurar backup automático do banco
2. Implementar rate limiting
3. Adicionar analytics básico
4. Configurar alertas de monitoramento
5. Otimizar queries do banco de dados

---

**MVP pronto para produção em singulai.site! 🚀**