import TelegramBot from 'node-telegram-bot-api';
import { initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import dotenv from 'dotenv';
import express from 'express';
import XLSX from 'xlsx';
import fs from 'fs';
import { DateTime } from 'luxon';
import admin from 'firebase-admin';


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

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://your-db.firebaseio.com"
  });
} else {
  // reuse existing app
  admin.app();
}

const db = admin.database();

export const database = getDatabase();

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

const salesChats = [
  { id: process.env.SALES_1_CHAT_ID, code: '' },
  { id: process.env.SALES_2_CHAT_ID, code: '' },
  { id: process.env.SALES_3_CHAT_ID, code: '' },
  { id: process.env.RAHEL_CHAT_ID, code: '' },
];
const sifan = [
 { id: process.env.SALES_3_CHAT_ID, code: '' }
];
const rahel = [
  { id: process.env.RAHEL_CHAT_ID, code: '' }
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
  parseInt(process.env.RAHEL_CHAT_ID),
  parseInt(process.env.Main_ADMIN_CHAT_ID),
];


async function generateExcelForTimer(salesName, timerId, chatId) {
  const paymentsSnap = await database.ref('Payments').once('value');
  const allData = [];
  let totalCBE = 0, totalCash = 0, totalTelebirr = 0;

  if (paymentsSnap.exists()) {
    paymentsSnap.forEach(snap => {
      const val = snap.val();
      if (val.timeid === String(timerId)) {
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

        const method = val.paymentMethod?.toLowerCase() || '';
        if (method.includes('cbe')) totalCBE += amount;
        else if (method.includes('cash')) totalCash += amount;
        else if (method.includes('telebirr')) totalTelebirr += amount;
      }
    });
  }

  allData.push({});
  allData.push({ Name: 'Total CBE', Room: totalCBE + ' Birr' });
  allData.push({ Name: 'Total Cash', Room: totalCash + ' Birr' });
  allData.push({ Name: 'Total Telebirr', Room: totalTelebirr + ' Birr' });

  const worksheet = XLSX.utils.json_to_sheet(allData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  const fileName = `excel_timer_${timerId}.xlsx`;
  const filePath = `/tmp/${fileName}`;

  fs.writeFileSync(filePath, buffer);

  await bot.sendDocument(chatId, filePath, {}, {
    filename: fileName,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  fs.unlinkSync(filePath); // cleanup

  await bot.sendMessage(chatId, `✅ Excel report for *${salesName}* with Timer ID *${timerId}* has been sent.`, {
    parse_mode: "Markdown"
  });
}


bot.onText(/^\/start$/, async (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || 'there';
  const isAdmin = chatId.toString() === process.env.Main_ADMIN_CHAT_ID;

  // Optional user check
  if (!allowedUsers.includes(chatId)) {
    console.log(`❌ Unauthorized user attempted to /start: ${chatId}`);
    return;
  }

  await database.ref('users/' + chatId).set({
    firstName: firstName,
    chatId: chatId,
    joinedAt: Date.now()
  });

  const keyboard = [
    [{ text: "⏱ Start My Timer", callback_data: "/start-my-time" }],
    [{ text: "🔴 Leave", callback_data: "/leave" }],
    [{ text: "🆘 Help", callback_data: "/help" }]
  ];

  if (isAdmin) {
    keyboard.push([{ text: "📊 አሁን start ያለች sales መረጃ ", callback_data: "/active" }]);
    keyboard.push([{ text: "📂 ከዚህ በፊት start ያለች ያሉ sales መረጃ", callback_data: "/history" }]);
  }

  await bot.sendMessage(chatId, `👋 Hello *${firstName}*! You're now connected to the bot.\nUse the buttons below:`, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: keyboard
    }
  });
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


const forceLeaveSessions = {}; // { [chatId]: { expectedTimerId, salesName } }




async function handleStartMyTime(chatId, enteredName) {
  const db = getDatabase();
  const mainAdmin = process.env.Main_ADMIN_CHAT_ID;

  const timerSnapshot = await db.ref('timer').once('value');
  if (timerSnapshot.exists()) {
    const data = timerSnapshot.val();
    const activeSales = Object.keys(data);
    if (activeSales.length > 0 && !data[enteredName]) {
      return bot.sendMessage(chatId, `⚠️ ${activeSales[0]} የምትባል sales ቀድሞውኑ start ብላለች። እባክህ እሷ በ /leave ትበል.`);
    }
  }

  let timerId;
  let attempts = 0;
  do {
    timerId = Math.floor(100 + Math.random() * 900).toString();
    const usedSnapshot = await db.ref(`timer_id_ver/${timerId}/Used`).once('value');
    if (!usedSnapshot.exists()) break;
    attempts++;
  } while (attempts < 5);

  if (attempts >= 5) {
    return bot.sendMessage(chatId, "❌ Failed to generate a unique timer ID. Try again.");
  }

  await db.ref(`timer/`).set({
    time: Date.now(),
    timer_id: timerId,
    name: enteredName
  });

  await db.ref(`timer_id_ver/${timerId}`).set({
    time: Date.now(),
    Used: true,
    salesname: enteredName
  });

  bot.sendMessage(mainAdmin, `✅ የ ${enteredName} ሰዐት *ጀምሩዋል* with ID: *${timerId}*`, { parse_mode: "Markdown" });

  bot.sendMessage(chatId, `✅ ሰዐቶ ጀምሩዋል። ስራውን አስረክበው ሲወጡ leave ይበሉ።\n\n🆔 ID: *${timerId}*`, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "👋 Leave", callback_data: "/leave" }]
      ]
    }
  });
}


