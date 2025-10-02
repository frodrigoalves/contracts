// ============================================================================
// SingulAI MVP - Frontend JavaScript para singulai.site
// Gerencia autenticação, avatares, chat e TimeCapsules
// ============================================================================

// ============================================================================
// GLOBAL VARIABLES
// ============================================================================

let currentUser = null;
let currentAvatar = 'leticia';
let authToken = localStorage.getItem('singulai_token');
let sessionId = null;
let avatarsData = {};
let isLoading = false;

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 SingulAI MVP inicializando...');
    
    // Show loading screen
    showLoadingScreen();
    
    // Initialize app after small delay for smooth loading
    setTimeout(() => {
        initializeApp();
    }, 1500);
});

async function initializeApp() {
    try {
        // Setup event listeners
        setupEventListeners();
        
        // Load avatars data
        await loadAvatarsData();
        
        // Validate existing token
        if (authToken) {
            await validateToken();
        } else {
            showAuthSection();
        }
        
        hideLoadingScreen();
        
    } catch (error) {
        console.error('Erro na inicialização:', error);
        hideLoadingScreen();
        showAuthSection();
    }
}

function showLoadingScreen() {
    document.getElementById('loadingScreen').style.display = 'flex';
    document.getElementById('mainContent').style.display = 'none';
}

function hideLoadingScreen() {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
}

// ============================================================================
// EVENT LISTENERS SETUP
// ============================================================================

function setupEventListeners() {
    // Auth forms
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const timecapsuleForm = document.getElementById('timecapsuleForm');
    
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (registerForm) registerForm.addEventListener('submit', handleRegister);
    if (timecapsuleForm) timecapsuleForm.addEventListener('submit', handleTimeCapsule);
    
    // Message input
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        messageInput.addEventListener('input', updateMessageCounter);
    }
    
    // Close modals when clicking outside
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal-backdrop')) {
            const modal = e.target.closest('.modal');
            if (modal) {
                closeModal(modal.id);
            }
        }
    });
    
    // Close modals with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const openModals = document.querySelectorAll('.modal:not(.hidden)');
            openModals.forEach(modal => closeModal(modal.id));
        }
    });
}

// ============================================================================
// AVATARS DATA LOADING
// ============================================================================

async function loadAvatarsData() {
    try {
        const response = await fetch('/api/avatars');
        const data = await response.json();
        
        if (response.ok) {
            avatarsData = data;
            renderAvatarsGrid();
        } else {
            console.error('Erro ao carregar avatares:', data.error);
            // Fallback to default avatars
            avatarsData = getDefaultAvatars();
            renderAvatarsGrid();
        }
    } catch (error) {
        console.error('Erro na requisição de avatares:', error);
        avatarsData = getDefaultAvatars();
        renderAvatarsGrid();
    }
}

function getDefaultAvatars() {
    return {
        laura: {
            name: 'Laura',
            icon: '👩‍💼',
            color: '#2E7D32',
            description: 'Especialista em memórias familiares e ética digital',
            greeting: 'Olá! Sou Laura, especialista em memórias familiares e ética digital. Como posso ajudar você hoje?'
        },
        leticia: {
            name: 'Letícia',
            icon: '👩‍🎨',
            color: '#E91E63',
            description: 'Curadora afetiva especializada em mensagens emocionais',
            greeting: 'Oi! Eu sou a Letícia! 💖 Vou te ajudar a criar mensagens emocionais lindas. O que você quer fazer?'
        },
        pedro: {
            name: 'Pedro',
            icon: '👨‍💻',
            color: '#1976D2',
            description: 'Executor técnico especialista em contratos inteligentes',
            greeting: 'Sou Pedro, especialista técnico e jurídico. Posso ajudar com contratos, validações, blockchain e questões legais.'
        }
    };
}

function renderAvatarsGrid() {
    const avatarsGrid = document.getElementById('avatarsGrid');
    if (!avatarsGrid) return;
    
    avatarsGrid.innerHTML = '';
    
    for (const [avatarId, avatar] of Object.entries(avatarsData)) {
        const avatarCard = createAvatarCard(avatarId, avatar);
        avatarsGrid.appendChild(avatarCard);
    }
}

