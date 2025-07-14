import TelegramBot from 'node-telegram-bot-api';
import { initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import dotenv from 'dotenv';
dotenv.config();

const serviceAccountBase64 = process.env.FIREBASE_CONFIG_BASE64;
const decodedServiceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString('utf8'));

initializeApp({
  credential: cert(decodedServiceAccount),
  databaseURL: "https://home-land-hotel-default-rtdb.firebaseio.com" // your DB url here
});

export const database = getDatabase();

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