const startSession = {}; // Stores per-user /startmytime session states


const mainAdmin = process.env.Main_ADMIN_CHAT_ID;

bot.onText(/\/start-my-time/, (msg) => {
  const chatId = msg.chat.id;
  startSession[chatId] = { step: "ask_name" };
  bot.sendMessage(chatId, "👤 Please enter your *full name*:", { parse_mode: "Markdown" });
});
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!startSession[chatId]) return;

  const session = startSession[chatId];

  if (session.step === "ask_name") {
    session.name = text.trim();
    session.step = "ask_password";
    return bot.sendMessage(chatId, "🔒 Enter your *password*:", { parse_mode: "Markdown" });
  }

  if (session.step === "ask_password") {
    const correctPassword = "151584"; // store in .env
    if (text.trim() !== correctPassword) {
      delete startSession[chatId];
      return bot.sendMessage(chatId, "❌ Incorrect password. Access denied.");
    }

    session.step = "done";
    await handleStartMyTime(chatId, session.name);
    delete startSession[chatId];
  }
});


const leaveSession = {};

async function handleLeave(chatId, name) {
  const db = getDatabase();

  const timerSnapshot = await db.ref(`timer`).once('value');
  if (!timerSnapshot.exists()) {
    return bot.sendMessage(chatId, `⚠️ There is no active timer.`);
  }

  const timerData = timerSnapshot.val();
  const timerId = timerData.timer_id;
  const savedName = timerData.name;

  if (!timerId || !savedName || savedName.toLowerCase() !== name.toLowerCase()) {
    return bot.sendMessage(chatId, `❌ Name mismatch. Only *${savedName}* can end this session.`, {
      parse_mode: "Markdown"
    });
  }

  // ✅ Remove the timer
  await db.ref(`timer`).remove();

  // ✅ Mark timer ID as not used
  await db.ref(`timer_id_ver/${timerId}`).update({
    Used: false,
    endTime: Date.now()
  });

  bot.sendMessage(chatId, `👋 Thank you ${name}, your timer has ended. Timer ID: *${timerId}*`, {
    parse_mode: "Markdown"
  });

  // ✅ Create Excel report
  const paymentsSnap = await db.ref('Payments').once('value');
  const allData = [];
  let totalCBE = 0, totalCash = 0, totalTelebirr = 0;

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

        const method = val.paymentMethod?.toLowerCase();
        if (method?.includes('cbe')) totalCBE += amount;
        else if (method?.includes('cash')) totalCash += amount;
        else if (method?.includes('telebirr')) totalTelebirr += amount;
      }
    });
  }

  allData.push({});
  allData.push({ Name: 'Total CBE', Room: totalCBE + ' Birr' });
  allData.push({ Name: 'Total Cash', Room: totalCash + ' Birr' });
  allData.push({ Name: 'Total Telebirr', Room: totalTelebirr + ' Birr' });

  const worksheet = XLSX.utils.json_to_sheet(allData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  const fileName = `timer_${timerId}_report_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const filePath = `/tmp/${fileName}`;

  fs.writeFileSync(filePath, buffer);

  const mainAdmin = process.env.Main_ADMIN_CHAT_ID;
  await bot.sendDocument(mainAdmin, filePath, {}, {
    filename: fileName,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  fs.unlinkSync(filePath);

  bot.sendMessage(mainAdmin, `📢 *${name}* የ sales ሰዐቶን ጨርሰዋል — *${timerId}*.`, {
    parse_mode: "Markdown"
  });
}


async function handleForcedLeave(salesName, timerId, adminChatId) {
  const db = getDatabase();
  const timerRef = db.ref(`timer/${salesName}`);
  const snapshot = await timerRef.once('value');

  if (!snapshot.exists()) {
    return bot.sendMessage(adminChatId, `❌ No active timer found for ${salesName}.`);
  }

  await timerRef.remove();
  await db.ref(`timer_id_ver/${timerId}`).update({ Used: false, endTime: Date.now() });

  const paymentsSnap = await db.ref('Payments').once('value');
  const allData = [];
  let totalCBE = 0, totalCash = 0, totalTelebirr = 0;

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
        } else if (val.paymentMethod?.toLowerCase().includes('cash')) {
          totalCash += amount;
        } else if (val.paymentMethod?.toLowerCase().includes('telebirr')) {
          totalTelebirr += amount;
        }
        
      }
    });
  }

  allData.push({});
  allData.push({ Name: 'Total CBE', Room: totalCBE + ' Birr' });
  allData.push({ Name: 'Total Cash', Room: totalCash + ' Birr' });
  allData.push({ Name: 'Total Telebirr', Room: totalTelebirr + ' Birr' });
  const worksheet = XLSX.utils.json_to_sheet(allData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  const fileName = `forced_leave_${salesName}_${timerId}.xlsx`;
  const filePath = `/tmp/${fileName}`;

  fs.writeFileSync(filePath, buffer);

  await bot.sendDocument(adminChatId, filePath, {}, {
    filename: fileName,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  fs.unlinkSync(filePath);

  await bot.sendMessage(adminChatId, `✅ Force leave completed for *${salesName}* with Timer ID *${timerId}*.\nExcel report has been sent.`, {
    parse_mode: "Markdown"
  });
}

async function handleActiveCommand(chatId) {
  if (chatId.toString() !== process.env.Main_ADMIN_CHAT_ID) {
    return bot.sendMessage(chatId, "❌ You are not authorized to use this command.");
  }

  const timerSnapshot = await database.ref('timer').once('value');
  if (!timerSnapshot.exists()) {
    return bot.sendMessage(chatId, "✅ ማንም በ አሁን ሰዐት ሰዐቱን አላስጀመረም.");
  }

  const data = timerSnapshot.val();
  const activeTimers = Object.entries(data);

  for (const [salesName, details] of activeTimers) {
    const { timer_id, time } = details;
    const startTime = new Date(time).toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' });

    const paymentsSnap = await database.ref('Payments').once('value');
    let totalCBE = 0, totalCash = 0, totalTelebirr = 0;
    let totalRoomsBooked = 0;  // Initialize rooms booked counter

    if (paymentsSnap.exists()) {
      paymentsSnap.forEach(snap => {
        const val = snap.val();
        if (val.timeid === String(timer_id)) {
          const amt = parseFloat(val.amountInBirr) || 0;
          const method = val.paymentMethod?.toLowerCase() || '';
          if (method.includes('cbe')) totalCBE += amt;
          else if (method.includes('cash')) totalCash += amt;
          else if (method.includes('telebirr')) totalTelebirr += amt;

          // Count booked rooms if selectedRoom exists and is non-empty
          if (val.selectedRoom) totalRoomsBooked++;
        }
      });
    }

    const text = `🟢 *Active Timer Info:*\n\n` +
                 `👤 ስም: *${salesName}*\n` +
                 `🆔 Timer ID: *${timer_id}*\n` +
                 `⏰ ሰዐቱን የጀመረበት ሰዐት: *${startTime}*\n\n` +
                 `💵 Cash: *${totalCash} Birr*\n` +
                 `🏦 CBE: *${totalCBE} Birr*\n` +
                 `📱 Telebirr: *${totalTelebirr} Birr*\n` +
                 `🏨 sales ባስተናገደበት የጊዜ ገደብ ውስጥ የተያዙ አልጋዎች: *${totalRoomsBooked}*`;

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
}


async function handleHistoryCommand(chatId) {
  if (chatId.toString() !== process.env.Main_ADMIN_CHAT_ID) {
    return bot.sendMessage(chatId, "❌ You are not authorized to use this command.");
  }

  historySessions[chatId] = { step: 'awaiting_timer_ids' };
  await bot.sendMessage(chatId, "🔍 ወደሃላ ተመልሰው ማየት የሚፈልጉትን ያስገቡ, ከአንድ በላይ ካሎት በ ኮማ ይለያዩ (e.g. `1234, 3554`):", {
    parse_mode: "Markdown"
  });
}

async function handleHistoryExport(timerIds, chatId) {
  if (!Array.isArray(timerIds) || timerIds.length === 0) {
    return bot.sendMessage(chatId, "❌ No valid Timer IDs provided.");
  }

  const paymentsSnap = await database.ref('Payments').once('value');
  const allData = [];

  let totalCBE = 0, totalCash = 0, totalTelebirr = 0;
  let totalRoomsBooked = 0;

  if (paymentsSnap.exists()) {
    paymentsSnap.forEach(snap => {
      const val = snap.val();
      if (timerIds.includes(val.timeid)) {
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

        const method = val.paymentMethod?.toLowerCase() || '';
        if (method.includes('cbe')) totalCBE += amount;
        else if (method.includes('cash')) totalCash += amount;
        else if (method.includes('telebirr')) totalTelebirr += amount;

        // Count rooms booked - assuming each val.selectedRoom represents 1 room booked
        if (val.selectedRoom) totalRoomsBooked += 1;
      }
    });
  }

  allData.push({});
  allData.push({ Name: 'Total CBE', Room: totalCBE + ' Birr' });
  allData.push({ Name: 'Total Cash', Room: totalCash + ' Birr' });
  allData.push({ Name: 'Total Telebirr', Room: totalTelebirr + ' Birr' });
  allData.push({ Name: 'Total Rooms Booked', Room: totalRoomsBooked });

  // Create Excel file
  const worksheet = XLSX.utils.json_to_sheet(allData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'History');

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  const fileName = `history_report_${new Date().toISOString().slice(0,10)}.xlsx`;
  const filePath = `/tmp/${fileName}`;

  fs.writeFileSync(filePath, buffer);

  // Send Excel report
  await bot.sendDocument(chatId, filePath, {}, {
    filename: fileName,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  fs.unlinkSync(filePath);

  // Send summary message
  const summaryText = `🟢 *History Summary*\n\n` +
                      `🆔 Timer IDs: *${timerIds.join(', ')}*\n\n` +
                      `💵 Cash: *${totalCash} Birr*\n` +
                      `🏦 CBE: *${totalCBE} Birr*\n` +
                      `📱 Telebirr: *${totalTelebirr} Birr*\n` +
                      `🏨 Total Rooms Booked: *${totalRoomsBooked}*`;

  bot.sendMessage(chatId, summaryText, { parse_mode: 'Markdown' });
}



bot.onText(/\/active/, async (msg) => {
  const chatId = msg.chat.id;

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

    // 🧮 Calculate totals and count rooms booked
    const paymentsSnap = await database.ref('Payments').once('value');
    let totalCBE = 0, totalCash = 0, totalTelebirr = 0;
    let totalRoomsBooked = 0;

    if (paymentsSnap.exists()) {
      paymentsSnap.forEach(snap => {
        const val = snap.val();
        if (val.timeid === String(timer_id)) {
          const amt = parseFloat(val.amountInBirr) || 0;
          const method = val.paymentMethod?.toLowerCase() || '';
          if (method.includes('cbe')) totalCBE += amt;
          else if (method.includes('cash')) totalCash += amt;
          else if (method.includes('telebirr')) totalTelebirr += amt;

          // Count booked rooms for this timer ID
          if (val.selectedRoom) totalRoomsBooked += 1;
        }
      });
    }

    const text = `🟢 *Active Timer Info:*\n\n` +
                 `👤 Salesperson: *${salesName}*\n` +
                 `🆔 Timer ID: *${timer_id}*\n` +
                 `⏰ Started: *${startTime}*\n\n` +
                 `💵 Cash: *${totalCash} Birr*\n` +
                 `🏦 CBE: *${totalCBE} Birr*\n` +
                 `📱 Telebirr: *${totalTelebirr} Birr*\n` +
                 `🏨 Total Rooms Booked: *${totalRoomsBooked}*`;

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




const historySessions = {}; // For session state per chat

bot.onText(/\/history/, async (msg) => {
  const chatId = msg.chat.id;

  if (chatId.toString() !== process.env.Main_ADMIN_CHAT_ID) {
    return bot.sendMessage(chatId, "❌ You are not authorized to use this command.");
  }

  historySessions[chatId] = { step: 'awaiting_timer_ids' };
  bot.sendMessage(chatId, "🔍 ወደሃላ ተመልሰው ማየት የሚፈልጉትን ያስገቡ, ከአንድ በላይ ካሎት በ ኮማ ይለያዩ (e.g. `1234, 3554`):", {
    parse_mode: "Markdown"
  });
});





bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const isAdmin = chatId == process.env.Main_ADMIN_CHAT_ID;

  let helpText = `
📖 *Available Commands:*

🟢 /start-my-time – Start your working timer session  
🔴 /leave – End your session and receive the daily report  
🆘 /help – Show this help message
`;

  if (isAdmin) {
    helpText += `
👮 *Admin Commands:*
📊 /active – View which salesperson is currently active  
📂 /history – View past activities and reports  
`;
  }

  bot.sendMessage(chatId, helpText, { parse_mode: "Markdown" });
});



bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  const isAdmin = chatId.toString() === process.env.Main_ADMIN_CHAT_ID;

  await bot.answerCallbackQuery(query.id);

  // /start-my-time
  if (data === "/start-my-time") {
    startSession[chatId] = { step: "ask_name" };
    return bot.sendMessage(chatId, "👤 Please enter your *full name*:", { parse_mode: "Markdown" });
  }
  

  // /leave
  if (data === "/leave") {
    leaveSession[chatId] = { step: "awaiting_name_leave" };
    return bot.sendMessage(chatId, "👤 Please enter your *full name* to leave:", { parse_mode: "Markdown" });
  }
  

  // Admin only
  if (!isAdmin) {
    return bot.sendMessage(chatId, "❌ You are not authorized to perform this action.");
  }

  // /active
  if (data === "/active") {
    return handleActiveCommand(chatId);
    }

  // /history
  if (data === "/history") {
    return handleHistoryCommand(chatId);
    }

  // get_excel_{salesName}_{timerId}
  if (data.startsWith("get_excel_")) {
    const [, , salesName, timerId] = data.split("_");
    return generateExcelForTimer(salesName, timerId, chatId);
  }

  // force_leave_{salesName}_{timerId}
  if (data.startsWith("force_leave_")) {
    const [, salesName, timerId] = data.split("_");
    forceLeaveSessions[chatId] = { expectedTimerId: timerId, salesName };
    return bot.sendMessage(chatId, `⚠️ Please confirm the force leave by typing Timer ID: *${timerId}*`, { parse_mode: 'Markdown' });
  }

  return bot.sendMessage(chatId, '❓ Unknown button command.');
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  // Handle screenshot photo
  const screenshotSession = screenshotSessions[chatId];
  if (screenshotSession?.step === 'awaiting_photo') {
    if (msg.photo) {
      const fileId = msg.photo[msg.photo.length - 1].file_id;
      await database.ref(`Screenshot_id/${screenshotSession.screenshotId}`).set({
        image: fileId,
        date: new Date().toISOString(),
        Id: chatId,
      });

      delete screenshotSessions[chatId];
      return bot.sendMessage(chatId, `✅ Screenshot saved under ID *${screenshotSession.screenshotId}*`, { parse_mode: 'Markdown' });
    } else if (msg.text && !msg.text.startsWith('/')) {
      return bot.sendMessage(chatId, `❌ Please send a valid photo.`);
    }
    return;
  }

  // History input (admin only)
  if (chatId.toString() === process.env.Main_ADMIN_CHAT_ID) {
    const historySession = historySessions[chatId];
    if (historySession?.step === 'awaiting_timer_ids') {
      const timerIds = text.split(',').map(id => id.trim()).filter(Boolean);
      if (timerIds.length === 0) {
        return bot.sendMessage(chatId, "❌ Invalid input. Please enter at least one valid Timer ID.");
      }
      delete historySessions[chatId];
      return handleHistoryExport(timerIds, chatId);
    }

    // Force Leave Confirmation
    const force = forceLeaveSessions[chatId];
    if (force && text === force.expectedTimerId) {
      delete forceLeaveSessions[chatId];
      return handleForcedLeave(force.salesName, force.expectedTimerId, chatId);
    } else if (force) {
      delete forceLeaveSessions[chatId];
      return bot.sendMessage(chatId, "❌ Incorrect Timer ID. Force leave cancelled.");
    }
  }
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  // Existing logic for startSession...
  if (startSession[chatId]) {
    const session = startSession[chatId];
    if (session.step === "awaiting_name_leave") {
      session.name = text;
      session.step = "awaiting_password";
      return bot.sendMessage(chatId, "🔒 Enter the *password* to continue:", { parse_mode: "Markdown" });
    }
    if (session.step === "awaiting_password") {
      if (text !== "151584") {
        delete startSession[chatId];
        return bot.sendMessage(chatId, "❌ Incorrect password.");
      }
      await handleStartMyTime(chatId, session.name);
      delete startSession[chatId];
    }
  }

  // ✅ Logic for leave session
  if (leaveSession[chatId]) {
    const name = text;
    delete leaveSession[chatId];
    return handleLeave(chatId, name);
  }
});


const seenDailyOrders = new Set();
const seenCashEntries = new Set();

const startTime = Date.now(); // Record bot start time

// Daily Orders
const dailyOrdersRef = db.ref('Daily_Orders');
dailyOrdersRef.on('child_added', (snapshot) => {
  const title = snapshot.key;
  const titleRef = db.ref(`Daily_Orders/${title}`);

  titleRef.on("child_added", (orderSnap) => {
    const data = orderSnap.val();

    // Skip old entries
    if (!data.timestamp || data.timestamp < startTime) return;

    const msg = `
🧾 *New Daily Order* under *${title}*
 Date: ${data.date || '-'}
 Name: ${data.Name || '-'}
 room_ዝርዝር: ${data.room_ዝርዝር || '-'}
 room_ብዛት: ${data.room_ብዛት || '-'}
 U/P: ${data.u_p || '-'}
 T/P: ${data.t_p || '-'}
🍛 Food: ${data.food || '-'} (${data.foodAmount || 0})
🥤 Drink: ${data.drink || '-'} (${data.drinkAmount || 0})
☕ Hot Drink: ${data.hotDrink || '-'} (${data.hotAmount || 0})
🛏 Room: ${data.room || '-'}
    `.trim();

    bot.sendMessage(mainAdmin, msg, { parse_mode: 'Markdown' });
  });
});

// Cash Register
const cashRef = db.ref('cashregister');
cashRef.on("child_added", (dateSnap) => {
  const date = dateSnap.key;
  const dateRef = db.ref(`cashregister/${date}`);

  dateRef.on("child_added", (entrySnap) => {
    const val = entrySnap.val();

    // Skip old entries
    if (!val.timestamp || val.timestamp < startTime) return;

    const msg = `
💰 *New Cash Register Entry* for ${date}
🛏 Room: ${val.room || 0}
🍴 Restaurant: ${val.restaurant || 0}
🥘 Dube: ${val.dube || 0}
💳 Prepaid: ${val.prepaid || 'None'}
❌ Void: ${val.void || 0}
🕒 Time: ${val.timestamp || '-'}
    `.trim();

    bot.sendMessage(mainAdmin, msg, { parse_mode: 'Markdown' });
  });
});



bot.onText(/^\/show$/, async (msg) => {
  const chatId = msg.chat.id;

  if (chatId.toString() !== mainAdmin) {
    return bot.sendMessage(chatId, "⛔ You are not authorized.");
  }

const snapshot = await db.ref('timer_id_ver').once('value');
const data = snapshot.val();

  if (!data) {
    return bot.sendMessage(chatId, "❌ No active timer IDs found.");
  }

  const entries = Object.entries(data).map(([id, val]) => ({
    id,
    salesname: val.salesname || 'Unknown',
    time: val.time || 0
  }));

  // Sort by time descending
  const sorted = entries.sort((a, b) => b.time - a.time).slice(0, 5);

  const message = sorted.map((entry, index) => {
    const timeStr = DateTime.fromMillis(entry.time)
      .setZone('Africa/Addis_Ababa')
      .toFormat('yyyy-MM-dd hh:mm a');

    return `${index + 1}. 🆔 ${entry.id} | 👤 ${entry.salesname} | 📅 ${timeStr}`;
  }).join('\n');

  bot.sendMessage(chatId, `🕒 Latest 5 Active Timers:\n\n${message}`);
});


bot.onText(/^\/check$/, async (msg) => {
  const chatId = msg.chat.id;

  // Only allow main admin or specific person
  if (!allowedUsers.includes(chatId)) {
    return bot.sendMessage(chatId, "❌ You are not authorized to use this command.");
  }

  try {
    const snapshot = await database.ref('Payments').once('value');
    if (!snapshot.exists()) {
      return bot.sendMessage(chatId, "✅ No payments found.");
    }

    const payments = Object.entries(snapshot.val());
    const duplicates = [];

    // Compare each record with every other record
    for (let i = 0; i < payments.length; i++) {
      const [id1, p1] = payments[i];
      if (!p1.timestamp) continue;
    
      const time1 = DateTime.fromFormat(
        p1.timestamp,
        "MMMM d, yyyy 'at' hh:mm:ss a",
        { zone: 'utc' }
      );
      if (!time1.isValid) continue;
    
      for (let j = i + 1; j < payments.length; j++) {
        const [id2, p2] = payments[j];
        if (!p2.timestamp) continue;
    
        const time2 = DateTime.fromFormat(
          p2.timestamp,
          "MMMM d, yyyy 'at' hh:mm:ss a",
          { zone: 'utc' }
        );
        if (!time2.isValid) continue;
    
        // ✅ Check same name, phone, and room
        if (
          p1.name?.trim().toLowerCase() === p2.name?.trim().toLowerCase() &&
          p1.phone?.trim() === p2.phone?.trim() &&
          p1.selectedRoom?.trim() === p2.selectedRoom?.trim()
        ) {
          const diffMinutes = Math.abs(time1.diff(time2, 'minutes').minutes);
    
          if (diffMinutes <= 50) {
            duplicates.push({ id1, id2, p1, p2, diffMinutes });
          }
        }
      }
    }
    

    if (duplicates.length === 0) {
      return bot.sendMessage(chatId, "✅ No duplicate registrations found within 50 minutes.");
    }

    // Send each duplicate with delete button
    for (const dup of duplicates) {
      const msgText =
        `⚠ *Duplicate Registration Found*\n\n` +
        `Name: ${dup.p1.name}\nPhone: ${dup.p1.phone}\nTime gap: ${dup.diffMinutes.toFixed(1)} min\n\n` +
        `1️⃣ ID: \`${dup.id1}\`\nTimestamp: ${dup.p1.timestamp}\nRoom: ${dup.p1.selectedRoom}\n\n` +
        `2️⃣ ID: \`${dup.id2}\`\nTimestamp: ${dup.p2.timestamp}\nRoom: ${dup.p2.selectedRoom}`;

      await bot.sendMessage(chatId, msgText, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: `🗑 Delete 1️⃣`, callback_data: `delete_payment:${dup.id1}` },
              { text: `🗑 Delete 2️⃣`, callback_data: `delete_payment:${dup.id2}` }
            ]
          ]
        }
      });
    }

  } catch (error) {
    console.error("Error checking for duplicates:", error);
    bot.sendMessage(chatId, "❌ Error while checking for duplicates.");
  }
});


bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data.startsWith("delete_payment:")) {
    const paymentId = data.split(":")[1];
    try {
      await database.ref(`Payments/${paymentId}`).remove();
      await bot.sendMessage(chatId, `✅ Payment with ID \`${paymentId}\` deleted.`, { parse_mode: "Markdown" });
    } catch (err) {
      console.error("Delete error:", err);
      await bot.sendMessage(chatId, "❌ Failed to delete payment.");
    }
  }
});