function createAvatarCard(avatarId, avatar) {
    const card = document.createElement('div');
    card.className = `avatar-card avatar-${avatarId}`;
    card.style.setProperty('--avatar-color', avatar.color);
    card.onclick = () => selectAvatar(avatarId);
    
    card.innerHTML = `
        <div class="avatar-icon">${avatar.icon}</div>
        <h3>${avatar.name}</h3>
        <p>${avatar.description}</p>
        <div class="specialty-tag">Clique para conversar</div>
    `;
    
    return card;
}

// ============================================================================
// AUTHENTICATION FUNCTIONS
// ============================================================================

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const errorDiv = document.getElementById('loginError');
    
    // Validation
    if (!email || !password) {
        showFormError('loginError', 'Email e senha são obrigatórios');
        return;
    }
    
    // Set loading state
    setButtonLoading(submitBtn, true);
    hideFormError('loginError');
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('singulai_token', authToken);
            
            showToast('Login realizado com sucesso!', 'success');
            showAvatarSelection();
            
            // Reset form
            e.target.reset();
            
        } else {
            showFormError('loginError', data.error || 'Erro no login');
        }
    } catch (error) {
        console.error('Erro no login:', error);
        showFormError('loginError', 'Erro de conexão. Tente novamente.');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // Validation
    if (!name || !email || !password) {
        showFormError('registerError', 'Todos os campos são obrigatórios');
        return;
    }
    
    if (password.length < 6) {
        showFormError('registerError', 'Senha deve ter pelo menos 6 caracteres');
        return;
    }
    
    if (!isValidEmail(email)) {
        showFormError('registerError', 'Email inválido');
        return;
    }
    
    // Set loading state
    setButtonLoading(submitBtn, true);
    hideFormError('registerError');
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('singulai_token', authToken);
            
            showToast('Cadastro realizado com sucesso!', 'success');
            showAvatarSelection();
            
            // Reset form
            e.target.reset();
            
        } else {
            showFormError('registerError', data.error || 'Erro no cadastro');
        }
    } catch (error) {
        console.error('Erro no cadastro:', error);
        showFormError('registerError', 'Erro de conexão. Tente novamente.');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

async function validateToken() {
    try {
        const response = await fetch('/api/verify-token', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            currentUser = data.user;
            showAvatarSelection();
        } else {
            localStorage.removeItem('singulai_token');
            authToken = null;
            showAuthSection();
        }
    } catch (error) {
        console.error('Erro na validação do token:', error);
        localStorage.removeItem('singulai_token');
        authToken = null;
        showAuthSection();
    }
}

function continueWithoutLogin() {
    showAvatarSelection();
}

function logout() {
    authToken = null;
    currentUser = null;
    sessionId = null;
    localStorage.removeItem('singulai_token');
    
    showToast('Logout realizado com sucesso!', 'success');
    showAuthSection();
}

// ============================================================================
// NAVIGATION FUNCTIONS
// ============================================================================

function showAuthSection() {
    hideAllSections();
    document.getElementById('authSection').classList.remove('hidden');
    document.getElementById('userInfo').classList.add('hidden');
}

function showAvatarSelection() {
    hideAllSections();
    document.getElementById('avatarSection').classList.remove('hidden');
    
    if (currentUser) {
        document.getElementById('userInfo').classList.remove('hidden');
        document.getElementById('userName').textContent = currentUser.name;
    }
}

function showChat() {
    hideAllSections();
    document.getElementById('chatSection').classList.remove('hidden');
    
    if (currentUser) {
        document.getElementById('userInfo').classList.remove('hidden');
        document.getElementById('userName').textContent = currentUser.name;
    }
}

function hideAllSections() {
    const sections = ['authSection', 'avatarSection', 'chatSection'];
    sections.forEach(sectionId => {
        document.getElementById(sectionId).classList.add('hidden');
    });
}

function showLogin() {
    document.getElementById('loginForm').style.display = 'flex';
    document.getElementById('registerForm').style.display = 'none';
    
    // Update tabs
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-btn')[0].classList.add('active');
}

function showRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'flex';
    
    // Update tabs
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-btn')[1].classList.add('active');
}

// ============================================================================
// AVATAR FUNCTIONS
// ============================================================================

