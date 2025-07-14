import TelegramBot from 'node-telegram-bot-api';
import { database } from './firebase.js';
import dotenv from 'dotenv';
dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userRef = database.ref(`users/${chatId}`);
  
  const snapshot = await userRef.get();
  if (snapshot.exists()) {
    bot.sendMessage(chatId, `👋 Welcome back, you're already registered!`);
  } else {
    bot.sendMessage(chatId, `🙋 Hello! You are not registered yet.`);
    // Optional: Register them
    await userRef.set({
      name: msg.from.first_name,
      registeredAt: new Date().toISOString()
    });
  }
});
