const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

// ВАШИ ДАННЫЕ ВСТАВЛЕНЫ НАПРЯМУЮ
const TELEGRAM_TOKEN = '8789979486:AAESj2s6uy0lg6qU48q0dF9GaeLM3lmE_JI';
const CHAT_ID = '586606657';

app.post('/api/chat', async (req, res) => {
    try {
        const { type, name, phone, message } = req.body;
        
        // 1. Очистка номера для ссылки в WhatsApp (убираем всё кроме цифр)
        const cleanPhone = phone.replace(/\D/g, '');
        const waLink = `https://wa.me{cleanPhone}`;
        
        // 2. Ссылка на Telegram (если клиент в поле имени ввёл @никнейм)
        const tgLink = name.startsWith('@') ? `https://t.me{name.replace('@', '')}` : null;

        let text = '';
        if (type === 'start') {
            text = `🆕 <b>Новий клієнт у чаті!</b>\n👤 Ім'я: ${name}\n📞 Телефон: ${phone}`;
        } else {
            text = `💬 <b>Повідомлення від ${name}:</b>\n${message}\n📞 Телефон: ${phone}`;
        }

        // 3. Создаем кнопки быстрого ответа
        const inlineKeyboard =];
        
        // Если определили никнейм Telegram, добавляем вторую кнопку
        if (tgLink) {
            inlineKeyboard[0].push({ text: "✈️ Написати у Telegram", url: tgLink });
        }

        const response = await fetch(`https://api.telegram.org{TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: text,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: inlineKeyboard
                }
            })
        });

        if (response.ok) {
            res.status(200).json({ success: true });
        } else {
            const errorData = await response.json();
            res.status(500).json({ success: false, error: errorData.description });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: 'Помилка сервера' });
    }
});

module.exports = app;