function selectAvatar(avatarId) {
    if (!avatarsData[avatarId]) {
        console.error('Avatar não encontrado:', avatarId);
        return;
    }
    
    currentAvatar = avatarId;
    const avatar = avatarsData[avatarId];
    
    // Update chat header
    document.getElementById('currentAvatarIcon').textContent = avatar.icon;
    document.getElementById('currentAvatarName').textContent = avatar.name;
    
    // Set avatar color CSS variables
    const chatSection = document.getElementById('chatSection');
    chatSection.style.setProperty('--avatar-color', avatar.color);
    chatSection.className = `section chat-section avatar-${avatarId}`;
    
    // Clear chat and show greeting
    clearChat();
    
    // Update intro
    document.getElementById('introIcon').textContent = avatar.icon;
    document.getElementById('introText').textContent = avatar.greeting;
    
    showChat();
    
    // Focus message input
    setTimeout(() => {
        document.getElementById('messageInput').focus();
    }, 300);
}

function changeAvatar() {
    showAvatarSelection();
}

// ============================================================================
// CHAT FUNCTIONS
// ============================================================================

async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (!message || isLoading) return;
    
    if (message.length > 1000) {
        showToast('Mensagem muito longa (máximo 1000 caracteres)', 'warning');
        return;
    }
    
    // Add user message to chat
    addMessage('user', message);
    messageInput.value = '';
    updateMessageCounter();
    
    // Set loading state
    isLoading = true;
    const sendBtn = document.getElementById('sendBtn');
    sendBtn.disabled = true;
    
    // Add typing indicator
    const typingId = addTypingIndicator();
    
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                message,
                avatar_id: currentAvatar,
                session_id: sessionId
            })
        });
        
        const data = await response.json();
        
        // Remove typing indicator
        removeTypingIndicator(typingId);
        
        if (response.ok && data.success) {
            // Update session ID
            sessionId = data.session_id;
            
            // Add avatar response
            addMessage('avatar', data.response, data.avatar_name, data.avatar_icon);
            
            // Update current avatar if it was auto-selected
            if (data.avatar !== currentAvatar) {
                currentAvatar = data.avatar;
                updateCurrentAvatarDisplay(data.avatar, data.avatar_name, data.avatar_icon, data.avatar_color);
            }
            
        } else {
            addMessage('avatar', 'Desculpe, tive um problema. Tente novamente.', 'Sistema', '⚠️');
        }
        
    } catch (error) {
        console.error('Erro no chat:', error);
        removeTypingIndicator(typingId);
        addMessage('avatar', 'Erro de conexão. Verifique sua internet e tente novamente.', 'Sistema', '⚠️');
    } finally {
        isLoading = false;
        sendBtn.disabled = false;
    }
}

function addMessage(type, text, avatarName = null, avatarIcon = null) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    const currentTime = new Date().toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    if (type === 'user') {
        messageDiv.innerHTML = `
            <div class="message-avatar">👤</div>
            <div class="message-content">
                ${escapeHtml(text)}
                <div class="message-time">${currentTime}</div>
            </div>
        `;
    } else {
        const displayName = avatarName || avatarsData[currentAvatar]?.name || 'Avatar';
        const displayIcon = avatarIcon || avatarsData[currentAvatar]?.icon || '🤖';
        
        messageDiv.innerHTML = `
            <div class="message-avatar">${displayIcon}</div>
            <div class="message-content">
                ${escapeHtml(text)}
                <div class="message-time">${displayName} • ${currentTime}</div>
            </div>
        `;
    }
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Add animation
    messageDiv.classList.add('fade-in');
}

