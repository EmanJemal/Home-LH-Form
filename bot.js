import 'dotenv/config';
import express from 'express';
import { Telegraf } from 'telegraf';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set } from 'firebase/database';

// ✅ Setup Telegram Bot
const bot = new Telegraf(process.env.BOT_TOKEN);

// ✅ Firebase Configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  databaseURL: process.env.FIREBASE_DATABASE_URL, // ✅ required
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MSG_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};


// ✅ Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

// 🟢 Handle /start
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const userRef = ref(db, `users/${userId}`);

  try {
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
      ctx.reply(`👋 Welcome back, ${ctx.from.first_name || 'User'}!`);
    } else {
      await set(userRef, {
        first_name: ctx.from.first_name || '',
        username: ctx.from.username || '',
        joined_at: new Date().toISOString(),
      });
      ctx.reply(`🎉 Welcome, ${ctx.from.first_name || 'User'}! You've been registered.`);
    }
  } catch (error) {
    console.error("Firebase error:", error);
    ctx.reply("⚠️ An error occurred while accessing the database.");
  }
});

// 🟢 Screenshot Upload Logic
const screenshotSessions = new Map();

bot.command('screenshot', async (ctx) => {
  const userId = ctx.from.id;
  const code = Math.floor(10000 + Math.random() * 90000).toString();

  screenshotSessions.set(userId, code);
  await ctx.reply(`📸 Please send the screenshot image.\nYour code is: *${code}*`, { parse_mode: 'Markdown' });
});

bot.on('photo', async (ctx) => {
  const userId = ctx.from.id;

  if (!screenshotSessions.has(userId)) {
    return ctx.reply("❌ You haven't initiated a screenshot upload. Send /screenshot first.");
  }

  const code = screenshotSessions.get(userId);
  const photoArray = ctx.message.photo;
  const largestPhoto = photoArray[photoArray.length - 1]; // best quality

  const screenshotRef = ref(db, `screenshots/${code}`);
  try {
    await set(screenshotRef, {
      user: ctx.from.username || ctx.from.id,
      image_file_id: largestPhoto.file_id,
      caption: "Screenshot",
      timestamp: new Date().toISOString(),
    });

    ctx.reply(`✅ Screenshot saved with code: *${code}*`, { parse_mode: 'Markdown' });
    screenshotSessions.delete(userId);
  } catch (error) {
    console.error("Error saving screenshot:", error);
    ctx.reply("⚠️ Failed to save screenshot.");
  }
});

// ─── Express App Setup ──────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 5501;

// 🟢 Telegram Image Proxy (GET actual Telegram file by fileId)
app.get('/telegram-image/:fileId', async (req, res) => {
  const fileId = req.params.fileId;

  try {
    const file = await bot.telegram.getFile(fileId);
    if (!file || !file.file_path) {
      console.error("⚠️ No file path received from Telegram");
      return res.status(404).send('Image not found (no file_path)');
    }

    const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
    return res.redirect(fileUrl);

  } catch (err) {
    console.error("❌ Failed to get Telegram file:", err);
    return res.status(404).send('Image not found');
  }
});

// Attach webhook handler middleware BEFORE listen
app.use(bot.webhookCallback('/webhook'));

app.listen(PORT, async () => {
  const webhookURL = `https://home-lh-form-production.up.railway.app/webhook`;

  console.log(`🚀 Server running at http://localhost:${PORT}`);

  try {
    await bot.telegram.setWebhook(webhookURL);
    console.log("🤖 Telegram bot webhook set:", webhookURL);
  } catch (err) {
    console.error("Failed to set webhook:", err);
  }
});