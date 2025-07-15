import TelegramBot from 'node-telegram-bot-api';
import { initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import dotenv from 'dotenv';
import express from 'express';
import XLSX from 'xlsx';
import fs from 'fs';



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

const salesChats = [
  { id: process.env.SALES_1_CHAT_ID, code: '' },
  { id: process.env.SALES_2_CHAT_ID, code: '' },
  { id: process.env.SALES_3_CHAT_ID, code: '' }
];
const sifan = [
 { id: process.env.SALES_3_CHAT_ID, code: '' }
];
const amana = [
  { id: process.env.SALES_2_CHAT_ID, code: '' }
];
const arafat = [
  { id: process.env.SALES_1_CHAT_ID, code: '' }
];

const allowedUsers = [
  parseInt(process.env.SALES_1_CHAT_ID),
  parseInt(process.env.SALES_2_CHAT_ID),
  parseInt(process.env.SALES_3_CHAT_ID),
  parseInt(process.env.Main_ADMIN_CHAT_ID),
];

  bot.onText(/^\/start$/, async (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name || 'there';
  
    // ✅ Check if user is allowed
    if (!allowedUsers.includes(chatId)) {
      console.log(`❌ Unauthorized user attempted to /start: ${chatId}`);
      return;
    }
  
    // ✅ Save to Realtime Database
    await database.ref('users/' + chatId).set({
      firstName: firstName,
      chatId: chatId,
      joinedAt: Date.now()
    });
  
    // ✅ Send welcome message with button
    bot.sendMessage(chatId, `👋 Hello ${firstName}!\nYou're now connected to the bot.`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "⏱ Start my timer", callback_data: "/start-my-time" }]
        ]
      }
    });
  });
  

  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
  
    if (data === "/start-my-time") {
      // Simulate sending /start-my-time
      bot.emit('message', { ...query.message, text: "/start-my-time" });
      await bot.answerCallbackQuery(query.id); // clear the "loading" state on button
    }
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
        Id: parseInt(process.env.SALES_3_CHAT_ID) 
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



async function handleStartMyTime(chatId) {
  const db = getDatabase();
  const mainAdmin = process.env.Main_ADMIN_CHAT_ID;
  const salesName = chatId == process.env.SALES_1_CHAT_ID ? "arafat" :
                    chatId == process.env.SALES_2_CHAT_ID ? "amana" :
                    chatId == process.env.SALES_3_CHAT_ID ? "sifan" : "unknown";

  const timerSnapshot = await db.ref('timer').once('value');
  if (timerSnapshot.exists()) {
    const data = timerSnapshot.val();
    if (Object.keys(data).length > 0 && !data[salesName]) {
      return bot.sendMessage(chatId, `⚠️ Another salesperson (${Object.keys(data)[0]}) is still active.`);
    }
  }

  // Generate 5-digit unique timer ID
  let timerId;
  let attempts = 0;
  do {
    timerId = Math.floor(10000 + Math.random() * 90000).toString();
    const usedSnapshot = await db.ref(`timer_id_ver/${timerId}/Used`).once('value');
    if (!usedSnapshot.exists()) break;
    attempts++;
  } while (attempts < 5);

  if (attempts >= 5) {
    return bot.sendMessage(chatId, `❌ Failed to generate a unique timer ID. Try again.`);
  }

  await db.ref(`timer/${salesName}`).set({
    time: Date.now(),
    timer_id: timerId
  });

  await db.ref(`timer_id_ver/${timerId}`).set({
    Used: true,
    salesname: salesName
  });

  bot.sendMessage(mainAdmin, `✅ ${salesName} has *joined* with ID: *${timerId}*`, { parse_mode: "Markdown" });

  bot.sendMessage(chatId, `✅ Timer started with ID: *${timerId}*`, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "👋 Leave", callback_data: "/leave" }]
      ]
    }
  });
}




const mainAdmin = process.env.Main_ADMIN_CHAT_ID;

bot.onText(/\/start-my-time/, async (msg) => {
  await handleStartMyTime(msg.chat.id);
});


async function handleLeave(chatId) {
  const salesName = chatId == process.env.SALES_1_CHAT_ID ? "arafat" :
                    chatId == process.env.SALES_2_CHAT_ID ? "amana" :
                    chatId == process.env.SALES_3_CHAT_ID ? "sifan" : "unknown";

  if (salesName === "unknown") {
    return bot.sendMessage(chatId, "❌ You are not authorized to leave.");
  }

  const db = getDatabase();

  const timerSnapshot = await db.ref(`timer/${salesName}`).once('value');
  if (!timerSnapshot.exists()) {
    return bot.sendMessage(chatId, "⚠️ You do not have an active timer.");
  }

  const timerId = timerSnapshot.val().timer_id;

  await db.ref(`timer/${salesName}`).remove();
  await db.ref(`timer_id_ver/${timerId}`).update({ Used: false, endTime: Date.now() });

  bot.sendMessage(chatId, `👋 You have left the hotel. Your session has ended.`);

  const paymentsSnap = await db.ref('Payments').once('value');
  const allData = [];
  let totalCBE = 0;

  if (paymentsSnap.exists()) {
    paymentsSnap.forEach((snap) => {
      const val = snap.val();
      if (val.timeid === timerId) {
        const amount = parseFloat(val.amountInBirr) || 0;
        allData.push({
          Name: val.name || "N/A",
          Room: val.selectedRoom || "N/A",
          Amount: amount + ' Birr',
          Timestamp: val.timestamp || "N/A",
          salesname: val.salesname,
          sex: val.sex,
          days: val.days,
          paymentMethod: val.paymentMethod,
          phone: val.phone,
        });
        if (val.paymentMethod?.toLowerCase().includes('cbe')) {
          totalCBE += amount;
        }
      }
    });
  }

  allData.push({});
  allData.push({ Name: 'Total CBE', Room: totalCBE + ' Birr' });

  const worksheet = XLSX.utils.json_to_sheet(allData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  const fileName = `timer_${timerId}_report_${new Date().toISOString().slice(0,10)}.xlsx`;
  const filePath = `/tmp/${fileName}`;

  fs.writeFileSync(filePath, buffer);

  const mainAdmin = process.env.Main_ADMIN_CHAT_ID;
  await bot.sendDocument(mainAdmin, filePath, {}, {
    filename: fileName,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  fs.unlinkSync(filePath);

  bot.sendMessage(mainAdmin, `📢 Salesperson *${salesName}* ended timer with ID *${timerId}*. Excel report sent.`, {
    parse_mode: "Markdown"
  });
}

bot.onText(/\/leave/, async (msg) => {
  await handleLeave(msg.chat.id);
});



bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data === "/start-my-time") {
    await handleStartMyTime(chatId);
  }

  if (data === "/leave") {
    await handleLeave(chatId);
  }

  await bot.answerCallbackQuery(query.id);
});