function addTypingIndicator() {
    const messagesContainer = document.getElementById('chatMessages');
    const typingDiv = document.createElement('div');
    const typingId = 'typing-' + Date.now();
    
    typingDiv.id = typingId;
    typingDiv.className = 'message avatar-message typing-indicator';
    
    const avatar = avatarsData[currentAvatar] || {};
    const displayIcon = avatar.icon || '🤖';
    
    typingDiv.innerHTML = `
        <div class="message-avatar">${displayIcon}</div>
        <div class="message-content">
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    return typingId;
}

function removeTypingIndicator(typingId) {
    const typingDiv = document.getElementById(typingId);
    if (typingDiv) {
        typingDiv.remove();
    }
}

function updateCurrentAvatarDisplay(avatarId, avatarName, avatarIcon, avatarColor) {
    document.getElementById('currentAvatarIcon').textContent = avatarIcon;
    document.getElementById('currentAvatarName').textContent = avatarName;
    
    const chatSection = document.getElementById('chatSection');
    chatSection.style.setProperty('--avatar-color', avatarColor);
    chatSection.className = `section chat-section avatar-${avatarId}`;
}

function clearChat() {
    const messagesContainer = document.getElementById('chatMessages');
    const welcomeMessage = messagesContainer.querySelector('.welcome-message');
    if (welcomeMessage) {
        messagesContainer.innerHTML = welcomeMessage.outerHTML;
    } else {
        messagesContainer.innerHTML = '';
    }
}

function updateMessageCounter() {
    const messageInput = document.getElementById('messageInput');
    const counter = document.getElementById('messageCounter');
    
    if (messageInput && counter) {
        const length = messageInput.value.length;
        counter.textContent = `${length}/1000`;
        
        if (length > 900) {
            counter.style.color = '#f44336';
        } else if (length > 800) {
            counter.style.color = '#ff9800';
        } else {
            counter.style.color = '#999';
        }
    }
}

// ============================================================================
// QUICK ACTIONS
// ============================================================================

function quickAction(action) {
    const messageInput = document.getElementById('messageInput');
    
    const quickMessages = {
        timecapsule: 'Quero criar uma TimeCapsule para preservar uma memória especial',
        memories: 'Preciso de ajuda para organizar minhas memórias familiares',
        help: 'Como funciona a SingulAI? Quais são as suas funcionalidades?'
    };
    
    if (quickMessages[action]) {
        messageInput.value = quickMessages[action];
        updateMessageCounter();
        sendMessage();
    }
}

// ============================================================================
// TIMECAPSULE FUNCTIONS
// ============================================================================

function createTimeCapsule() {
    if (!authToken) {
        showToast('Faça login para criar TimeCapsules', 'warning');
        showAuthSection();
        return;
    }
    
    // Set minimum date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];
    
    document.getElementById('capsuleDate').min = minDate;
    document.getElementById('timecapsuleModal').classList.remove('hidden');
}

async function handleTimeCapsule(e) {
    e.preventDefault();
    
    const title = document.getElementById('capsuleTitle').value.trim();
    const message = document.getElementById('capsuleMessage').value.trim();
    const recipientName = document.getElementById('capsuleRecipientName').value.trim();
    const recipientEmail = document.getElementById('capsuleRecipientEmail').value.trim();
    const unlockDate = document.getElementById('capsuleDate').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // Validation
    if (!title || !message || !unlockDate) {
        showFormError('timecapsuleError', 'Título, mensagem e data são obrigatórios');
        return;
    }
    
    if (title.length > 100) {
        showFormError('timecapsuleError', 'Título muito longo (máximo 100 caracteres)');
        return;
    }
    
    if (message.length > 5000) {
        showFormError('timecapsuleError', 'Mensagem muito longa (máximo 5000 caracteres)');
        return;
    }
    
    // Validate email if provided
    if (recipientEmail && !isValidEmail(recipientEmail)) {
        showFormError('timecapsuleError', 'Email do destinatário inválido');
        return;
    }
    
    // Set loading state
    setButtonLoading(submitBtn, true);
    hideFormError('timecapsuleError');
    
    try {
        const response = await fetch('/api/timecapsule', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ 
                title, 
                message, 
                recipient_name: recipientName || null,
                recipient_email: recipientEmail || null,
                unlock_date: unlockDate 
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showToast('✨ TimeCapsule criada com sucesso!', 'success');
            closeModal('timecapsuleModal');
            e.target.reset();
            
            // Add message to chat
            addMessage('avatar', '✨ TimeCapsule criada com sucesso! Ela será entregue na data escolhida.', avatarsData[currentAvatar]?.name, avatarsData[currentAvatar]?.icon);
            
        } else {
            showFormError('timecapsuleError', data.error || 'Erro ao criar TimeCapsule');
        }
    } catch (error) {
        console.error('Erro ao criar TimeCapsule:', error);
        showFormError('timecapsuleError', 'Erro de conexão. Tente novamente.');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

async function showTimeCapsules() {
    if (!authToken) {
        showToast('Faça login para ver suas TimeCapsules', 'warning');
        showAuthSection();
        return;
    }
    
    const modal = document.getElementById('timeCapsulesListModal');
    const content = document.getElementById('timeCapsulesContent');
    
    modal.classList.remove('hidden');
    content.innerHTML = '<div class="loading-state">Carregando TimeCapsules...</div>';
    
    try {
        const response = await fetch('/api/timecapsules', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            if (data.timecapsules.length === 0) {
                content.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📦</div>
                        <h3>Nenhuma TimeCapsule encontrada</h3>
                        <p>Crie sua primeira TimeCapsule para preservar memórias especiais!</p>
                        <button class="btn btn-primary" onclick="closeModal('timeCapsulesListModal'); createTimeCapsule();">
                            ✨ Criar TimeCapsule
                        </button>
                    </div>
                `;
            } else {
                renderTimeCapsules(data.timecapsules, content);
            }
        } else {
            content.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⚠️</div>
                    <h3>Erro ao carregar TimeCapsules</h3>
                    <p>${data.error || 'Tente novamente mais tarde.'}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Erro ao buscar TimeCapsules:', error);
        content.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h3>Erro de conexão</h3>
                <p>Verifique sua internet e tente novamente.</p>
            </div>
        `;
    }
}

function renderTimeCapsules(timecapsules, container) {
    container.innerHTML = '';
    
    timecapsules.forEach(capsule => {
        const capsuleDiv = document.createElement('div');
        capsuleDiv.className = 'timecapsule-item';
        
        const isDelivered = capsule.is_delivered;
        const unlockDate = new Date(capsule.unlock_date).toLocaleDateString('pt-BR');
        const createdDate = new Date(capsule.created_at).toLocaleDateString('pt-BR');
        
        capsuleDiv.innerHTML = `
            <div class="timecapsule-header">
                <h4 class="timecapsule-title">${escapeHtml(capsule.title)}</h4>
                <span class="timecapsule-status ${isDelivered ? 'status-delivered' : 'status-pending'}">
                    ${isDelivered ? 'Entregue' : 'Pendente'}
                </span>
            </div>
            <div class="timecapsule-details">
                ${capsule.recipient_name ? `<strong>Para:</strong> ${escapeHtml(capsule.recipient_name)}<br>` : ''}
                ${capsule.recipient_email ? `<strong>Email:</strong> ${escapeHtml(capsule.recipient_email)}<br>` : ''}
                <strong>Data de entrega:</strong> ${unlockDate}
            </div>
            <div class="timecapsule-meta">
                <span>Criada em: ${createdDate}</span>
                ${isDelivered && capsule.delivered_at ? 
                    `<span>Entregue em: ${new Date(capsule.delivered_at).toLocaleDateString('pt-BR')}</span>` : 
                    ''
                }
            </div>
        `;
        
        container.appendChild(capsuleDiv);
    });
}

// ============================================================================
// CONVERSATIONS FUNCTIONS
// ============================================================================

async function showConversations() {
    if (!authToken) {
        showToast('Faça login para ver suas conversas', 'warning');
        showAuthSection();
        return;
    }
    
    const modal = document.getElementById('conversationsModal');
    const content = document.getElementById('conversationsContent');
    
    modal.classList.remove('hidden');
    content.innerHTML = '<div class="loading-state">Carregando conversas...</div>';
    
    try {
        const response = await fetch('/api/conversations', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            if (data.conversations.length === 0) {
                content.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">💬</div>
                        <h3>Nenhuma conversa encontrada</h3>
                        <p>Suas conversas anteriores aparecerão aqui!</p>
                    </div>
                `;
            } else {
                renderConversations(data.conversations, content);
            }
        } else {
            content.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⚠️</div>
                    <h3>Erro ao carregar conversas</h3>
                    <p>${data.error || 'Tente novamente mais tarde.'}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Erro ao buscar conversas:', error);
        content.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h3>Erro de conexão</h3>
                <p>Verifique sua internet e tente novamente.</p>
            </div>
        `;
    }
}

function renderConversations(conversations, container) {
    container.innerHTML = '';
    
    conversations.forEach(conv => {
        const convDiv = document.createElement('div');
        convDiv.className = 'conversation-item';
        
        const avatar = avatarsData[conv.avatar] || { icon: '🤖', color: '#667eea' };
        const createdDate = new Date(conv.created_at).toLocaleString('pt-BR');
        
        convDiv.innerHTML = `
            <div class="conversation-preview">
                <div class="conversation-avatar" style="background: ${avatar.color}">
                    ${avatar.icon}
                </div>
                <div class="conversation-content">
                    <div class="conversation-message">
                        <strong>Você:</strong> ${escapeHtml(conv.message)}
                    </div>
                    <div class="conversation-message">
                        <strong>${avatar.name || 'Avatar'}:</strong> ${escapeHtml(conv.response)}
                    </div>
                    <div class="conversation-time">${createdDate}</div>
                </div>
            </div>
        `;
        
        container.appendChild(convDiv);
    });
}

// ============================================================================
// MODAL FUNCTIONS
// ============================================================================

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        
        // Clear form errors
        const errorDivs = modal.querySelectorAll('.form-error');
        errorDivs.forEach(div => hideFormError(div.id));
        
        // Reset forms
        const forms = modal.querySelectorAll('form');
        forms.forEach(form => form.reset());
        
        // Reset loading states
        const buttons = modal.querySelectorAll('.btn');
        buttons.forEach(btn => setButtonLoading(btn, false));
    }
}

// ============================================================================
// UI UTILITY FUNCTIONS
// ============================================================================

function setButtonLoading(button, loading) {
    if (!button) return;
    
    const textSpan = button.querySelector('.btn-text');
    const loadingSpan = button.querySelector('.btn-loading');
    
    if (loading) {
        button.disabled = true;
        button.classList.add('loading');
        if (textSpan) textSpan.style.display = 'none';
        if (loadingSpan) loadingSpan.style.display = 'block';
    } else {
        button.disabled = false;
        button.classList.remove('loading');
        if (textSpan) textSpan.style.display = 'block';
        if (loadingSpan) loadingSpan.style.display = 'none';
    }
}

function showFormError(errorId, message) {
    const errorDiv = document.getElementById(errorId);
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
        errorDiv.style.display = 'block';
    }
}

function hideFormError(errorId) {
    const errorDiv = document.getElementById(errorId);
    if (errorDiv) {
        errorDiv.classList.add('hidden');
        errorDiv.style.display = 'none';
    }
}

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Auto remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ============================================================================
// INFO FUNCTIONS (Footer Links)
// ============================================================================

function showInfo(type) {
    let title, content;
    
    switch (type) {
        case 'privacy':
            title = '🔒 Política de Privacidade';
            content = `
                <h4>Como protegemos seus dados</h4>
                <p>Na SingulAI, levamos sua privacidade a sério:</p>
                <ul>
                    <li>Suas mensagens são criptografadas e armazenadas com segurança</li>
                    <li>TimeCapsules são protegidas até a data de entrega</li>
                    <li>Não compartilhamos dados pessoais com terceiros</li>
                    <li>Você pode excluir seus dados a qualquer momento</li>
                </ul>
            `;
            break;
            
        case 'terms':
            title = '📋 Termos de Uso';
            content = `
                <h4>Condições de uso da plataforma</h4>
                <p>Ao usar a SingulAI, você concorda com:</p>
                <ul>
                    <li>Usar a plataforma de forma responsável e respeitosa</li>
                    <li>Não compartilhar conteúdo ofensivo ou ilegal</li>
                    <li>Manter suas credenciais de acesso seguras</li>
                    <li>Respeitar os direitos dos outros usuários</li>
                </ul>
            `;
            break;
            
        case 'about':
            title = '🤖 Sobre a SingulAI';
            content = `
                <h4>Nossa missão</h4>
                <p>A SingulAI foi criada para ajudar pessoas a preservarem memórias, criarem legados digitais e manterem conexões emocionais através do tempo.</p>
                <p>Nossos avatares especializados oferecem uma experiência personalizada para diferentes necessidades:</p>
                <ul>
                    <li><strong>Laura:</strong> Memórias familiares e ética digital</li>
                    <li><strong>Letícia:</strong> Mensagens emocionais e relacionamentos</li>
                    <li><strong>Pedro:</strong> Implementação técnica e validação jurídica</li>
                </ul>
            `;
            break;
    }
    
    if (title && content) {
        showToast(`${title}\n\n${content}`, 'info');
    }
}

// ============================================================================
// GLOBAL ERROR HANDLING
// ============================================================================

window.addEventListener('error', function(e) {
    console.error('Erro global:', e.error);
    showToast('Ocorreu um erro inesperado. Recarregue a página se o problema persistir.', 'error');
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Promise rejeitada:', e.reason);
    showToast('Erro de conexão. Verifique sua internet.', 'error');
});

// ============================================================================
// SERVICE WORKER REGISTRATION (Future enhancement)
// ============================================================================

if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        // Service worker can be added later for offline functionality
    });
}

// ============================================================================
// EXPORT FUNCTIONS FOR TESTING (if needed)
// ============================================================================

// For development/testing purposes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isValidEmail,
        escapeHtml,
        setButtonLoading,
        showToast
    };
}