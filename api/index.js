const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const TELEGRAM_TOKEN = '8789979486:AAESj2s6uy0lg6qU48q0dF9GaeLM3lmE_JI';
const CHAT_ID = '586606657'; // Ваш ID

// Сховище повідомлень для обміну
global.chatStore = global.chatStore || {};

// 1. ПРИЙОМ ПОВІДОМЛЕНЬ ВІД КЛІЄНТА ТА ВІДПРАВКА В ТЕЛЕГРАМ
app.post('/api/chat', async (req, res) => {
    try {
        const { type, name, phone, message, sessionId } = req.body;
        
        // --- АВТОМАТИЧНЕ НАЛАШТУВАННЯ ВЕБХУКУ ---
        // Цей код сам гарантує, що Telegram знає домен вашого бекенду!
        const webhookUrl = `https://${req.headers.host}/api/webhook`;
        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook?url=${webhookUrl}`);
        // ----------------------------------------

        let text = '';
        if (type === 'start') {
            text = `🆕 <b>Новий чат!</b>\n👤 Ім'я: ${name}\n📞: ${phone}\n🔑 ID: #${sessionId}`;
        } else if (type === 'message') {
            text = `💬 <b>${name}:</b>\n${message}\n🔑 ID: #${sessionId}`;
        }

        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: CHAT_ID, text: text, parse_mode: 'HTML' })
        });

        res.status(200).json({ success: response.ok });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Помилка сервера' });
    }
});

// 2. ПОШУК НОВИХ ВІДПОВІДЕЙ (Те, що запитує сайт кожні 3 секунди)
app.get('/api/chat', (req, res) => {
    const sessionId = req.query.sessionId;
    if (!sessionId) return res.status(400).json({ error: 'No session ID' });

    const messages = global.chatStore[sessionId] || [];
    global.chatStore[sessionId] = []; // Віддаємо клієнту та очищаємо пам'ять
    res.status(200).json({ messages });
});

// 3. ОТРИМАННЯ ВІДПОВІДІ МЕНЕДЖЕРА З ТЕЛЕГРАМУ
app.post('/api/webhook', (req, res) => {
    try {
        const msg = req.body.message;
        
        // Переконуємось, що менеджер дійсно відповів на конкретне повідомлення бота
        if (msg && msg.reply_to_message && msg.reply_to_message.text) {
            
            // Надійний пошук ID (більш гнучкий формат sess_ цифри)
            const match = msg.reply_to_message.text.match(/(sess_[0-9]+)/);
            if (match && match[1]) {
                const sessionId = match[1];
                
                // Якщо менеджер надіслав фото без тексту, повідомити клієнта просто текстом "Фото" 
                const managerText = msg.text || (msg.photo ? "📷 [Вам надіслали фото]" : "📎 [Вкладення]");

                if (!global.chatStore[sessionId]) global.chatStore[sessionId] = [];
                // Зберігаємо вашу відповідь для цього конкретного сеансу
                global.chatStore[sessionId].push({ text: managerText, timestamp: Date.now() });
            }
        }
        res.status(200).send('OK'); // Завжди повертаємо 200, щоб Telegram не дублював запити
    } catch (e) {
        res.status(500).send('Error');
    }
});

module.exports = app;
