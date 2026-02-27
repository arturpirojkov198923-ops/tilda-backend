const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({ origin: '*' })); // Дозволяємо запити з Tilda
app.use(express.json());

const TELEGRAM_TOKEN = '8789979486:AAESj2s6uy0lg6qU48q0dF9GaeLM3lmE_JI';
const CHAT_ID = '586606657'; // @denysabramovich

app.post('/api/chat', async (req, res) => {
    try {
        const { type, name, phone, message } = req.body;
        let text = '';

        if (type === 'start') {
            text = `🆕 <b>Новий клієнт у чаті!</b>\n👤 Ім'я: ${name}\n📞 Телефон: ${phone}`;
        } else if (type === 'message') {
            text = `💬 <b>Повідомлення від ${name}:</b>\n${message}\n📞 Телефон: ${phone}`;
        } else {
            return res.status(400).json({ error: 'Невідомий тип запиту' });
        }

        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: text,
                parse_mode: 'HTML'
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
