// services/telegramService.js
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
let bot;

if (token && chatId) {
    bot = new TelegramBot(token, { polling: false });
    console.log('Telegram bot service is active.');
} else {
    console.warn('Telegram bot token or chat ID is not configured. Logs will not be sent.');
}

const sendLog = (message) => {
    if (bot && chatId) {
        bot.sendMessage(chatId, message, { parse_mode: 'HTML' }).catch(error => {
            console.error('Error sending Telegram log:', error.code, error.response?.body);
        });
    }
};

const formatLog = (user, action) => {
    const now = new Date();
    const date = now.toLocaleDateString('az-AZ');
    const time = now.toLocaleTimeString('az-AZ');
    const userName = user ? (user.displayName || user.username) : 'System';
    const userRole = user ? (user.role || 'N/A') : '';
    return `❗Diqqət:\n🚹 <b>İstifadəçi:</b> ${userName} (${userRole})\n⏳ <b>Tarix:</b> ${date}\n⏳ <b>Saat:</b> ${time}\n📝 <b>Hərəkət:</b> ${action}`;
};

module.exports = {
    sendLog,
    formatLog
};