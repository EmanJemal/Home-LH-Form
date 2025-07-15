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
if (!serviceAccountBase64) {
  throw new Error("FIREBASE_CONFIG_BASE64 is not defined in .env");
}

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
  console.log(`🚀 Server running at home-lh-form-production.up.railway.app:${PORT}`);
});



async function handleStartMyTime(chatId) {
  const db = getDatabase();
  const mainAdmin = process.env.Main_ADMIN_CHAT_ID;
  const salesName = chatId == process.env.SALES_1_CHAT_ID ? "Mahlete" :
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


bot.onText(/\/active/, async (msg) => {
  const chatId = msg.chat.id;

  // Allow only main admin
  if (chatId.toString() !== process.env.Main_ADMIN_CHAT_ID) {
    return bot.sendMessage(chatId, "❌ You are not authorized to use this command.");
  }

  const timerSnapshot = await database.ref('timer').once('value');
  if (!timerSnapshot.exists()) {
    return bot.sendMessage(chatId, "✅ No active timer sessions.");
  }

  const data = timerSnapshot.val();
  const activeTimers = Object.entries(data);

  for (const [salesName, details] of activeTimers) {
    const { timer_id, time } = details;

    const startTime = new Date(time).toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' });
    const text = `🟢 *Active Timer Info:*\n\n👤 Salesperson: *${salesName}*\n🆔 Timer ID: *${timer_id}*\n⏰ Started: *${startTime}*`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: `📤 Get Excel for ${salesName}`, callback_data: `get_excel_${salesName}_${timer_id}` },
          { text: `👋 Force Leave`, callback_data: `force_leave_${salesName}_${timer_id}` }
        ]
      ]
    };

    await bot.sendMessage(chatId, text, {
      parse_mode: "Markdown",
      reply_markup: keyboard
    });
  }
});


bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  await bot.answerCallbackQuery(query.id); // Always clear "loading"

  if (chatId.toString() !== process.env.Main_ADMIN_CHAT_ID) {
    return bot.sendMessage(chatId, "❌ You are not authorized to perform this action.");
  }

  // Handle Excel generation
  if (data.startsWith("get_excel_")) {
    const [, salesName, timerId] = data.split("_");
    const paymentsSnap = await database.ref('Payments').once('value');
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

    await bot.sendDocument(chatId, filePath, {}, {
      filename: fileName,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    fs.unlinkSync(filePath);
  }

  // Handle force leave
  if (data.startsWith("force_leave_")) {
    const [, salesName, timerId] = data.split("_");

    // Remove active timer
    await database.ref(`timer/${salesName}`).remove();
    await database.ref(`timer_id_ver/${timerId}`).update({ Used: false, endTime: Date.now() });

    await bot.sendMessage(chatId, `🛑 Forced end for ${salesName}'s session (ID: ${timerId})`);
  }
});
const historySessions = {}; // chatId -> state
bot.onText(/\/history/, async (msg) => {
  const chatId = msg.chat.id;

  if (chatId.toString() !== process.env.Main_ADMIN_CHAT_ID) {
    return bot.sendMessage(chatId, "❌ You are not authorized to use this command.");
  }

  historySessions[chatId] = { step: 'awaiting_timer_id' };
  bot.sendMessage(chatId, "🔎 Please enter the *Timer ID* you want to check history for:", { parse_mode: "Markdown" });
});
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;

  if (msg.text.startsWith('/') || chatId.toString() !== process.env.Main_ADMIN_CHAT_ID) return;

  const session = historySessions[chatId];
  if (!session) return;

  if (session.step === 'awaiting_timer_id') {
    const timerId = msg.text.trim();
    session.timerId = timerId;
    session.step = 'confirm_single_id';

    return bot.sendMessage(chatId, `🆔 You entered Timer ID: *${timerId}*\n\nIs this the only ID to check?`, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Yes", callback_data: `history_confirm_yes_${timerId}` }],
          [{ text: "❌ Cancel", callback_data: `history_cancel` }]
        ]
      }
    });
  }
});
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  await bot.answerCallbackQuery(query.id); // clear button loading

  if (!data.startsWith("history_")) return;

  if (data === "history_cancel") {
    delete historySessions[chatId];
    return bot.sendMessage(chatId, "❌ History lookup cancelled.");
  }

  if (data.startsWith("history_confirm_yes_")) {
    const timerId = data.split("history_confirm_yes_")[1];
    delete historySessions[chatId];

    const paymentsSnap = await database.ref('Payments').once('value');

    let totalCBE = 0, totalCash = 0, totalTelebirr = 0;
    const allData = [];

    if (paymentsSnap.exists()) {
      paymentsSnap.forEach((snap) => {
        const val = snap.val();
        if (val.timeid === timerId) {
          const amount = parseFloat(val.amountInBirr) || 0;
          const method = val.paymentMethod?.toLowerCase() || '';

          if (method.includes('cbe')) totalCBE += amount;
          else if (method.includes('cash')) totalCash += amount;
          else if (method.includes('telebirr')) totalTelebirr += amount;

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
        }
      });
    }

    // ✅ Send summary
    await bot.sendMessage(chatId, `📊 *Summary for Timer ID: ${timerId}*\n\n💵 Cash: *${totalCash} Birr*\n🏦 CBE: *${totalCBE} Birr*\n📱 Telebirr: *${totalTelebirr} Birr*`, {
      parse_mode: "Markdown"
    });

    // ✅ Send Excel
    allData.push({});
    allData.push({ Name: 'Total CBE', Room: totalCBE + ' Birr' });
    allData.push({ Name: 'Total Cash', Room: totalCash + ' Birr' });
    allData.push({ Name: 'Total Telebirr', Room: totalTelebirr + ' Birr' });

    const worksheet = XLSX.utils.json_to_sheet(allData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'History');

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    const fileName = `history_${timerId}_${new Date().toISOString().slice(0,10)}.xlsx`;
    const filePath = `/tmp/${fileName}`;

    fs.writeFileSync(filePath, buffer);

    await bot.sendDocument(chatId, filePath, {}, {
      filename: fileName,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    fs.unlinkSync(filePath);
  }
});
