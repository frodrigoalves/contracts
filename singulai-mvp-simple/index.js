// ============================================================================
// SingulAI MVP - Servidor Node.js Completo para singulai.site
// ============================================================================

const express = require('express');
const sqlite3 = require('sqlite3');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'singulai_mvp_secret_2025_secure';
const DOMAIN = process.env.DOMAIN || 'singulai.site';

// Blockchain configuration
const ethers = require('ethers');
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY';
const SGL_TOKEN_ADDRESS = process.env.SGL_TOKEN_ADDRESS || '0xF281a68ae5Baf227bADC1245AC5F9B2F53b7EDe1';
const FAUCET_ADDRESS = process.env.FAUCET_ADDRESS || '0x83a7DEF4072487738979b1aa0816044B533CF2aE';
const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC_URL);

// ============================================================================
// CONFIGURAÇÕES E MIDDLEWARE
// ============================================================================

// CORS configuration
app.use(cors({
  origin: [`https://${DOMAIN}`, `https://www.${DOMAIN}`, `https://api.${DOMAIN}`],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Criar diretório de logs se não existir
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url} - IP: ${req.ip}`);
  next();
});

// ============================================================================
// DATABASE SETUP
// ============================================================================

const db = new sqlite3.Database('./singulai_mvp.sqlite', (err) => {
  if (err) {
    console.error('❌ Erro ao conectar com SQLite:', err.message);
  } else {
    console.log('✅ Conectado ao SQLite database');
  }
});

// Initialize database tables
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    name TEXT,
    wallet_address TEXT UNIQUE,
    preferred_avatar TEXT DEFAULT 'leticia',
    is_verified BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
  )`);
  
  // Conversations table  
  db.run(`CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    session_id TEXT,
    avatar TEXT,
    message TEXT,
    response TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);
  
  // TimeCapsules table
  db.run(`CREATE TABLE IF NOT EXISTS timecapsules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    recipient_email TEXT,
    recipient_name TEXT,
    unlock_date DATE,
    unlock_condition TEXT,
    is_delivered BOOLEAN DEFAULT 0,
    delivery_method TEXT DEFAULT 'email',
    encryption_key TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    delivered_at DATETIME,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // Analytics table
  db.run(`CREATE TABLE IF NOT EXISTS analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT,
    avatar TEXT,
    user_id INTEGER,
    session_id TEXT,
    data TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  console.log('✅ Database tables initialized');
});

// ============================================================================
// AVATARES SISTEMA - PERSONALIDADES E RESPOSTAS
// ============================================================================

const avatars = {
  laura: {
    name: 'Laura',
    icon: '👩‍💼',
    personality: 'analytical_ethical',
    color: '#2E7D32',
    greeting: 'Olá! Sou Laura, especialista em memórias familiares e ética digital. Como posso ajudar você hoje?',
    description: 'Especialista em preservação de memórias familiares, privacidade e ética digital',
    specialties: ['família', 'memórias', 'privacidade', 'ética', 'segurança', 'dados', 'proteção'],
    responses: {
      timecapsule: 'Vou te ajudar a criar um TimeCapsule especial e seguro! Para começar, me conte: essa memória é para família, futuro pessoal ou legado profissional?',
      memoria: 'Que lindo! Preservar memórias é muito importante. Vou te guiar para criar algo significativo e protegido.',
      familia: 'Memórias familiares são preciosas. Posso te ajudar a organizá-las de forma ética e preservada para sempre.',
      privacidade: 'Excelente pergunta sobre privacidade! Vou explicar como protegemos seus dados e memórias de forma transparente.',
      default: 'Como especialista em memórias familiares e ética digital, posso ajudar com TimeCapsules seguras, organização de mensagens pessoais e questões de privacidade. O que você precisa?'
    }
  },
  leticia: {
    name: 'Letícia',
    icon: '👩‍🎨', 
    personality: 'empathetic_creative',
    color: '#E91E63',
    greeting: 'Oi! Eu sou a Letícia! 💖 Vou te ajudar a criar mensagens emocionais lindas e momentos especiais. O que você quer fazer?',
    description: 'Curadora afetiva especializada em mensagens emocionais e relacionamentos',
    specialties: ['amor', 'emoção', 'saudade', 'coração', 'relacionamento', 'carinho', 'afeto', 'sentimento'],
    responses: {
      amor: 'Ai que lindo! 💕 Vou te ajudar a criar uma mensagem cheia de amor e carinho. Para quem é essa mensagem especial?',
      saudade: 'Entendo essa saudade no coração... 💝 Vamos transformar esse sentimento em algo lindo e eterno? Conte-me mais sobre essa pessoa especial.',
      emocao: 'Que emoção maravilhosa! ✨ Vou te ajudar a expressar isso de um jeito que vai tocar o coração de quem receber.',
      relacionamento: 'Relacionamentos são preciosos! 💖 Posso te ajudar a fortalecer laços e criar momentos inesquecíveis.',
      coração: 'Do coração para o coração! 💗 Vamos criar algo que vai emocionar e conectar almas.',
      default: 'Oi amor! 💖 Sou especialista em criar mensagens emocionais e momentos especiais. Como posso alegrar seu coração hoje?'
    }
  },
  pedro: {
    name: 'Pedro',
    icon: '👨‍💻',
    personality: 'logical_precise',
    color: '#1976D2',
    greeting: 'Sou Pedro, especialista técnico e jurídico. Posso ajudar com contratos, validações, blockchain e questões legais.',
    description: 'Executor técnico especialista em contratos inteligentes e validação jurídica',
    specialties: ['contrato', 'blockchain', 'jurídico', 'técnico', 'validação', 'legal', 'smart', 'crypto', 'wallet'],
    responses: {
      contrato: 'Vou te ajudar com a implementação técnica de contratos. Você precisa de validação jurídica, implementação blockchain ou criação de contrato inteligente?',
      blockchain: 'Perfeito! Posso implementar soluções blockchain seguras. Você já tem wallet conectada ou precisa de orientação técnica?',
      juridico: 'Para questões jurídicas, preciso entender o contexto. É sobre validação de documentos, contratos digitais ou compliance?',
      tecnico: 'Questão técnica interessante! Vou analisar e providenciar uma solução precisa e segura.',
      wallet: 'Para conectar sua wallet, preciso verificar algumas configurações técnicas. Qual wallet você usa: MetaMask, Trust Wallet ou outra?',
      default: 'Sou especialista em implementação técnica, contratos inteligentes e validação jurídica. Como posso ajudar com a parte técnica do seu projeto?'
    }
  }
};

// ============================================================================
// FUNÇÕES DE PROCESSAMENTO DE AVATARES
// ============================================================================

function selectAvatar(message, userPreference = null) {
  if (userPreference && avatars[userPreference]) {
    return userPreference;
  }

  const lowerMessage = message.toLowerCase();
  
  // Check for each avatar's specialties
  for (const [avatarId, avatar] of Object.entries(avatars)) {
    if (avatar.specialties.some(word => lowerMessage.includes(word))) {
      return avatarId;
    }
  }
  
  // Default: Letícia (mais acolhedora para novos usuários)
  return 'leticia';
}

function generateAvatarResponse(avatarId, message, user = null) {
  const avatar = avatars[avatarId];
  if (!avatar) return "Desculpe, não encontrei esse avatar.";

  const lowerMessage = message.toLowerCase();
  const responses = avatar.responses;
  
  // Find matching response based on keywords
  for (const [keyword, response] of Object.entries(responses)) {
    if (keyword !== 'default' && lowerMessage.includes(keyword)) {
      // Personalizar resposta com nome do usuário se disponível
      if (user && user.name) {
        return response.replace(/\{user\}/g, user.name);
      }
      return response;
    }
  }
  
  // Default response
  let defaultResponse = responses.default;
  if (user && user.name) {
    defaultResponse = `${user.name}, ${defaultResponse}`;
  }
  
  return defaultResponse;
}

// ============================================================================
// MIDDLEWARE DE AUTENTICAÇÃO
// ============================================================================

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      req.user = null;
    } else {
      req.user = user;
    }
    next();
  });
}

// ============================================================================
// ROTAS DE AUTENTICAÇÃO
// ============================================================================

app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ 
        error: 'Todos os campos são obrigatórios',
        field: 'validation' 
      });
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Email inválido',
        field: 'email' 
      });
    }

    // Validar senha
    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Senha deve ter pelo menos 6 caracteres',
        field: 'password' 
      });
    }
    
    const hashedPassword = await bcrypt.hash(password, 12);
    
    db.run(
      'INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
      [email.toLowerCase(), hashedPassword, name.trim()],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ 
              error: 'Este email já está cadastrado',
              field: 'email' 
            });
          }
          console.error('Erro no registro:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        const userData = { id: this.lastID, email: email.toLowerCase(), name: name.trim() };
        const token = jwt.sign(userData, JWT_SECRET, { expiresIn: '30d' });
        
        // Analytics
        db.run('INSERT INTO analytics (event_type, user_id, data, ip_address) VALUES (?, ?, ?, ?)',
          ['user_register', this.lastID, JSON.stringify({email, name}), req.ip]);
        
        res.json({ 
          success: true,
          token, 
          user: userData,
          message: 'Cadastro realizado com sucesso!' 
        });
      }
    );
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email e senha são obrigatórios',
        field: 'validation' 
      });
    }
    
    db.get(
      'SELECT * FROM users WHERE email = ?',
      [email.toLowerCase()],
      async (err, user) => {
        if (err) {
          console.error('Erro no login:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        if (!user) {
          return res.status(400).json({ 
            error: 'Email não encontrado',
            field: 'email' 
          });
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
          return res.status(400).json({ 
            error: 'Senha incorreta',
            field: 'password' 
          });
        }
        
        const userData = {
          id: user.id,
          email: user.email,
          name: user.name,
          preferred_avatar: user.preferred_avatar
        };
        
        const token = jwt.sign(userData, JWT_SECRET, { expiresIn: '30d' });
        
        // Update last login
        db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
        
        // Analytics
        db.run('INSERT INTO analytics (event_type, user_id, data, ip_address) VALUES (?, ?, ?, ?)',
          ['user_login', user.id, JSON.stringify({email}), req.ip]);
        
        res.json({
          success: true,
          token,
          user: userData,
          message: 'Login realizado com sucesso!'
        });
      }
    );
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/verify-token', authenticateToken, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Token inválido' });
  }
  
  res.json({ 
    success: true,
    user: req.user,
    message: 'Token válido'
  });
});

// ============================================================================
// ROTAS DOS AVATARES E CHAT
// ============================================================================

app.get('/api/avatars', (req, res) => {
  const avatarsInfo = {};
  
  for (const [id, avatar] of Object.entries(avatars)) {
    avatarsInfo[id] = {
      name: avatar.name,
      icon: avatar.icon,
      color: avatar.color,
      description: avatar.description,
      greeting: avatar.greeting
    };
  }
  
  res.json(avatarsInfo);
});

app.post('/api/chat', authenticateToken, (req, res) => {
  try {
    const { message, avatar_id, session_id } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }

    if (message.length > 1000) {
      return res.status(400).json({ error: 'Mensagem muito longa (máximo 1000 caracteres)' });
    }
    
    const user = req.user;
    const userPreference = user ? user.preferred_avatar : null;
    
    // Selecionar avatar automaticamente se não especificado
    const selectedAvatar = avatar_id || selectAvatar(message, userPreference);
    const avatarResponse = generateAvatarResponse(selectedAvatar, message, user);
    
    // Gerar session_id se não fornecido
    const sessionId = session_id || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Salvar conversa no database
    const userId = user ? user.id : null;
    db.run(
      'INSERT INTO conversations (user_id, session_id, avatar, message, response, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, sessionId, selectedAvatar, message, avatarResponse, req.ip, req.get('User-Agent')]
    );
    
    // Analytics
    db.run('INSERT INTO analytics (event_type, avatar, user_id, session_id, data, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
      ['chat_message', selectedAvatar, userId, sessionId, JSON.stringify({message_length: message.length}), req.ip]);
    
    res.json({
      success: true,
      avatar: selectedAvatar,
      avatar_name: avatars[selectedAvatar].name,
      avatar_icon: avatars[selectedAvatar].icon,
      avatar_color: avatars[selectedAvatar].color,
      response: avatarResponse,
      session_id: sessionId,
      user_authenticated: !!user
    });
    
  } catch (error) {
    console.error('Erro no chat:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/api/conversations', authenticateToken, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Login necessário' });
  }
  
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;
  
  db.all(
    `SELECT id, avatar, message, response, created_at 
     FROM conversations 
     WHERE user_id = ? 
     ORDER BY created_at DESC 
     LIMIT ? OFFSET ?`,
    [req.user.id, limit, offset],
    (err, conversations) => {
      if (err) {
        console.error('Erro ao buscar conversas:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
      
      res.json({
        success: true,
        conversations,
        has_more: conversations.length === limit
      });
    }
  );
});

// ============================================================================
// ROTAS TIMECAPSULES
// ============================================================================

app.post('/api/timecapsule', authenticateToken, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Login necessário para criar TimeCapsule' });
  }
  
  try {
    const { title, message, recipient_email, recipient_name, unlock_date } = req.body;
    
    // Validações
    if (!title || !message || !unlock_date) {
      return res.status(400).json({ 
        error: 'Título, mensagem e data são obrigatórios' 
      });
    }

    if (title.length > 100) {
      return res.status(400).json({ error: 'Título muito longo (máximo 100 caracteres)' });
    }

    if (message.length > 5000) {
      return res.status(400).json({ error: 'Mensagem muito longa (máximo 5000 caracteres)' });
    }
    
    // Validar data (deve ser futura)
    const unlockDateObj = new Date(unlock_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (unlockDateObj < today) {
      return res.status(400).json({ 
        error: 'A data de entrega deve ser futura' 
      });
    }
    
    db.run(
      `INSERT INTO timecapsules 
       (user_id, title, message, recipient_email, recipient_name, unlock_date) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, title.trim(), message.trim(), recipient_email, recipient_name, unlock_date],
      function(err) {
        if (err) {
          console.error('Erro ao criar TimeCapsule:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        // Analytics
        db.run('INSERT INTO analytics (event_type, user_id, data, ip_address) VALUES (?, ?, ?, ?)',
          ['timecapsule_created', req.user.id, JSON.stringify({title, unlock_date}), req.ip]);
        
        res.json({
          success: true,
          id: this.lastID,
          title,
          message: '✨ TimeCapsule criada com sucesso! Ela será entregue na data escolhida.',
          unlock_date,
          recipient_email,
          recipient_name
        });
      }
    );
  } catch (error) {
    console.error('Erro ao criar TimeCapsule:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/api/timecapsules', authenticateToken, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Login necessário' });
  }
  
  const limit = parseInt(req.query.limit) || 20;
  const offset = parseInt(req.query.offset) || 0;
  
  db.all(
    `SELECT id, title, recipient_email, recipient_name, unlock_date, 
            is_delivered, created_at, delivered_at
     FROM timecapsules 
     WHERE user_id = ? 
     ORDER BY created_at DESC 
     LIMIT ? OFFSET ?`,
    [req.user.id, limit, offset],
    (err, capsules) => {
      if (err) {
        console.error('Erro ao buscar TimeCapsules:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
      
      res.json({
        success: true,
        timecapsules: capsules,
        total: capsules.length,
        has_more: capsules.length === limit
      });
    }
  );
});

app.get('/api/timecapsule/:id', authenticateToken, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Login necessário' });
  }
  
  const { id } = req.params;
  
  db.get(
    `SELECT * FROM timecapsules 
     WHERE id = ? AND user_id = ?`,
    [id, req.user.id],
    (err, capsule) => {
      if (err) {
        console.error('Erro ao buscar TimeCapsule:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
      
      if (!capsule) {
        return res.status(404).json({ error: 'TimeCapsule não encontrada' });
      }
      
      res.json({
        success: true,
        timecapsule: capsule
      });
    }
  );
});

// ============================================================================
// ROTAS DE ANALYTICS E ESTATÍSTICAS
// ============================================================================

app.get('/api/stats', (req, res) => {
  const stats = {};
  
  // Total de conversas por avatar
  db.all(
    'SELECT avatar, COUNT(*) as count FROM conversations GROUP BY avatar',
    [],
    (err, avatarStats) => {
      if (err) {
        console.error('Erro nas estatísticas:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
      
      stats.avatar_conversations = {};
      avatarStats.forEach(stat => {
        stats.avatar_conversations[stat.avatar] = stat.count;
      });
      
      // Total de usuários
      db.get('SELECT COUNT(*) as count FROM users', [], (err, userCount) => {
        if (!err) stats.total_users = userCount.count;
        
        // Total de TimeCapsules
        db.get('SELECT COUNT(*) as count FROM timecapsules', [], (err, capsuleCount) => {
          if (!err) stats.total_timecapsules = capsuleCount.count;
          
          // Conversas hoje
          db.get(
            `SELECT COUNT(*) as count FROM conversations 
             WHERE DATE(created_at) = DATE('now')`,
            [],
            (err, todayCount) => {
              if (!err) stats.conversations_today = todayCount.count;
              
              res.json({
                success: true,
                stats
              });
            }
          );
        });
      });
    }
  );
});

// ============================================================================
// ROTAS ESTÁTICAS E PRINCIPAIS
// ============================================================================

// Faucet endpoint for requesting test tokens
app.post('/api/faucet', async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address || !ethers.utils.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid Ethereum address' });
    }

    // Create contract instance
    const faucetContract = new ethers.Contract(
      FAUCET_ADDRESS,
      ['function requestTokens() external'],
      provider
    );

    // Call faucet function (this would require a signer with gas, but for demo we'll simulate)
    // In production, you'd need a backend wallet to pay gas fees
    
    res.json({ 
      success: true, 
      message: 'Faucet request simulated. In production, this would mint tokens to your address.',
      address: address,
      amount: '50 SGL'
    });
    
  } catch (error) {
    console.error('Faucet error:', error);
    res.status(500).json({ error: 'Failed to process faucet request' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    domain: DOMAIN,
    version: '1.0.0'
  });
});

// Rota principal - serve o frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Fallback para SPAs
app.get('*', (req, res) => {
  // Se for uma rota da API que não existe
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint não encontrado' });
  }
  
  // Para outras rotas, serve o index.html (SPA)
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// Global error handler
app.use((err, req, res, next) => {
  console.error('Erro global:', err);
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// ============================================================================
// INICIAR SERVIDOR
// ============================================================================

const server = app.listen(PORT, () => {
  console.log(`\n🚀 SingulAI MVP rodando!`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🌐 Domínio: ${DOMAIN}`);
  console.log(`🤖 Avatares: Laura, Letícia, Pedro`);
  console.log(`📦 Database: SQLite local`);
  console.log(`🔐 Auth: JWT seguro`);
  console.log(`⏰ Iniciado em: ${new Date().toLocaleString('pt-BR')}\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Recebido SIGTERM, fechando servidor...');
  server.close(() => {
    console.log('✅ Servidor fechado graciosamente');
    db.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Recebido SIGINT, fechando servidor...');
  server.close(() => {
    console.log('✅ Servidor fechado graciosamente');
    db.close();
    process.exit(0);
  });
});