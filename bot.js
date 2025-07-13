import 'dotenv/config';
import express from 'express';
import { Telegraf } from 'telegraf';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set } from 'firebase/database';

// ✅ Telegram Bot Token from .env
const bot = new Telegraf(process.env.BOT_TOKEN);
console.log("Bot started")

// ✅ Firebase Config from .env
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MSG_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 🟢 /start handler
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

// 🚀 Launch bot
bot.launch().then(() => {
  console.log("🤖 Bot started");
});


// Session map for screenshot uploads
const screenshotSessions = new Map();

// /start command
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

// /screenshot command
bot.command('screenshot', async (ctx) => {
  const userId = ctx.from.id;
  const code = Math.floor(10000 + Math.random() * 90000).toString();

  screenshotSessions.set(userId, code);
  await ctx.reply(`📸 Please send the screenshot image.\nYour code is: *${code}*`, { parse_mode: 'Markdown' });
});

// Handle photo uploads
bot.on('photo', async (ctx) => {
  const userId = ctx.from.id;

  if (!screenshotSessions.has(userId)) {
    return ctx.reply("❌ You haven't initiated a screenshot upload. Send /screenshot first.");
  }

  const code = screenshotSessions.get(userId);
  const photoArray = ctx.message.photo;
  const largestPhoto = photoArray[photoArray.length - 1]; // highest resolution

  const screenshotRef = ref(db, `screenshots/${code}`);
  try {
    await set(screenshotRef, {
      user: ctx.from.username || ctx.from.id,
      image_file_id: largestPhoto.file_id,
      caption: "Aga...",
      timestamp: new Date().toISOString(),
    });

    ctx.reply(`✅ Screenshot saved with code: *${code}*`, { parse_mode: 'Markdown' });
    screenshotSessions.delete(userId);
  } catch (error) {
    console.error("Error saving screenshot:", error);
    ctx.reply("⚠️ Failed to save screenshot. Please try again.");
  }
});

// ─── Express App Setup ─────────────────────────────────────
const appex = express();
const PORT = process.env.PORT || 3000;

// Telegram image proxy endpoint
appex.get('/telegram-image/:fileId', async (req, res) => {
  const fileId = req.params.fileId;

  try {
    const file = await bot.telegram.getFile(fileId);
    if (!file?.file_path) {
      console.error("⚠️ No file_path found");
      return res.status(404).send('Image not found');
    }

    const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
    return res.redirect(fileUrl);
  } catch (err) {
    console.error("❌ Failed to fetch file from Telegram:", err);
    return res.status(500).send('Failed to fetch image');
  }
});

// Start Express + Telegram bot
appex.listen(PORT, () => {
  console.log(`🌐 Express server running at http://localhost:${PORT}`);
  bot.launch().then(() => console.log("🤖 Telegram bot launched"));
});
