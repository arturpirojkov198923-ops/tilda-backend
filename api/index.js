const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const TELEGRAM_TOKEN = '8789979486:AAESj2s6uy0lg6qU48q0dF9GaeLM3lmE_JI';
const CHAT_ID = '586606657'; // Ваш ID @denysabramovich

// Тимчасове сховище повідомлень для обміну (зберігається, поки віджет активний)
global.chatStore = global.chatStore || {};

// 1. ПРИЙОМ ДАНИХ З TILDA (Надсилання в Telegram)
app.post('/api/chat', async (req, res) => {
    try {
        const { type, name, phone, message, sessionId } = req.body;
        let text = '';

        if (type === 'start') {
            text = `🆕 <b>Новий чат!</b>\n👤 Ім'я: ${name}\n📞: ${phone}\n🔑 ID: #${sessionId}`;
        } else if (type === 'message') {
            text = `💬 <b>${name}:</b>\n${message}\n🔑 ID: #${sessionId}`;
        } else {
            return res.status(400).json({ error: 'Unknown request' });
        }

        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: CHAT_ID, text: text, parse_mode: 'HTML' })
        });

        if (response.ok) res.status(200).json({ success: true });
        else res.status(500).json({ success: false });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// 2. ВИДАЧА ПОВІДОМЛЕНЬ КЛІЄНТУ НА САЙТ (Polling)
app.get('/api/chat', (req, res) => {
    const sessionId = req.query.sessionId;
    if (!sessionId) return res.status(400).json({ error: 'No session ID' });

    // Віддаємо повідомлення клієнту і одразу очищаємо їх з пам'яті
    const messages = global.chatStore[sessionId] || [];
    global.chatStore[sessionId] = []; 
    res.status(200).json({ messages });
});

// 3. ОТРИМАННЯ ВІДПОВІДІ МЕНЕДЖЕРА З ТЕЛЕГРАМУ
app.post('/api/webhook', (req, res) => {
    try {
        const msg = req.body.message;
        // Перевіряємо, чи це повідомлення від вас і чи це "Відповідь" (Reply) на бота
        if (msg && msg.chat.id.toString() === CHAT_ID && msg.reply_to_message && msg.reply_to_message.text) {
            
            // Шукаємо ID клієнта в тексті бота (🔑 ID: #session_xxx)
            const match = msg.reply_to_message.text.match(/ID: #([a-zA-Z0-9_]+)/);
            if (match && match[1]) {
                const sessionId = match[1];
                const managerText = msg.text; // Текст вашої відповіді
                
                if (!global.chatStore[sessionId]) global.chatStore[sessionId] = [];
                // Зберігаємо вашу відповідь для цього клієнта
                global.chatStore[sessionId].push({ text: managerText, timestamp: Date.now() });
            }
        }
        res.status(200).send('OK'); // Завжди відповідаємо OK для Telegram
    } catch (e) {
         res.status(500).send('Error');
    }
});

// 4. НАЛАШТУВАННЯ ЗВ'ЯЗКУ (ВЕБХУКА)
app.get('/api/setup', async (req, res) => {
    const host = req.headers.host;
    const webhookUrl = `https://${host}/api/webhook`;
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook?url=${webhookUrl}`);
    const data = await response.json();
    res.json({ webhookUrl, telegramResponse: data });
});

module.exports = app;
