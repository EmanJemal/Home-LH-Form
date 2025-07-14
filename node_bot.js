import TelegramBot from 'node-telegram-bot-api';
import { initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import dotenv from 'dotenv';
import express from 'express';

const app = express();
const PORT = process.env.PORT || 5501;
dotenv.config();

const serviceAccountBase64 = process.env.FIREBASE_CONFIG_BASE64;
const decodedServiceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString('utf8'));

initializeApp({
  credential: cert(decodedServiceAccount),
  databaseURL: "https://home-land-hotel-default-rtdb.firebaseio.com" // your DB url here
});

export const database = getDatabase();

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

const adminChats = [
  { id: process.env.ADMIN_1_CHAT_ID, code: '' },
  { id: process.env.ADMIN_2_CHAT_ID, code: '' },
  { id: process.env.ADMIN_3_CHAT_ID, code: '' }
];
const sifan = [
 { id: process.env.ADMIN_3_CHAT_ID, code: '' }//1133990573 si
];
const amana = [
  { id: process.env.ADMIN_2_CHAT_ID, code: '' }//582144194
];
const arafat = [
  { id: process.env.ADMIN_1_CHAT_ID, code: '' }//5169578668
];

const allowedUsers = [
  parseInt(process.env.ADMIN_1_CHAT_ID),
  parseInt(process.env.ADMIN_2_CHAT_ID),
  parseInt(process.env.ADMIN_3_CHAT_ID)  ];

bot.onText(/\/start/, async (msg) => {
const chatId = msg.chat.id;
const firstName = msg.from.first_name || 'there';


// ✅ Check if user is allowed
if (!allowedUsers.includes(chatId)) {
  console.log(`❌ Unauthorized user attempted to /start: ${chatId}`);
  return; // Stop here — do not respond
}

// ✅ Save to Realtime Database
await database.ref('users/' + chatId).set({
  firstName: firstName,
  chatId: chatId,
  joinedAt: Date.now()
});

// ✅ Send welcome message
bot.sendMessage(chatId, `👋 Hello ${firstName}!\nYou're now connected to the bot.`);
});

const screenshotSessions = {}; // Holds state for /screenshot flows

// Handle /screenshot command with auto-generated 4-digit ID
bot.onText(/\/screenshot/, async (msg) => {
  const chatId = msg.chat.id;

  // ✅ Check if user is allowed
  if (!allowedUsers.includes(chatId)) {
    console.log(`❌ Unauthorized user attempted to /screenshot: ${chatId}`);
    return;
  }

  // 🔄 Generate a unique 4-digit ID
  let id;
  let attempts = 0;
  do {
    id = Math.floor(1000 + Math.random() * 9000).toString(); // Random 4-digit number
    const snapshot = await database.ref(`Screenshot_id/${id}`).once('value');
    if (!snapshot.exists()) break;
    attempts++;
  } while (attempts < 10);

  if (attempts >= 10) {
    return bot.sendMessage(chatId, `❌ Failed to generate unique Screenshot ID. Try again.`);
  }

  // ✅ Save session state
  screenshotSessions[chatId] = {
    step: 'awaiting_photo',
    screenshotId: id
  };

  bot.sendMessage(chatId, `🆔 Your Screenshot ID is *${id}*\n📤 Now send the screenshot photo:`, {
    parse_mode: 'Markdown'
  });
});


bot.on('message', async (msg) => {
  const chatId = msg.chat.id;

  if (!allowedUsers.includes(chatId)) return;

  const screenshotSession = screenshotSessions[chatId];
  if (screenshotSession && screenshotSession.step === 'awaiting_photo') {
    if (msg.photo) {
      const fileId = msg.photo[msg.photo.length - 1].file_id;
      await database.ref(`Screenshot_id/${screenshotSession.screenshotId}`).set({
        image: fileId,
        date: new Date().toISOString(),
        Id: parseInt(process.env.ADMIN_3_CHAT_ID) 
      });

      delete screenshotSessions[chatId];
      return bot.sendMessage(chatId, `✅ Screenshot saved under ID *${screenshotSession.screenshotId}*`, {
        parse_mode: 'Markdown'
      });
    }

    if (msg.text && !msg.text.startsWith('/')) {
      return bot.sendMessage(chatId, `❌ Please send a valid photo.`);
    }

    return; // prevent other actions while in photo step
  }
});




// ─── Telegram Image Proxy Endpoint ─────────────────────────────
app.get('/telegram-image/:fileId', async (req, res) => {
  const fileId = req.params.fileId;

  try {
    const file = await bot.getFile(fileId);
    if (!file || !file.file_path) {
      console.error("⚠️ No file path received from Telegram");
      return res.status(404).send('Image not found (no file_path)');
    }

    const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;
    return res.redirect(fileUrl);

  } catch (err) {
    console.error("❌ Failed to get Telegram file:", err);
    return res.status(404).send('Image not found');
  }
});


// ─── Start Server ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
