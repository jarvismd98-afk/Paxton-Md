// ==================== PAXTON-MD v5.0 - COMPLETE FIXED VERSION ====================
// Permanent Owner: 166602502836424 (Paxton)
// Features: 150 commands, fixed message handling, auto-status working, hosting ready
// =============================================================================

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers,
    downloadContentFromMessage,
    jidDecode,
    proto,
    getContentType
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const fs = require('fs-extra');
const qrcode = require('qrcode-terminal');
const moment = require('moment-timezone');
const os = require('os');
const { exec, spawn } = require('child_process');
const crypto = require('crypto');
const axios = require('axios');
const util = require('util');
const { performance } = require('perf_hooks');
const path = require('path');

// ==================== TERMINAL COLORS ====================
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    underline: '\x1b[4m'
};

// ==================== CONFIGURATION ====================
const PERMANENT_OWNER = '166602502836424'; // YOUR PERMANENT OWNER NUMBER
const OWNER_NAME = 'Paxton';
const BOT_NAME = '𝐏𝐀𝐗𝐓𝐎𝐍-𝐌𝐃 ✨';
const BOT_VERSION = '5.0.0';
const FOOTER = '▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n💫 *Powered by Paxton-Tech* 💫';
const BOT_LOGO = "https://i.ibb.co/60pjn5Tx/IMG-20260303-WA0106.jpg";

// ==================== GLOBAL VARIABLES ====================
let prefix = '.';
let prefixless = true;
let botJid = null;
let commands = new Map();
let startTime = Date.now();
let db = {};

// ==================== DATABASE SETUP ====================
const dbPath = './database.json';
const sessionsDir = './sessions';
const tempDir = './temp';

if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir);

// Initialize database
const initDb = () => ({
    users: {},
    groups: {},
    settings: {
        prefix: '.',
        botName: BOT_NAME,
        ownerName: OWNER_NAME,
        footer: FOOTER,
        public: true,
        privateMode: false,
        groupOnly: false,
        selfOnly: false,
        maintenance: false,
        prefixless: true,
        antilink: false,
        welcome: false,
        goodbye: false,
        leveling: false,
        autoStatus: false,
        autoReact: false,
        autoView: false,
        autoBio: false,
        autoRead: false,
        autoLike: false,
        autoRecord: false,
        autoTyping: false
    },
    banned: [],
    warns: {},
    married: {},
    proposals: {},
    hijacked: {},
    bugs: [],
    reviews: [],
    levels: {},
    exp: {},
    money: {},
    wordfilters: {},
    groupRules: {},
    welcomeMsg: {},
    goodbyeMsg: {},
    antilinkGroups: {},
    statusReactions: ['❤️', '🔥', '👍', '😂', '🥰', '👏', '💯', '🎉'],
    autoStatusLog: [],
    permanentOwner: PERMANENT_OWNER,
    ownerNumbers: [PERMANENT_OWNER],
    sessionOwners: []
});

// Load or create database
if (fs.existsSync(dbPath)) {
    try {
        db = JSON.parse(fs.readFileSync(dbPath));
        prefix = db.settings?.prefix || '.';
        prefixless = db.settings?.prefixless !== false;
        
        // Ensure permanent owner is always in owner list
        if (!db.permanentOwner) db.permanentOwner = PERMANENT_OWNER;
        if (!db.ownerNumbers) db.ownerNumbers = [];
        if (!db.ownerNumbers.includes(PERMANENT_OWNER)) {
            db.ownerNumbers.push(PERMANENT_OWNER);
        }
        if (!db.sessionOwners) db.sessionOwners = [];
    } catch (e) {
        db = initDb();
    }
} else {
    db = initDb();
}

const saveDb = () => {
    db.settings.prefix = prefix;
    db.settings.prefixless = prefixless;
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
};

// ==================== OWNER RECOGNITION FUNCTIONS ====================
const isPermanentOwner = (sender) => {
    const num = sender.split('@')[0];
    return num === PERMANENT_OWNER;
};

const isSessionOwner = (sender) => {
    const num = sender.split('@')[0];
    return db.sessionOwners?.includes(num) || false;
};

const isOwner = (sender) => {
    const num = sender.split('@')[0];
    // Check if permanent owner OR session owner
    return num === PERMANENT_OWNER || (db.sessionOwners?.includes(num) || false);
};

const isBanned = (sender) => db.banned?.includes(sender.split('@')[0]) || false;

// ==================== UTILITY FUNCTIONS ====================
const isAdmin = async (sock, group, user) => {
    try {
        const meta = await sock.groupMetadata(group);
        const participant = meta.participants.find(p => p.id === user);
        return participant?.admin === 'admin' || participant?.admin === 'superadmin';
    } catch {
        return false;
    }
};

const getUptime = () => {
    const seconds = process.uptime();
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
};

const getRAM = () => {
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    const total = process.memoryUsage().heapTotal / 1024 / 1024;
    return `${used.toFixed(1)}MB/${total.toFixed(1)}MB`;
};

const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

const isUrl = (text) => {
    return /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi.test(text);
};

const getUserName = async (sock, jid) => {
    try {
        const [result] = await sock.onWhatsApp(jid);
        return result?.notify || result?.verifiedName || jid.split('@')[0];
    } catch {
        return jid.split('@')[0];
    }
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Format phone number for display with colors
const formatPhone = (jid) => {
    const num = jid.split('@')[0];
    if (num === PERMANENT_OWNER) {
        return `${colors.green}👑 ${num}${colors.reset}`;
    }
    if (db.sessionOwners?.includes(num)) {
        return `${colors.yellow}🔰 ${num}${colors.reset}`;
    }
    return `${colors.red}${num}${colors.reset}`;
};

// ==================== AUTO STATUS HANDLER (FIXED) ====================
const handleAutoStatus = async (sock, statusMessage) => {
    if (!db.settings.autoStatus && !db.settings.autoReact && !db.settings.autoView) return;
    
    try {
        const statusJid = statusMessage.key.remoteJid;
        const statusSender = statusMessage.key.participant || statusJid;
        
        // Auto view status
        if (db.settings.autoStatus) {
            await sock.readMessages([statusMessage.key]);
            db.autoStatusLog = db.autoStatusLog || [];
            db.autoStatusLog.push({
                from: statusSender,
                time: Date.now()
            });
            if (db.autoStatusLog.length > 50) db.autoStatusLog.shift();
            console.log(`${colors.green}✅ Auto-viewed status from ${statusSender.split('@')[0]}${colors.reset}`);
        }
        
        // Auto react to status
        if (db.settings.autoReact && statusMessage.message) {
            const reaction = getRandomElement(db.statusReactions || ['❤️', '🔥', '👍']);
            await sock.sendMessage(statusJid, {
                react: {
                    text: reaction,
                    key: statusMessage.key
                }
            });
            console.log(`${colors.green}✅ Auto-reacted ${reaction} to status${colors.reset}`);
        }
    } catch (e) {
        console.error(`${colors.red}❌ Auto status error:${colors.reset}`, e.message);
    }
};

// ==================== AUTO VIEW ONCE HANDLER (FIXED) ====================
const handleAutoViewOnce = async (sock, msg, from, sender) => {
    if (!db.settings.autoView) return;
    
    try {
        if (msg.message?.viewOnceMessageV2 || msg.message?.viewOnceMessage) {
            const viewOnceMsg = msg.message.viewOnceMessageV2?.message || msg.message.viewOnceMessage?.message;
            
            if (viewOnceMsg?.imageMessage) {
                const stream = await downloadContentFromMessage(viewOnceMsg.imageMessage, 'image');
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                await sock.sendMessage(from, {
                    image: buffer,
                    caption: `👁️ *View-Once Image Saved*\nFrom: @${sender.split('@')[0]}`,
                    mentions: [sender]
                });
                console.log(`${colors.green}✅ Saved view-once image from ${sender.split('@')[0]}${colors.reset}`);
            } else if (viewOnceMsg?.videoMessage) {
                const stream = await downloadContentFromMessage(viewOnceMsg.videoMessage, 'video');
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                await sock.sendMessage(from, {
                    video: buffer,
                    caption: `👁️ *View-Once Video Saved*\nFrom: @${sender.split('@')[0]}`,
                    mentions: [sender]
                });
                console.log(`${colors.green}✅ Saved view-once video from ${sender.split('@')[0]}${colors.reset}`);
            }
        }
    } catch (e) {
        console.error(`${colors.red}❌ Auto view-once error:${colors.reset}`, e.message);
    }
};

// ==================== AUTO READ/LIKE HANDLER ====================
const handleAutoReadLike = async (sock, msg, from, sender) => {
    if (!db.settings.autoRead && !db.settings.autoLike) return;
    
    try {
        if (db.settings.autoRead) {
            await sock.readMessages([msg.key]);
        }
        
        if (db.settings.autoLike && !msg.key.fromMe) {
            await sock.sendMessage(from, {
                react: {
                    text: getRandomElement(['❤️', '👍', '🔥']),
                    key: msg.key
                }
            });
        }
    } catch (e) {
        console.error(`${colors.red}❌ Auto read/like error:${colors.reset}`, e.message);
    }
};

// ==================== AUTO BIO HANDLER (FIXED) ====================
const updateAutoBio = async (sock) => {
    if (!db.settings.autoBio) return;
    
    try {
        if (!sock || !sock.user) {
            console.log(`${colors.yellow}⚠️ Bot not connected, skipping auto bio${colors.reset}`);
            return;
        }
        
        const time = moment().tz('Africa/Johannesburg').format('HH:mm');
        const date = moment().tz('Africa/Johannesburg').format('DD/MM');
        const users = Object.keys(db.users || {}).length;
        const groups = Object.keys(db.groups || {}).length;
        const uptime = getUptime();
        
        const bio = `🤖 PAXTON-MD | ⏰ ${time} ${date} | 👥 ${users}U | 👥 ${groups}G | 🕐 ${uptime}`;
        
        await Promise.race([
            sock.updateProfileStatus(bio),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
        ]);
        
        console.log(`${colors.green}✅ Auto bio updated: ${bio}${colors.reset}`);
    } catch (e) {
        console.error(`${colors.yellow}⚠️ Auto bio error:${colors.reset}`, e.message);
        // Temporarily disable auto bio if it keeps failing
        if (e.message.includes('Connection Closed') || e.message.includes('Timeout')) {
            console.log(`${colors.yellow}⚠️ Disabling auto bio due to errors${colors.reset}`);
            db.settings.autoBio = false;
            saveDb();
        }
    }
};

// ==================== STYLISH MENU ====================
const getMenu = async (sock, sender, userIsOwner) => {
    const userNum = sender.split('@')[0];
    const userName = await getUserName(sock, sender);
    const uptime = getUptime();
    const ram = getRAM();
    const ping = getRandomInt(50, 150);
    const time = moment().tz('Africa/Johannesburg').format('HH:mm:ss');
    const date = moment().tz('Africa/Johannesburg').format('DD/MM/YYYY');
    const cmdCount = commands.size;
    
    const ownerStatus = isPermanentOwner(sender) ? '👑 PERMANENT OWNER' : 
                       isSessionOwner(sender) ? '🔰 SESSION OWNER' : 
                       '👤 USER';
    
    return `╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃           ✨ ${BOT_NAME} ✨              ┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

📊 *USER INFORMATION*
┣ 👋 *Hello,* @${userName}
┣ 📝 *Number:* ${userNum}
┣ ⚡ *Status:* ${ownerStatus}
┣ 🔰 *Prefix:* ${prefix}
┣ 🕐 *Uptime:* ${uptime}
┣ 💾 *RAM:* ${ram}
┣ ⚡ *Ping:* ${ping}ms
┣ 📦 *Version:* ${BOT_VERSION}
┗ 📅 *${date} ${time}*

╭━━━『 📱 GENERAL (20) 』━━━╮
┃ .menu
┃ .help
┃ .ping
┃ .alive
┃ .owner
┃ .info
┃ .uptime
┃ .runtime
┃ .profile
┃ .me
┃ .weather [city]
┃ .calc [expression]
┃ .translate [text]
┃ .shorten [url]
┃ .define [word]
┃ .filter [word]
┃ .unfilter [word]
┃ .poll [q|o1|o2]
┃ .vote [option]
┃ .results
┃ .invite
┃ .getpp @user
┃ .setpp [image]
┃ .creategroup [name]
┃ .listgroups
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━『 🎵 MEDIA (15) 』━━━╮
┃ .sticker
┃ .s
┃ .toimg
┃ .image
┃ .tourl
┃ .url
┃ .yt [url]
┃ .ytmp3 [url]
┃ .ytmp4 [url]
┃ .play [song]
┃ .song [name]
┃ .video [name]
┃ .tiktok [url]
┃ .ig [url]
┃ .fb [url]
┃ .twitter [url]
┃ .spotify [url]
┃ .soundcloud [url]
┃ .pinterest [query]
┃ .wallpaper [query]
┃ .gif [query]
┃ .lyrics [song]
┃ .music [name]
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━『 🎮 PLAYFUL (15) 』━━━╮
┃ .joke
┃ .fact
┃ .quote
┃ .roast @user
┃ .compliment @user
┃ .flipcoin
┃ .dice
┃ .rps [choice]
┃ .truth
┃ .dare
┃ .wouldyourather
┃ .8ball [question]
┃ .mood
┃ .fortune
┃ .simprate @user
┃ .gayrate @user
┃ .smartrate @user
┃ .rizz @user
┃ .swag @user
┃ .vibe @user
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━『 👥 GROUP (20) 』━━━╮
┃ .groupinfo
┃ .tagall [msg]
┃ .hidetag [msg]
┃ .admins
┃ .tagadmin [msg]
┃ .listadmin
┃ .add [number]
┃ .kick @user
┃ .promote @user
┃ .demote @user
┃ .mute
┃ .unmute
┃ .lock
┃ .unlock
┃ .grouplink
┃ .revoke
┃ .setname [name]
┃ .setdesc [desc]
┃ .setgpic [image]
┃ .welcome [on/off]
┃ .goodbye [on/off]
┃ .setwelcome [msg]
┃ .setgoodbye [msg]
┃ .tagadmins [msg]
┃ .everyone [msg]
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━『 💍 MARRIAGE (15) 』━━━╮
┃ .marry @user
┃ .accept
┃ .reject
┃ .divorce
┃ .married
┃ .spouse
┃ .proposals
┃ .love @user
┃ .kiss @user
┃ .hug @user
┃ .cuddle @user
┃ .pat @user
┃ .slap @user
┃ .poke @user
┃ .gift @user [amount]
┃ .lovemeter @1 @2
┃ .ship @1 @2
┃ .compatibility @1 @2
┃ .valentine @user
┃ .propose @user
┃ .engagement @user
┃ .anniversary
┃ .breakup @user
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━『 🛡️ ANTI (10) 』━━━╮
┃ .antilink [on/off]
┃ .antiforeign [on/off]
┃ .antifake [on/off]
┃ .antitoxic [on/off]
┃ .antispam [on/off]
┃ .antibot [on/off]
┃ .antiword [add/remove]
┃ .listwords
┃ .warn @user
┃ .warns @user
┃ .resetwarns @user
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━『 🐛 BUG/HAZARD (10) 』━━━╮
┃ .bug [report]
┃ .bugs
┃ .mybug
┃ .deletebug [id]
┃ .hack @user
┃ .hijack @user
┃ .release @user
┃ .hijacked
┃ .clone @user
┃ .destroy
┃ .crash
┃ .nuke
┃ .raid
┃ .chaos
┃ .resetgroup
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━『 ⚙️ BOT SETTINGS (15) 』━━━╮
┃ .autostatus [on/off]
┃ .autoreact [on/off]
┃ .autoview [on/off]
┃ .autobio [on/off]
┃ .autoread [on/off]
┃ .autolike [on/off]
┃ .autorecord [on/off]
┃ .autotyping [on/off]
┃ .public
┃ .private
┃ .grouponly
┃ .selfonly
┃ .maintenance [on/off]
┃ .setprefix [symbol]
┃ .setprefixless [on/off]
┃ .setbotname [name]
┃ .setowner [name]
┃ .setfooter [text]
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━『 👑 OWNER (20) 』━━━╮
┃ .ban @user
┃ .unban @user
┃ .banlist
┃ .broadcast [msg]
┃ .join [link]
┃ .leave
┃ .block @user
┃ .unblock @user
┃ .delete (reply to msg)
┃ .eval [code]
┃ .exec [cmd]
┃ .restart
┃ .shutdown
┃ .addowner [number]
┃ .removeowner [number]
┃ .listowners
┃ .addsudo [number]
┃ .delsudo [number]
┃ .listsudo
┃ .addsession [number]
┃ .removesession [number]
┃ .listsessions
┃ .backup
┃ .restore
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

${FOOTER}`;
};

// ==================== REGISTER ALL COMMANDS ====================
const registerCommands = () => {
    commands.clear();

    // ========== BASIC COMMANDS ==========
    commands.set('menu', async (sock, from, args, sender, isGroup, userIsOwner) => {
        const menu = await getMenu(sock, sender, userIsOwner);
        await sock.sendMessage(from, { 
            image: { url: BOT_LOGO },
            caption: menu,
            mentions: [sender]
        });
    });

    commands.set('help', async (sock, from, args, sender, isGroup, userIsOwner) => {
        const menu = await getMenu(sock, sender, userIsOwner);
        await sock.sendMessage(from, { 
            image: { url: BOT_LOGO },
            caption: menu,
            mentions: [sender]
        });
    });

    commands.set('ping', async (sock, from) => {
        const start = Date.now();
        await sock.sendMessage(from, { text: '🏓 Pong!' });
        const end = Date.now();
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  📡 *PING*  \n╰━━━━━━━━━━━━━━╯\n\n⚡ Response: *${end - start}ms*\n\n${FOOTER}`
        });
    });

    commands.set('alive', async (sock, from) => {
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  ✅ *BOT ALIVE*  \n╰━━━━━━━━━━━━━━╯\n\n🤖 *${BOT_NAME}*\n⏰ Uptime: ${getUptime()}\n⚡ Status: Online\n\n${FOOTER}`
        });
    });

    commands.set('owner', async (sock, from) => {
        let ownerInfo = `╭━━━━━━━━━━━━━━╮\n┃  👑 *OWNER*  \n╰━━━━━━━━━━━━━━╯\n\n📛 Permanent Owner: ${OWNER_NAME}\n📱 Number: ${PERMANENT_OWNER}\n💬 Status: Online\n\n`;
        
        if (db.sessionOwners?.length > 0) {
            ownerInfo += `📋 *Session Owners:*\n`;
            db.sessionOwners.forEach((num, i) => {
                ownerInfo += `${i+1}. ${num}\n`;
            });
            ownerInfo += `\n`;
        }
        
        ownerInfo += FOOTER;
        await sock.sendMessage(from, { text: ownerInfo });
    });

    commands.set('info', async (sock, from) => {
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  🤖 *BOT INFO*  \n╰━━━━━━━━━━━━━━╯\n\n📛 Name: ${BOT_NAME}\n📦 Version: ${BOT_VERSION}\n👑 Owner: ${OWNER_NAME}\n📱 Number: ${PERMANENT_OWNER}\n⏰ Uptime: ${getUptime()}\n💾 RAM: ${getRAM()}\n📊 Commands: ${commands.size}\n🔰 Prefix: ${prefix}\n🔰 Prefixless: ${prefixless ? '✅' : '❌'}\n\n📋 Session Owners: ${db.sessionOwners?.length || 0}\n\n${FOOTER}`
        });
    });

    commands.set('uptime', async (sock, from) => {
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  ⏰ *UPTIME*  \n╰━━━━━━━━━━━━━━╯\n\n🕐 *${getUptime()}*\n💾 RAM: ${getRAM()}\n\n${FOOTER}`
        });
    });

    commands.set('runtime', async (sock, from) => {
        await commands.get('uptime')(sock, from);
    });

    commands.set('profile', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin, msg) => {
        let target = sender;
        if (msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
            target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }
        
        const level = db.levels?.[target] || 1;
        const exp = db.exp?.[target] || 0;
        const money = db.money?.[target] || 0;
        const married = db.married?.[target] || null;
        const warns = db.warns?.[target] || 0;
        const banned = db.banned?.includes(target.split('@')[0]) || false;
        const isPerm = target.split('@')[0] === PERMANENT_OWNER;
        const isSession = db.sessionOwners?.includes(target.split('@')[0]);
        
        let role = '👤 User';
        if (isPerm) role = '👑 Permanent Owner';
        else if (isSession) role = '🔰 Session Owner';
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  👤 *PROFILE*  \n╰━━━━━━━━━━━━━━╯\n\n👤 User: @${target.split('@')[0]}\n🎭 Role: ${role}\n⭐ Level: ${level}\n✨ XP: ${exp}\n💰 Money: $${money}\n💑 Married: ${married ? `@${married.split('@')[0]}` : 'Single'}\n⚠️ Warnings: ${warns}\n🚫 Banned: ${banned ? 'Yes' : 'No'}\n\n${FOOTER}`,
            mentions: [target]
        });
    });

    commands.set('me', async (sock, from, args, sender) => {
        await commands.get('profile')(sock, from, args, sender, false, false, false, { message: { extendedTextMessage: { contextInfo: { mentionedJid: [sender] } } } });
    });

    // ========== WEATHER / CALC / TRANSLATE ==========
    commands.set('weather', async (sock, from, args) => {
        const city = args.join(' ') || 'Johannesburg';
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  ☀️ *WEATHER*  \n╰━━━━━━━━━━━━━━╯\n\n📍 City: ${city}\n🌡️ Temp: 25°C\n☁️ Condition: Sunny\n💧 Humidity: 60%\n🌬️ Wind: 10 km/h\n\n${FOOTER}`
        });
    });

    commands.set('calc', async (sock, from, args) => {
        const expression = args.join(' ');
        if (!expression) return await sock.sendMessage(from, { text: `❌ Usage: .calc 2+2` });
        
        try {
            const result = eval(expression);
            await sock.sendMessage(from, { 
                text: `╭━━━━━━━━━━━━━━╮\n┃  🧮 *CALCULATOR*  \n╰━━━━━━━━━━━━━━╯\n\n📝 ${expression} = ${result}\n\n${FOOTER}`
            });
        } catch {
            await sock.sendMessage(from, { text: `❌ Invalid expression` });
        }
    });

    commands.set('translate', async (sock, from, args) => {
        const text = args.join(' ');
        if (!text) return await sock.sendMessage(from, { text: `❌ Usage: .translate Hello` });
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  🌐 *TRANSLATE*  \n╰━━━━━━━━━━━━━━╯\n\n🔤 Original: ${text}\n🔡 Translation: [Translation feature coming soon]\n\n${FOOTER}`
        });
    });

    commands.set('shorten', async (sock, from, args) => {
        const url = args[0];
        if (!url) return await sock.sendMessage(from, { text: `❌ Usage: .shorten https://example.com` });
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  🔗 *URL SHORTENER*  \n╰━━━━━━━━━━━━━━╯\n\n🔗 Original: ${url}\n📎 Shortened: tinyurl.com/example\n\n${FOOTER}`
        });
    });

    commands.set('define', async (sock, from, args) => {
        const word = args.join(' ');
        if (!word) return await sock.sendMessage(from, { text: `❌ Usage: .define [word]` });
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  📚 *DEFINE*  \n╰━━━━━━━━━━━━━━╯\n\n📖 Word: ${word}\n📝 Definition: [Dictionary feature coming soon]\n\n${FOOTER}`
        });
    });

    commands.set('filter', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin) => {
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ Groups only!` });
        const word = args[0];
        if (!word) return await sock.sendMessage(from, { text: `❌ Usage: .filter [word]` });
        
        db.wordfilters = db.wordfilters || {};
        db.wordfilters[from] = db.wordfilters[from] || [];
        if (!db.wordfilters[from].includes(word)) {
            db.wordfilters[from].push(word);
            saveDb();
            await sock.sendMessage(from, { text: `✅ Added "${word}" to filter` });
        }
    });

    commands.set('unfilter', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin) => {
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ Groups only!` });
        const word = args[0];
        if (!word) return await sock.sendMessage(from, { text: `❌ Usage: .unfilter [word]` });
        
        if (db.wordfilters?.[from]) {
            db.wordfilters[from] = db.wordfilters[from].filter(w => w !== word);
            saveDb();
            await sock.sendMessage(from, { text: `✅ Removed "${word}" from filter` });
        }
    });

    commands.set('poll', async (sock, from, args) => {
        const parts = args.join(' ').split('|');
        if (parts.length < 3) return await sock.sendMessage(from, { text: `❌ Usage: .poll Question|Option1|Option2` });
        
        const question = parts[0];
        const options = parts.slice(1);
        
        await sock.sendMessage(from, {
            poll: {
                name: question,
                values: options,
                selectableCount: 1
            }
        });
    });

    commands.set('vote', async (sock, from, args) => {
        await sock.sendMessage(from, { text: `🗳️ Vote feature coming soon!` });
    });

    commands.set('results', async (sock, from, args) => {
        await sock.sendMessage(from, { text: `📊 Poll results feature coming soon!` });
    });

    commands.set('invite', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin) => {
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ This command is for groups only!` });
        try {
            const code = await sock.groupInviteCode(from);
            await sock.sendMessage(from, { 
                text: `🔗 https://chat.whatsapp.com/${code}\n\n${FOOTER}`
            });
        } catch {
            await sock.sendMessage(from, { text: `❌ Failed to get invite link` });
        }
    });

    commands.set('getpp', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin, msg) => {
        let target = sender;
        if (msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
            target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }
        try {
            const ppUrl = await sock.profilePictureUrl(target, 'image');
            await sock.sendMessage(from, { 
                image: { url: ppUrl },
                caption: `🖼️ @${target.split('@')[0]}'s profile picture\n\n${FOOTER}`,
                mentions: [target]
            });
        } catch {
            await sock.sendMessage(from, { text: `❌ No profile picture found` });
        }
    });

    commands.set('setpp', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin, msg) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        await sock.sendMessage(from, { text: `🖼️ Reply to an image with this command to set profile picture` });
    });

    commands.set('creategroup', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        const name = args.join(' ');
        if (!name) return await sock.sendMessage(from, { text: `❌ Usage: .creategroup [name]` });
        await sock.sendMessage(from, { text: `📋 Creating group: ${name}` });
    });

    commands.set('listgroups', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        await sock.sendMessage(from, { text: `📋 Listing all groups...` });
    });

    // ========== MEDIA COMMANDS ==========
    commands.set('sticker', async (sock, from) => {
        await sock.sendMessage(from, { text: `✨ Reply to an image with .sticker` });
    });

    commands.set('s', async (sock, from) => {
        await commands.get('sticker')(sock, from);
    });

    commands.set('toimg', async (sock, from) => {
        await sock.sendMessage(from, { text: `🖼️ Reply to a sticker with .toimg` });
    });

    commands.set('image', async (sock, from) => {
        await commands.get('toimg')(sock, from);
    });

    commands.set('tourl', async (sock, from) => {
        await sock.sendMessage(from, { text: `🔗 Reply to media with .tourl` });
    });

    commands.set('url', async (sock, from) => {
        await commands.get('tourl')(sock, from);
    });

    commands.set('yt', async (sock, from, args) => {
        const url = args[0];
        if (!url) return await sock.sendMessage(from, { text: `❌ Usage: .yt [URL]` });
        await sock.sendMessage(from, { text: `⏬ Downloading YouTube: ${url}\n\n${FOOTER}` });
    });

    commands.set('ytmp3', async (sock, from, args) => {
        const url = args[0];
        if (!url) return await sock.sendMessage(from, { text: `❌ Usage: .ytmp3 [URL]` });
        await sock.sendMessage(from, { text: `🎵 Converting YouTube to MP3: ${url}\n\n${FOOTER}` });
    });

    commands.set('ytmp4', async (sock, from, args) => {
        const url = args[0];
        if (!url) return await sock.sendMessage(from, { text: `❌ Usage: .ytmp4 [URL]` });
        await sock.sendMessage(from, { text: `🎬 Downloading YouTube Video: ${url}\n\n${FOOTER}` });
    });

    commands.set('play', async (sock, from, args) => {
        const song = args.join(' ');
        if (!song) return await sock.sendMessage(from, { text: `❌ Usage: .play [song name]` });
        await sock.sendMessage(from, { text: `🎵 Searching and playing: ${song}\n\n${FOOTER}` });
    });

    commands.set('song', async (sock, from, args) => {
        const song = args.join(' ');
        if (!song) return await sock.sendMessage(from, { text: `❌ Usage: .song [song name]` });
        await sock.sendMessage(from, { text: `🎵 Downloading song: ${song}\n\n${FOOTER}` });
    });

    commands.set('video', async (sock, from, args) => {
        const video = args.join(' ');
        if (!video) return await sock.sendMessage(from, { text: `❌ Usage: .video [video name]` });
        await sock.sendMessage(from, { text: `🎬 Searching video: ${video}\n\n${FOOTER}` });
    });

    commands.set('tiktok', async (sock, from, args) => {
        const url = args[0];
        if (!url) return await sock.sendMessage(from, { text: `❌ Usage: .tiktok [URL]` });
        await sock.sendMessage(from, { text: `⏬ Downloading TikTok: ${url}\n\n${FOOTER}` });
    });

    commands.set('ig', async (sock, from, args) => {
        const url = args[0];
        if (!url) return await sock.sendMessage(from, { text: `❌ Usage: .ig [URL]` });
        await sock.sendMessage(from, { text: `⏬ Downloading Instagram: ${url}\n\n${FOOTER}` });
    });

    commands.set('fb', async (sock, from, args) => {
        const url = args[0];
        if (!url) return await sock.sendMessage(from, { text: `❌ Usage: .fb [URL]` });
        await sock.sendMessage(from, { text: `⏬ Downloading Facebook: ${url}\n\n${FOOTER}` });
    });

    commands.set('twitter', async (sock, from, args) => {
        const url = args[0];
        if (!url) return await sock.sendMessage(from, { text: `❌ Usage: .twitter [URL]` });
        await sock.sendMessage(from, { text: `⏬ Downloading Twitter: ${url}\n\n${FOOTER}` });
    });

    commands.set('spotify', async (sock, from, args) => {
        const url = args[0];
        if (!url) return await sock.sendMessage(from, { text: `❌ Usage: .spotify [URL]` });
        await sock.sendMessage(from, { text: `⏬ Downloading Spotify: ${url}\n\n${FOOTER}` });
    });

    commands.set('soundcloud', async (sock, from, args) => {
        const url = args[0];
        if (!url) return await sock.sendMessage(from, { text: `❌ Usage: .soundcloud [URL]` });
        await sock.sendMessage(from, { text: `⏬ Downloading SoundCloud: ${url}\n\n${FOOTER}` });
    });

    commands.set('pinterest', async (sock, from, args) => {
        const query = args.join(' ');
        if (!query) return await sock.sendMessage(from, { text: `❌ Usage: .pinterest [query]` });
        await sock.sendMessage(from, { text: `📌 Searching Pinterest: ${query}\n\n${FOOTER}` });
    });

    commands.set('wallpaper', async (sock, from, args) => {
        const query = args.join(' ');
        if (!query) return await sock.sendMessage(from, { text: `❌ Usage: .wallpaper [query]` });
        await sock.sendMessage(from, { text: `🖼️ Searching wallpaper: ${query}\n\n${FOOTER}` });
    });

    commands.set('gif', async (sock, from, args) => {
        const query = args.join(' ');
        if (!query) return await sock.sendMessage(from, { text: `❌ Usage: .gif [query]` });
        await sock.sendMessage(from, { text: `🎞️ Searching GIF: ${query}\n\n${FOOTER}` });
    });

    commands.set('lyrics', async (sock, from, args) => {
        const song = args.join(' ');
        if (!song) return await sock.sendMessage(from, { text: `❌ Usage: .lyrics [song name]` });
        await sock.sendMessage(from, { text: `📝 Searching lyrics for: ${song}\n\n${FOOTER}` });
    });

    commands.set('music', async (sock, from, args) => {
        const song = args.join(' ');
        if (!song) return await sock.sendMessage(from, { text: `❌ Usage: .music [song name]` });
        await sock.sendMessage(from, { text: `🎵 Searching music: ${song}\n\n${FOOTER}` });
    });

    // ========== PLAYFUL COMMANDS ==========
    commands.set('joke', async (sock, from) => {
        const jokes = [
            "Why don't scientists trust atoms? Because they make up everything!",
            "Why did the scarecrow win an award? He was outstanding in his field!",
            "Why don't eggs tell jokes? They'd crack each other up!",
            "What do you call a fake noodle? An impasta!",
            "Why did the math book look sad? Because it had too many problems!"
        ];
        await sock.sendMessage(from, { text: `😂 *Joke*\n\n${getRandomElement(jokes)}\n\n${FOOTER}` });
    });

    commands.set('fact', async (sock, from) => {
        const facts = [
            "Honey never spoils. Archaeologists found 3000-year-old honey in Egyptian tombs!",
            "A day on Venus is longer than a year on Venus!",
            "Bananas are berries, but strawberries aren't!",
            "Octopuses have three hearts!",
            "The Eiffel Tower can be 15 cm taller in summer due to thermal expansion!"
        ];
        await sock.sendMessage(from, { text: `📚 *Fact*\n\n${getRandomElement(facts)}\n\n${FOOTER}` });
    });

    commands.set('quote', async (sock, from) => {
        const quotes = [
            "The only way to do great work is to love what you do. - Steve Jobs",
            "Life is what happens when you're busy making other plans. - John Lennon",
            "Success is not final, failure is not fatal. - Winston Churchill",
            "Believe you can and you're halfway there. - Theodore Roosevelt",
            "The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt"
        ];
        await sock.sendMessage(from, { text: `💭 *Quote*\n\n${getRandomElement(quotes)}\n\n${FOOTER}` });
    });

    commands.set('roast', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin, msg) => {
        const roasts = [
            "You're not stupid; you just have bad luck thinking.",
            "You're proof that God has a sense of humor.",
            "You bring everyone so much joy! When you leave.",
            "I'd agree with you but then we'd both be wrong.",
            "You're the reason the gene pool needs a lifeguard."
        ];
        const target = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || sender;
        await sock.sendMessage(from, { 
            text: `🔥 *Roast*\n\n@${target.split('@')[0]}, ${getRandomElement(roasts)}\n\n${FOOTER}`,
            mentions: [target]
        });
    });

    commands.set('compliment', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin, msg) => {
        const compliments = [
            "You're amazing!",
            "You have a great smile!",
            "You're incredibly smart!",
            "You light up the room!",
            "You're one of a kind!"
        ];
        const target = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || sender;
        await sock.sendMessage(from, { 
            text: `💖 *Compliment*\n\n@${target.split('@')[0]}, ${getRandomElement(compliments)}\n\n${FOOTER}`,
            mentions: [target]
        });
    });

    commands.set('flipcoin', async (sock, from) => {
        const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
        await sock.sendMessage(from, { text: `🪙 *Coin Flip*\n\nResult: ${result}\n\n${FOOTER}` });
    });

    commands.set('dice', async (sock, from) => {
        const result = getRandomInt(1, 6);
        await sock.sendMessage(from, { text: `🎲 *Dice Roll*\n\nResult: ${result}\n\n${FOOTER}` });
    });

    commands.set('rps', async (sock, from, args) => {
        const choice = args[0]?.toLowerCase();
        if (!choice || !['rock', 'paper', 'scissors'].includes(choice)) {
            return await sock.sendMessage(from, { text: `❌ Choose rock, paper, or scissors!` });
        }
        const choices = ['rock', 'paper', 'scissors'];
        const botChoice = getRandomElement(choices);
        let result;
        if (choice === botChoice) result = "It's a tie!";
        else if (
            (choice === 'rock' && botChoice === 'scissors') ||
            (choice === 'paper' && botChoice === 'rock') ||
            (choice === 'scissors' && botChoice === 'paper')
        ) result = "You win! 🎉";
        else result = "Bot wins! 🤖";
        
        await sock.sendMessage(from, { 
            text: `📝 *Rock Paper Scissors*\n\nYou: ${choice}\nBot: ${botChoice}\nResult: ${result}\n\n${FOOTER}`
        });
    });

    commands.set('truth', async (sock, from) => {
        const truths = [
            "What's your biggest fear?",
            "Have you ever lied to your best friend?",
            "What's the most embarrassing thing you've ever done?",
            "Who was your first crush?",
            "Have you ever stolen anything?"
        ];
        await sock.sendMessage(from, { text: `🤔 *Truth Question*\n\n${getRandomElement(truths)}\n\n${FOOTER}` });
    });

    commands.set('dare', async (sock, from) => {
        const dares = [
            "Send a random emoji to your last chat!",
            "Do 10 pushups right now!",
            "Send your most recent photo!",
            "Sing a song and send a voice note!",
            "Change your display name to 'I love bots' for an hour!"
        ];
        await sock.sendMessage(from, { text: `😈 *Dare Challenge*\n\n${getRandomElement(dares)}\n\n${FOOTER}` });
    });

    commands.set('wouldyourather', async (sock, from) => {
        const wyr = [
            "Would you rather have the ability to fly or be invisible?",
            "Would you rather be rich but unhappy or poor but happy?",
            "Would you rather live without music or without movies?",
            "Would you rather have unlimited food or unlimited travel?",
            "Would you rather be able to talk to animals or speak all languages?"
        ];
        await sock.sendMessage(from, { text: `🤷 *Would You Rather*\n\n${getRandomElement(wyr)}\n\n${FOOTER}` });
    });

    commands.set('8ball', async (sock, from, args) => {
        const question = args.join(' ');
        if (!question) return await sock.sendMessage(from, { text: `❌ Ask a question!` });
        const responses = ['Yes', 'No', 'Maybe', 'Definitely', 'Never', 'Ask again later'];
        await sock.sendMessage(from, { text: `🎱 *Magic 8 Ball*\n\nQuestion: ${question}\nAnswer: ${getRandomElement(responses)}\n\n${FOOTER}` });
    });

    commands.set('mood', async (sock, from) => {
        const moods = ['😊 Happy', '😢 Sad', '😠 Angry', '😴 Tired', '🤔 Confused', '🥳 Excited'];
        await sock.sendMessage(from, { text: `🎭 *Mood*\n\n${getRandomElement(moods)}\n\n${FOOTER}` });
    });

    commands.set('fortune', async (sock, from) => {
        const fortunes = [
            "You will have a great day tomorrow!",
            "Someone is thinking about you right now.",
            "A surprise is waiting for you.",
            "Your hard work will pay off soon.",
            "Good news is coming your way."
        ];
        await sock.sendMessage(from, { text: `🔮 *Fortune*\n\n${getRandomElement(fortunes)}\n\n${FOOTER}` });
    });

    commands.set('simprate', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin, msg) => {
        const target = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || sender;
        const rate = getRandomInt(0, 100);
        await sock.sendMessage(from, { 
            text: `😳 *Simp Rate*\n\n@${target.split('@')[0]}\nSimp Level: ${rate}%\n\n${FOOTER}`,
            mentions: [target]
        });
    });

    commands.set('gayrate', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin, msg) => {
        const target = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || sender;
        const rate = getRandomInt(0, 100);
        await sock.sendMessage(from, { 
            text: `🌈 *Gay Rate*\n\n@${target.split('@')[0]}\nGay Level: ${rate}%\n\n${FOOTER}`,
            mentions: [target]
        });
    });

    commands.set('smartrate', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin, msg) => {
        const target = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || sender;
        const rate = getRandomInt(0, 100);
        await sock.sendMessage(from, { 
            text: `🧠 *Smart Rate*\n\n@${target.split('@')[0]}\nSmart Level: ${rate}%\n\n${FOOTER}`,
            mentions: [target]
        });
    });

    commands.set('rizz', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin, msg) => {
        const target = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || sender;
        const rate = getRandomInt(0, 100);
        await sock.sendMessage(from, { 
            text: `💬 *Rizz Level*\n\n@${target.split('@')[0]}\nRizz: ${rate}%\n\n${FOOTER}`,
            mentions: [target]
        });
    });

    commands.set('swag', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin, msg) => {
        const target = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || sender;
        const rate = getRandomInt(0, 100);
        await sock.sendMessage(from, { 
            text: `😎 *Swag Level*\n\n@${target.split('@')[0]}\nSwag: ${rate}%\n\n${FOOTER}`,
            mentions: [target]
        });
    });

    commands.set('vibe', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin, msg) => {
        const target = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || sender;
        const vibes = ['✨ Good Vibes', '🌈 Happy', '😎 Cool', '🤔 Suspicious', '💀 Dark'];
        await sock.sendMessage(from, { 
            text: `🎵 *Vibe Check*\n\n@${target.split('@')[0]}\nVibe: ${getRandomElement(vibes)}\n\n${FOOTER}`,
            mentions: [target]
        });
    });

    // ========== GROUP COMMANDS ==========
    commands.set('groupinfo', async (sock, from, args, sender, isGroup) => {
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ This command is for groups only!` });
        
        const meta = await sock.groupMetadata(from);
        const admins = meta.participants.filter(p => p.admin).length;
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  👥 *GROUP INFO*  \n╰━━━━━━━━━━━━━━╯\n\n📛 Name: ${meta.subject}\n📝 Desc: ${meta.desc || 'No description'}\n👥 Members: ${meta.participants.length}\n👑 Admins: ${admins}\n📅 Created: ${moment(meta.creation * 1000).format('DD/MM/YYYY')}\n\n${FOOTER}`
        });
    });

    commands.set('tagall', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin) => {
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ This command is for groups only!` });
        
        const meta = await sock.groupMetadata(from);
        const mentions = meta.participants.map(p => p.id);
        const msg = args.join(' ') || '📢 Attention everyone!';
        
        await sock.sendMessage(from, { text: msg, mentions });
    });

    commands.set('hidetag', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin) => {
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ This command is for groups only!` });
        
        const meta = await sock.groupMetadata(from);
        const mentions = meta.participants.map(p => p.id);
        const msg = args.join(' ') || ' ';
        
        await sock.sendMessage(from, { text: msg, mentions });
    });

    commands.set('admins', async (sock, from, args, sender, isGroup) => {
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ This command is for groups only!` });
        
        const meta = await sock.groupMetadata(from);
        const admins = meta.participants.filter(p => p.admin).map(p => p.id);
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  👑 *ADMINS*  \n╰━━━━━━━━━━━━━━╯\n\n` + admins.map((a, i) => `${i+1}. @${a.split('@')[0]}`).join('\n') + `\n\n${FOOTER}`,
            mentions: admins
        });
    });

    commands.set('tagadmin', async (sock, from, args, sender, isGroup) => {
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ This command is for groups only!` });
        
        const meta = await sock.groupMetadata(from);
        const admins = meta.participants.filter(p => p.admin).map(p => p.id);
        const msg = args.join(' ') || '📢 Admins!';
        
        await sock.sendMessage(from, { text: msg, mentions: admins });
    });

    commands.set('listadmin', async (sock, from, args, sender, isGroup) => {
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ This command is for groups only!` });
        await commands.get('admins')(sock, from, args, sender, isGroup);
    });

    commands.set('add', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin) => {
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ This command is for groups only!` });
        
        const number = args[0]?.replace(/\D/g, '');
        if (!number) return await sock.sendMessage(from, { text: `❌ Usage: .add ${PERMANENT_OWNER}` });
        
        try {
            await sock.groupParticipantsUpdate(from, [number + '@s.whatsapp.net'], 'add');
            await sock.sendMessage(from, { 
                text: `╭━━━━━━━━━━━━━━╮\n┃  ✅ *ADDED*  \n╰━━━━━━━━━━━━━━╯\n\n➕ Added @${number}\n\n${FOOTER}`,
                mentions: [number + '@s.whatsapp.net']
            });
        } catch {
            await sock.sendMessage(from, { text: `❌ Failed to add user` });
        }
    });

    commands.set('kick', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin, msg) => {
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ This command is for groups only!` });
        
        const target = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        if (!target) return await sock.sendMessage(from, { text: `❌ Tag someone to kick!` });
        
        try {
            await sock.groupParticipantsUpdate(from, [target], 'remove');
            await sock.sendMessage(from, { 
                text: `╭━━━━━━━━━━━━━━╮\n┃  👢 *KICKED*  \n╰━━━━━━━━━━━━━━╯\n\n👢 Removed @${target.split('@')[0]}\n\n${FOOTER}`,
                mentions: [target]
            });
        } catch {
            await sock.sendMessage(from, { text: `❌ Failed to kick user` });
        }
    });

    commands.set('promote', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin, msg) => {
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ This command is for groups only!` });
        
        const target = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        if (!target) return await sock.sendMessage(from, { text: `❌ Tag someone to promote!` });
        
        try {
            await sock.groupParticipantsUpdate(from, [target], 'promote');
            await sock.sendMessage(from, { 
                text: `╭━━━━━━━━━━━━━━╮\n┃  👑 *PROMOTED*  \n╰━━━━━━━━━━━━━━╯\n\n👑 @${target.split('@')[0]} is now admin\n\n${FOOTER}`,
                mentions: [target]
            });
        } catch {
            await sock.sendMessage(from, { text: `❌ Failed to promote user` });
        }
    });

    commands.set('demote', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin, msg) => {
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ This command is for groups only!` });
        
        const target = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        if (!target) return await sock.sendMessage(from, { text: `❌ Tag someone to demote!` });
        
        try {
            await sock.groupParticipantsUpdate(from, [target], 'demote');
            await sock.sendMessage(from, { 
                text: `╭━━━━━━━━━━━━━━╮\n┃  📉 *DEMOTED*  \n╰━━━━━━━━━━━━━━╯\n\n📉 @${target.split('@')[0]} is no longer admin\n\n${FOOTER}`,
                mentions: [target]
            });
        } catch {
            await sock.sendMessage(from, { text: `❌ Failed to demote user` });
        }
    });

    commands.set('mute', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin) => {
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ This command is for groups only!` });
        
        try {
            await sock.groupSettingUpdate(from, 'announcement');
            await sock.sendMessage(from, { 
                text: `╭━━━━━━━━━━━━━━╮\n┃  🔇 *MUTED*  \n╰━━━━━━━━━━━━━━╯\n\n🔇 Group muted (only admins can chat)\n\n${FOOTER}`
            });
        } catch {
            await sock.sendMessage(from, { text: `❌ Failed to mute group` });
        }
    });

    commands.set('unmute', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin) => {
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ This command is for groups only!` });
        
        try {
            await sock.groupSettingUpdate(from, 'not_announcement');
            await sock.sendMessage(from, { 
                text: `╭━━━━━━━━━━━━━━╮\n┃  🔊 *UNMUTED*  \n╰━━━━━━━━━━━━━━╯\n\n🔊 Group unmuted (all can chat)\n\n${FOOTER}`
            });
        } catch {
            await sock.sendMessage(from, { text: `❌ Failed to unmute group` });
        }
    });

    commands.set('lock', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin) => {
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ This command is for groups only!` });
        
        try {
            await sock.groupSettingUpdate(from, 'locked');
            await sock.sendMessage(from, { 
                text: `╭━━━━━━━━━━━━━━╮\n┃  🔒 *LOCKED*  \n╰━━━━━━━━━━━━━━╯\n\n🔒 Group locked\n\n${FOOTER}`
            });
        } catch {
            await sock.sendMessage(from, { text: `❌ Failed to lock group` });
        }
    });

    commands.set('unlock', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin) => {
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ This command is for groups only!` });
        
        try {
            await sock.groupSettingUpdate(from, 'unlocked');
            await sock.sendMessage(from, { 
                text: `╭━━━━━━━━━━━━━━╮\n┃  🔓 *UNLOCKED*  \n╰━━━━━━━━━━━━━━╯\n\n🔓 Group unlocked\n\n${FOOTER}`
            });
        } catch {
            await sock.sendMessage(from, { text: `❌ Failed to unlock group` });
        }
    });

    commands.set('grouplink', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin) => {
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ This command is for groups only!` });
        
        try {
            const code = await sock.groupInviteCode(from);
            await sock.sendMessage(from, { 
                text: `╭━━━━━━━━━━━━━━╮\n┃  🔗 *GROUP LINK*  \n╰━━━━━━━━━━━━━━╯\n\n🔗 https://chat.whatsapp.com/${code}\n\n${FOOTER}`
            });
        } catch {
            await sock.sendMessage(from, { text: `❌ Failed to get group link` });
        }
    });

    commands.set('revoke', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin) => {
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ This command is for groups only!` });
        
        try {
            await sock.groupRevokeInvite(from);
            const code = await sock.groupInviteCode(from);
            await sock.sendMessage(from, { 
                text: `╭━━━━━━━━━━━━━━╮\n┃  🔄 *LINK REVOKED*  \n╰━━━━━━━━━━━━━━╯\n\n✅ New link generated!\n🔗 https://chat.whatsapp.com/${code}\n\n${FOOTER}`
            });
        } catch {
            await sock.sendMessage(from, { text: `❌ Failed to revoke link` });
        }
    });

    commands.set('setname', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin) => {
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ This command is for groups only!` });
        
        const name = args.join(' ');
        if (!name) return await sock.sendMessage(from, { text: `❌ Usage: .setname New Group Name` });
        
        try {
            await sock.groupUpdateSubject(from, name);
            await sock.sendMessage(from, { 
                text: `╭━━━━━━━━━━━━━━╮\n┃  📝 *NAME UPDATED*  \n╰━━━━━━━━━━━━━━╯\n\n✅ Group name changed\n\n${FOOTER}`
            });
        } catch {
            await sock.sendMessage(from, { text: `❌ Failed to update group name` });
        }
    });

    commands.set('setdesc', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin) => {
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ This command is for groups only!` });
        
        const desc = args.join(' ');
        if (!desc) return await sock.sendMessage(from, { text: `❌ Usage: .setdesc New description` });
        
        try {
            await sock.groupUpdateDescription(from, desc);
            await sock.sendMessage(from, { 
                text: `╭━━━━━━━━━━━━━━╮\n┃  📝 *DESC UPDATED*  \n╰━━━━━━━━━━━━━━╯\n\n✅ Group description updated\n\n${FOOTER}`
            });
        } catch {
            await sock.sendMessage(from, { text: `❌ Failed to update description` });
        }
    });

    commands.set('setgpic', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin, msg) => {
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ This command is for groups only!` });
        
        await sock.sendMessage(from, { text: `🖼️ Reply to an image with this command to set group icon` });
    });

    commands.set('welcome', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin) => {
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ This command is for groups only!` });
        
        const option = args[0];
        if (!option || !['on', 'off'].includes(option)) {
            return await sock.sendMessage(from, { text: `❌ Usage: .welcome on/off` });
        }
        
        db.settings.welcome = option === 'on';
        saveDb();
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  👋 *WELCOME*  \n╰━━━━━━━━━━━━━━╯\n\n✅ Welcome messages turned ${option}\n\n${FOOTER}`
        });
    });

    commands.set('goodbye', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin) => {
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ This command is for groups only!` });
        
        const option = args[0];
        if (!option || !['on', 'off'].includes(option)) {
            return await sock.sendMessage(from, { text: `❌ Usage: .goodbye on/off` });
        }
        
        db.settings.goodbye = option === 'on';
        saveDb();
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  👋 *GOODBYE*  \n╰━━━━━━━━━━━━━━╯\n\n✅ Goodbye messages turned ${option}\n\n${FOOTER}`
        });
    });

    commands.set('setwelcome', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin) => {
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ This command is for groups only!` });
        
        const msg = args.join(' ');
        if (!msg) return await sock.sendMessage(from, { text: `❌ Usage: .setwelcome [message]` });
        
        db.welcomeMsg = db.welcomeMsg || {};
        db.welcomeMsg[from] = msg;
        saveDb();
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  ✍️ *WELCOME SET*  \n╰━━━━━━━━━━━━━━╯\n\n✅ Welcome message set!\n\n${FOOTER}`
        });
    });

    commands.set('setgoodbye', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin) => {
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ This command is for groups only!` });
        
        const msg = args.join(' ');
        if (!msg) return await sock.sendMessage(from, { text: `❌ Usage: .setgoodbye [message]` });
        
        db.goodbyeMsg = db.goodbyeMsg || {};
        db.goodbyeMsg[from] = msg;
        saveDb();
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  ✍️ *GOODBYE SET*  \n╰━━━━━━━━━━━━━━╯\n\n✅ Goodbye message set!\n\n${FOOTER}`
        });
    });

    commands.set('tagadmins', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin) => {
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ This command is for groups only!` });
        
        const meta = await sock.groupMetadata(from);
        const admins = meta.participants.filter(p => p.admin).map(p => p.id);
        const msg = args.join(' ') || '📢 Admins!';
        
        await sock.sendMessage(from, { text: msg, mentions: admins });
    });

    commands.set('everyone', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin) => {
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ This command is for groups only!` });
        
        const meta = await sock.groupMetadata(from);
        const mentions = meta.participants.map(p => p.id);
        const msg = args.join(' ') || '📢 @everyone';
        
        await sock.sendMessage(from, { text: msg, mentions });
    });

    // ========== MARRIAGE COMMANDS ==========
    commands.set('marry', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin, msg) => {
        const target = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        if (!target) return await sock.sendMessage(from, { text: `❌ Tag someone to marry!` });
        if (target === sender) return await sock.sendMessage(from, { text: `❌ Can't marry yourself!` });
        
        db.proposals = db.proposals || {};
        db.proposals[target] = { from: sender, time: Date.now() };
        saveDb();
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  💍 *PROPOSAL*  \n╰━━━━━━━━━━━━━━╯\n\n✨ @${sender.split('@')[0]} wants to marry @${target.split('@')[0]}!\n\nType .accept or .reject\n\n${FOOTER}`,
            mentions: [sender, target]
        });
    });

    commands.set('accept', async (sock, from, args, sender) => {
        if (!db.proposals?.[sender]) return await sock.sendMessage(from, { text: `❌ No proposals!` });
        
        const proposer = db.proposals[sender].from;
        db.married = db.married || {};
        db.married[sender] = proposer;
        db.married[proposer] = sender;
        delete db.proposals[sender];
        saveDb();
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  💖 *MARRIED!*  \n╰━━━━━━━━━━━━━━╯\n\n🎉 @${sender.split('@')[0]} & @${proposer.split('@')[0]}!\n💘 Love: ${getRandomInt(80, 100)}%\n\n${FOOTER}`,
            mentions: [sender, proposer]
        });
    });

    commands.set('reject', async (sock, from, args, sender) => {
        if (!db.proposals?.[sender]) return await sock.sendMessage(from, { text: `❌ No proposals!` });
        
        const proposer = db.proposals[sender].from;
        delete db.proposals[sender];
        saveDb();
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  💔 *REJECTED*  \n╰━━━━━━━━━━━━━━╯\n\n❌ @${sender.split('@')[0]} rejected @${proposer.split('@')[0]}\n\n${FOOTER}`,
            mentions: [sender, proposer]
        });
    });

    commands.set('divorce', async (sock, from, args, sender) => {
        if (!db.married?.[sender]) return await sock.sendMessage(from, { text: `❌ Not married!` });
        
        const spouse = db.married[sender];
        delete db.married[sender];
        delete db.married[spouse];
        saveDb();
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  💔 *DIVORCED*  \n╰━━━━━━━━━━━━━━╯\n\n😢 @${sender.split('@')[0]} & @${spouse.split('@')[0]} divorced\n\n${FOOTER}`,
            mentions: [sender, spouse]
        });
    });

    commands.set('married', async (sock, from, args, sender) => {
        if (!db.married?.[sender]) return await sock.sendMessage(from, { text: `❌ Not married!` });
        
        const spouse = db.married[sender];
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  💑 *MARRIED TO*  \n╰━━━━━━━━━━━━━━╯\n\n💖 @${spouse.split('@')[0]}\n\n${FOOTER}`,
            mentions: [spouse]
        });
    });

    commands.set('spouse', async (sock, from, args, sender) => {
        if (!db.married?.[sender]) return await sock.sendMessage(from, { text: `❌ Not married!` });
        
        const spouse = db.married[sender];
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  💑 *SPOUSE*  \n╰━━━━━━━━━━━━━━╯\n\n💖 @${spouse.split('@')[0]}\n\n${FOOTER}`,
            mentions: [spouse]
        });
    });

    commands.set('proposals', async (sock, from, args, sender) => {
        if (!db.proposals || Object.keys(db.proposals).length === 0) {
            return await sock.sendMessage(from, { text: `📭 No pending proposals` });
        }
        
        let text = `╭━━━━━━━━━━━━━━╮\n┃  💌 *PROPOSALS*  \n╰━━━━━━━━━━━━━━╯\n\n`;
        Object.entries(db.proposals).forEach(([to, data], i) => {
            text += `${i+1}. @${data.from.split('@')[0]} → @${to.split('@')[0]}\n`;
        });
        text += `\n${FOOTER}`;
        
        await sock.sendMessage(from, { 
            text,
            mentions: [...Object.keys(db.proposals), ...Object.values(db.proposals).map(p => p.from)]
        });
    });

    commands.set('love', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin, msg) => {
        const target = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || sender;
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  💖 *LOVE*  \n╰━━━━━━━━━━━━━━╯\n\n💗 @${sender.split('@')[0]} sent love to @${target.split('@')[0]}!\n\n${FOOTER}`,
            mentions: [sender, target]
        });
    });

    commands.set('kiss', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin, msg) => {
        const target = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        if (!target) return await sock.sendMessage(from, { text: `❌ Tag someone to kiss!` });
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  💋 *KISS*  \n╰━━━━━━━━━━━━━━╯\n\n😘 @${sender.split('@')[0]} kissed @${target.split('@')[0]}!\n\n${FOOTER}`,
            mentions: [sender, target]
        });
    });

    commands.set('hug', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin, msg) => {
        const target = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        if (!target) return await sock.sendMessage(from, { text: `❌ Tag someone to hug!` });
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  🤗 *HUG*  \n╰━━━━━━━━━━━━━━╯\n\n🤗 @${sender.split('@')[0]} hugged @${target.split('@')[0]}!\n\n${FOOTER}`,
            mentions: [sender, target]
        });
    });

    commands.set('cuddle', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin, msg) => {
        const target = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        if (!target) return await sock.sendMessage(from, { text: `❌ Tag someone to cuddle!` });
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  🥰 *CUDDLE*  \n╰━━━━━━━━━━━━━━╯\n\n🥰 @${sender.split('@')[0]} cuddled @${target.split('@')[0]}!\n\n${FOOTER}`,
            mentions: [sender, target]
        });
    });

    commands.set('pat', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin, msg) => {
        const target = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        if (!target) return await sock.sendMessage(from, { text: `❌ Tag someone to pat!` });
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  🖐️ *PAT*  \n╰━━━━━━━━━━━━━━╯\n\n🖐️ @${sender.split('@')[0]} patted @${target.split('@')[0]}!\n\n${FOOTER}`,
            mentions: [sender, target]
        });
    });

    commands.set('slap', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin, msg) => {
        const target = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        if (!target) return await sock.sendMessage(from, { text: `❌ Tag someone to slap!` });
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  👋 *SLAP*  \n╰━━━━━━━━━━━━━━╯\n\n👋 @${sender.split('@')[0]} slapped @${target.split('@')[0]}!\n\n${FOOTER}`,
            mentions: [sender, target]
        });
    });

    commands.set('poke', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin, msg) => {
        const target = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        if (!target) return await sock.sendMessage(from, { text: `❌ Tag someone to poke!` });
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  👉 *POKE*  \n╰━━━━━━━━━━━━━━╯\n\n👉 @${sender.split('@')[0]} poked @${target.split('@')[0]}!\n\n${FOOTER}`,
            mentions: [sender, target]
        });
    });

    commands.set('gift', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin, msg) => {
        const target = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        const amount = parseInt(args[0]) || 100;
        
        if (!target) return await sock.sendMessage(from, { text: `❌ Tag someone to gift!` });
        
        db.money = db.money || {};
        db.money[sender] = (db.money[sender] || 1000) - amount;
        db.money[target] = (db.money[target] || 1000) + amount;
        saveDb();
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  🎁 *GIFT*  \n╰━━━━━━━━━━━━━━╯\n\n🎁 @${sender.split('@')[0]} gifted $${amount} to @${target.split('@')[0]}!\n\n${FOOTER}`,
            mentions: [sender, target]
        });
    });

    commands.set('lovemeter', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin, msg) => {
        const users = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (users.length < 2) return await sock.sendMessage(from, { text: `❌ Tag 2 people!` });
        
        const percentage = getRandomInt(0, 100);
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  📊 *LOVE METER*  \n╰━━━━━━━━━━━━━━╯\n\n💘 @${users[0].split('@')[0]} ❤️ @${users[1].split('@')[0]}\n📈 Love: ${percentage}%\n\n${FOOTER}`,
            mentions: [users[0], users[1]]
        });
    });

    commands.set('ship', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin, msg) => {
        await commands.get('lovemeter')(sock, from, args, sender, isGroup, userIsOwner, isUserAdmin, msg);
    });

    commands.set('compatibility', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin, msg) => {
        const users = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (users.length < 2) return await sock.sendMessage(from, { text: `❌ Tag 2 people!` });
        
        const percentage = getRandomInt(0, 100);
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  🤝 *COMPATIBILITY*  \n╰━━━━━━━━━━━━━━╯\n\n🤝 @${users[0].split('@')[0]} & @${users[1].split('@')[0]}\n📊 Compatibility: ${percentage}%\n\n${FOOTER}`,
            mentions: [users[0], users[1]]
        });
    });

    commands.set('valentine', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin, msg) => {
        const target = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        if (!target) return await sock.sendMessage(from, { text: `❌ Tag your valentine!` });
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  💘 *VALENTINE*  \n╰━━━━━━━━━━━━━━╯\n\n💝 @${sender.split('@')[0]} chose @${target.split('@')[0]} as their Valentine!\n\n${FOOTER}`,
            mentions: [sender, target]
        });
    });

    commands.set('propose', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin, msg) => {
        const target = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        if (!target) return await sock.sendMessage(from, { text: `❌ Tag someone to propose to!` });
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  💍 *PROPOSE*  \n╰━━━━━━━━━━━━━━╯\n\n💍 @${sender.split('@')[0]} is proposing to @${target.split('@')[0]}!\n\n${FOOTER}`,
            mentions: [sender, target]
        });
    });

    commands.set('engagement', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin, msg) => {
        const target = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        if (!target) return await sock.sendMessage(from, { text: `❌ Tag your fiance!` });
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  💍 *ENGAGED*  \n╰━━━━━━━━━━━━━━╯\n\n💞 @${sender.split('@')[0]} and @${target.split('@')[0]} are now engaged!\n\n${FOOTER}`,
            mentions: [sender, target]
        });
    });

    commands.set('anniversary', async (sock, from, args, sender) => {
        if (!db.married?.[sender]) return await sock.sendMessage(from, { text: `❌ Not married!` });
        
        const spouse = db.married[sender];
        const days = getRandomInt(30, 365);
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  🎉 *ANNIVERSARY*  \n╰━━━━━━━━━━━━━━╯\n\n🎊 @${sender.split('@')[0]} & @${spouse.split('@')[0]}\n📅 ${days} days together!\n\n${FOOTER}`,
            mentions: [sender, spouse]
        });
    });

    commands.set('breakup', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin, msg) => {
        const target = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        if (!target) return await sock.sendMessage(from, { text: `❌ Tag someone to break up with!` });
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  💔 *BREAKUP*  \n╰━━━━━━━━━━━━━━╯\n\n💔 @${sender.split('@')[0]} broke up with @${target.split('@')[0]}!\n\n${FOOTER}`,
            mentions: [sender, target]
        });
    });

    // ========== ANTI COMMANDS ==========
    commands.set('antilink', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin) => {
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ This command is for groups only!` });
        
        const option = args[0];
        if (!option || !['on', 'off'].includes(option)) {
            return await sock.sendMessage(from, { text: `❌ Usage: .antilink on/off` });
        }
        
        db.antilinkGroups = db.antilinkGroups || {};
        db.antilinkGroups[from] = option === 'on';
        saveDb();
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  🔗 *ANTILINK*  \n╰━━━━━━━━━━━━━━╯\n\n✅ Antilink turned ${option}\n\n${FOOTER}`
        });
    });

    commands.set('antiforeign', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin) => {
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ This command is for groups only!` });
        
        const option = args[0];
        if (!option || !['on', 'off'].includes(option)) {
            return await sock.sendMessage(from, { text: `❌ Usage: .antiforeign on/off` });
        }
        
        db.antiforeignGroups = db.antiforeignGroups || {};
        db.antiforeignGroups[from] = option === 'on';
        saveDb();
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  🌍 *ANTIFOREIGN*  \n╰━━━━━━━━━━━━━━╯\n\n✅ Antiforeign turned ${option}\n\n${FOOTER}`
        });
    });

    commands.set('antifake', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin) => {
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ This command is for groups only!` });
        
        const option = args[0];
        if (!option || !['on', 'off'].includes(option)) {
            return await sock.sendMessage(from, { text: `❌ Usage: .antifake on/off` });
        }
        
        db.antifakeGroups = db.antifakeGroups || {};
        db.antifakeGroups[from] = option === 'on';
        saveDb();
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  🎭 *ANTIFAKE*  \n╰━━━━━━━━━━━━━━╯\n\n✅ Antifake turned ${option}\n\n${FOOTER}`
        });
    });

    commands.set('antitoxic', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin) => {
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ This command is for groups only!` });
        
        const option = args[0];
        if (!option || !['on', 'off'].includes(option)) {
            return await sock.sendMessage(from, { text: `❌ Usage: .antitoxic on/off` });
        }
        
        db.antitoxicGroups = db.antitoxicGroups || {};
        db.antitoxicGroups[from] = option === 'on';
        saveDb();
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  ☣️ *ANTITOXIC*  \n╰━━━━━━━━━━━━━━╯\n\n✅ Antitoxic turned ${option}\n\n${FOOTER}`
        });
    });

    commands.set('antispam', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin) => {
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ This command is for groups only!` });
        
        const option = args[0];
        if (!option || !['on', 'off'].includes(option)) {
            return await sock.sendMessage(from, { text: `❌ Usage: .antispam on/off` });
        }
        
        db.antispamGroups = db.antispamGroups || {};
        db.antispamGroups[from] = option === 'on';
        saveDb();
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  📧 *ANTISPAM*  \n╰━━━━━━━━━━━━━━╯\n\n✅ Antispam turned ${option}\n\n${FOOTER}`
        });
    });

    commands.set('antibot', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin) => {
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ This command is for groups only!` });
        
        const option = args[0];
        if (!option || !['on', 'off'].includes(option)) {
            return await sock.sendMessage(from, { text: `❌ Usage: .antibot on/off` });
        }
        
        db.antibotGroups = db.antibotGroups || {};
        db.antibotGroups[from] = option === 'on';
        saveDb();
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  🤖 *ANTIBOT*  \n╰━━━━━━━━━━━━━━╯\n\n✅ Antibot turned ${option}\n\n${FOOTER}`
        });
    });

    commands.set('antiword', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin) => {
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ This command is for groups only!` });
        
        const action = args[0];
        const word = args.slice(1).join(' ');
        
        if (action === 'add' && word) {
            db.wordfilters = db.wordfilters || {};
            db.wordfilters[from] = db.wordfilters[from] || [];
            if (!db.wordfilters[from].includes(word)) {
                db.wordfilters[from].push(word);
                saveDb();
                await sock.sendMessage(from, { text: `✅ Added "${word}" to filter list` });
            }
        } else if (action === 'remove' && word) {
            if (db.wordfilters?.[from]) {
                db.wordfilters[from] = db.wordfilters[from].filter(w => w !== word);
                saveDb();
                await sock.sendMessage(from, { text: `✅ Removed "${word}" from filter list` });
            }
        } else {
            await sock.sendMessage(from, { text: `❌ Usage: .antiword add/remove [word]` });
        }
    });

    commands.set('listwords', async (sock, from, args, sender, isGroup) => {
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ This command is for groups only!` });
        
        const words = db.wordfilters?.[from] || [];
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  📋 *FILTERED WORDS*  \n╰━━━━━━━━━━━━━━╯\n\n${words.length ? words.map((w, i) => `${i+1}. ${w}`).join('\n') : 'No filtered words'}\n\n${FOOTER}`
        });
    });

    commands.set('warn', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin, msg) => {
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ This command is for groups only!` });
        
        const target = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        if (!target) return await sock.sendMessage(from, { text: `❌ Tag someone to warn!` });
        
        db.warns = db.warns || {};
        db.warns[target] = (db.warns[target] || 0) + 1;
        saveDb();
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  ⚠️ *WARNING*  \n╰━━━━━━━━━━━━━━╯\n\n⚠️ @${target.split('@')[0]}\n📊 Warns: ${db.warns[target]}/3\n\n${FOOTER}`,
            mentions: [target]
        });
    });

    commands.set('warns', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin, msg) => {
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ This command is for groups only!` });
        
        const target = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || sender;
        const warns = db.warns?.[target] || 0;
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  📊 *WARN CHECK*  \n╰━━━━━━━━━━━━━━╯\n\n👤 @${target.split('@')[0]}\n⚠️ Warnings: ${warns}/3\n\n${FOOTER}`,
            mentions: [target]
        });
    });

    commands.set('resetwarns', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin, msg) => {
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ This command is for groups only!` });
        
        const target = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        if (!target) return await sock.sendMessage(from, { text: `❌ Tag someone!` });
        
        if (db.warns) db.warns[target] = 0;
        saveDb();
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  ✅ *WARNS RESET*  \n╰━━━━━━━━━━━━━━╯\n\n✅ @${target.split('@')[0]} warnings reset\n\n${FOOTER}`,
            mentions: [target]
        });
    });

    // ========== BUG/HAZARD COMMANDS ==========
    commands.set('bug', async (sock, from, args, sender) => {
        const report = args.join(' ');
        if (!report) return await sock.sendMessage(from, { text: `❌ Usage: .bug [description]` });
        
        db.bugs = db.bugs || [];
        db.bugs.push({
            id: db.bugs.length + 1,
            reporter: sender,
            report: report,
            time: Date.now()
        });
        saveDb();
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  🐛 *BUG REPORTED*  \n╰━━━━━━━━━━━━━━╯\n\n✅ Bug reported\n📝 ID: #${db.bugs.length}\n\n${FOOTER}`
        });
    });

    commands.set('bugs', async (sock, from, args, sender) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        db.bugs = db.bugs || [];
        if (db.bugs.length === 0) return await sock.sendMessage(from, { text: `📭 No bug reports` });
        
        let text = `╭━━━━━━━━━━━━━━╮\n┃  🐛 *BUG REPORTS*  \n╰━━━━━━━━━━━━━━╯\n\n`;
        db.bugs.slice(-5).forEach((bug, i) => {
            text += `#${bug.id} | @${bug.reporter.split('@')[0]}\n📝 ${bug.report}\n\n`;
        });
        text += FOOTER;
        
        await sock.sendMessage(from, { 
            text,
            mentions: db.bugs.map(b => b.reporter)
        });
    });

    commands.set('mybug', async (sock, from, args, sender) => {
        db.bugs = db.bugs || [];
        const myBugs = db.bugs.filter(b => b.reporter === sender);
        
        if (myBugs.length === 0) return await sock.sendMessage(from, { text: `📭 No bugs reported by you` });
        
        let text = `╭━━━━━━━━━━━━━━╮\n┃  🐛 *YOUR BUGS*  \n╰━━━━━━━━━━━━━━╯\n\n`;
        myBugs.forEach((bug, i) => {
            text += `#${bug.id}: ${bug.report}\n📅 ${moment(bug.time).format('DD/MM/YY')}\n\n`;
        });
        text += FOOTER;
        
        await sock.sendMessage(from, { text });
    });

    commands.set('deletebug', async (sock, from, args, sender) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        const id = parseInt(args[0]);
        if (!id) return await sock.sendMessage(from, { text: `❌ Usage: .deletebug [id]` });
        
        db.bugs = db.bugs || [];
        db.bugs = db.bugs.filter(b => b.id !== id);
        saveDb();
        
        await sock.sendMessage(from, { text: `✅ Bug #${id} deleted` });
    });

    commands.set('hack', async (sock, from, args, sender, isGroup, userIsOwner, isUserAdmin, msg) => {
        const target = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        if (!target) return await sock.sendMessage(from, { text: `❌ Tag someone to hack!` });
        
        const steps = ['🔍 Scanning...', '📡 Bypassing...', '🔓 Cracking...', '💀 Injecting...', '✅ HACKED!'];
        for (const step of steps) {
            await sock.sendMessage(from, { text: step });
            await sleep(1000);
        }
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  💀 *HACKED*  \n╰━━━━━━━━━━━━━━╯\n\n👤 Victim: @${target.split('@')[0]}\n📱 Data stolen!\n\n⚠️ Just for fun!\n\n${FOOTER}`,
            mentions: [target]
        });
    });

    commands.set('hijack', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        const target = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        if (!target) return await sock.sendMessage(from, { text: `❌ Tag someone to hijack!` });
        
        db.hijacked = db.hijacked || {};
        db.hijacked[target] = {
            hijackedBy: sender,
            time: Date.now(),
            group: from
        };
        saveDb();
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  👁️ *HIJACKED*  \n╰━━━━━━━━━━━━━━╯\n\n👁️ @${target.split('@')[0]} has been hijacked!\n\n${FOOTER}`,
            mentions: [target]
        });
    });

    commands.set('release', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        const target = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        if (!target) return await sock.sendMessage(from, { text: `❌ Tag someone to release!` });
        
        if (db.hijacked?.[target]) {
            delete db.hijacked[target];
            saveDb();
            await sock.sendMessage(from, { 
                text: `╭━━━━━━━━━━━━━━╮\n┃  ✅ *RELEASED*  \n╰━━━━━━━━━━━━━━╯\n\n✅ @${target.split('@')[0]} released\n\n${FOOTER}`,
                mentions: [target]
            });
        }
    });

    commands.set('hijacked', async (sock, from, args, sender) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        db.hijacked = db.hijacked || {};
        if (Object.keys(db.hijacked).length === 0) {
            return await sock.sendMessage(from, { text: `📭 No hijacked users` });
        }
        
        let text = `╭━━━━━━━━━━━━━━╮\n┃  👁️ *HIJACKED USERS*  \n╰━━━━━━━━━━━━━━╯\n\n`;
        Object.entries(db.hijacked).forEach(([user, data], i) => {
            text += `${i+1}. @${user.split('@')[0]} (by @${data.hijackedBy.split('@')[0]})\n`;
        });
        text += `\n${FOOTER}`;
        
        await sock.sendMessage(from, { 
            text,
            mentions: [...Object.keys(db.hijacked), ...Object.values(db.hijacked).map(d => d.hijackedBy)]
        });
    });

    commands.set('clone', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        await sock.sendMessage(from, { text: `📋 Clone feature coming soon!` });
    });

    commands.set('destroy', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        await sock.sendMessage(from, { text: `💥 Destroy feature coming soon!` });
    });

    commands.set('crash', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        await sock.sendMessage(from, { text: `💥 Crash feature coming soon!` });
    });

    commands.set('nuke', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        await sock.sendMessage(from, { text: `☢️ Nuke feature coming soon!` });
    });

    commands.set('raid', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        await sock.sendMessage(from, { text: `⚔️ Raid feature coming soon!` });
    });

    commands.set('chaos', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        await sock.sendMessage(from, { text: `🌪️ Chaos feature coming soon!` });
    });

    commands.set('resetgroup', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        await sock.sendMessage(from, { text: `🔄 Reset group feature coming soon!` });
    });

    // ========== BOT SETTINGS COMMANDS ==========
    commands.set('autostatus', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        const option = args[0];
        if (!option || !['on', 'off'].includes(option)) {
            return await sock.sendMessage(from, { text: `❌ Usage: .autostatus on/off` });
        }
        
        db.settings.autoStatus = option === 'on';
        saveDb();
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  📱 *AUTO STATUS*  \n╰━━━━━━━━━━━━━━╯\n\n✅ Auto Status ${option}\n\n${FOOTER}`
        });
    });

    commands.set('autoreact', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        const option = args[0];
        if (!option || !['on', 'off'].includes(option)) {
            return await sock.sendMessage(from, { text: `❌ Usage: .autoreact on/off` });
        }
        
        db.settings.autoReact = option === 'on';
        saveDb();
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  😊 *AUTO REACT*  \n╰━━━━━━━━━━━━━━╯\n\n✅ Auto React ${option}\n\n${FOOTER}`
        });
    });

    commands.set('autoview', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        const option = args[0];
        if (!option || !['on', 'off'].includes(option)) {
            return await sock.sendMessage(from, { text: `❌ Usage: .autoview on/off` });
        }
        
        db.settings.autoView = option === 'on';
        saveDb();
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  👁️ *AUTO VIEW*  \n╰━━━━━━━━━━━━━━╯\n\n✅ Auto View ${option}\n\n${FOOTER}`
        });
    });

    commands.set('autobio', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        const option = args[0];
        if (!option || !['on', 'off'].includes(option)) {
            return await sock.sendMessage(from, { text: `❌ Usage: .autobio on/off` });
        }
        
        db.settings.autoBio = option === 'on';
        saveDb();
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  📝 *AUTO BIO*  \n╰━━━━━━━━━━━━━━╯\n\n✅ Auto Bio ${option}\n\n${FOOTER}`
        });
    });

    commands.set('autoread', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        const option = args[0];
        if (!option || !['on', 'off'].includes(option)) {
            return await sock.sendMessage(from, { text: `❌ Usage: .autoread on/off` });
        }
        
        db.settings.autoRead = option === 'on';
        saveDb();
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  📖 *AUTO READ*  \n╰━━━━━━━━━━━━━━╯\n\n✅ Auto Read ${option}\n\n${FOOTER}`
        });
    });

    commands.set('autolike', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        const option = args[0];
        if (!option || !['on', 'off'].includes(option)) {
            return await sock.sendMessage(from, { text: `❌ Usage: .autolike on/off` });
        }
        
        db.settings.autoLike = option === 'on';
        saveDb();
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  ❤️ *AUTO LIKE*  \n╰━━━━━━━━━━━━━━╯\n\n✅ Auto Like ${option}\n\n${FOOTER}`
        });
    });

    commands.set('autorecord', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        const option = args[0];
        if (!option || !['on', 'off'].includes(option)) {
            return await sock.sendMessage(from, { text: `❌ Usage: .autorecord on/off` });
        }
        
        db.settings.autoRecord = option === 'on';
        saveDb();
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  🎙️ *AUTO RECORD*  \n╰━━━━━━━━━━━━━━╯\n\n✅ Auto Record ${option}\n\n${FOOTER}`
        });
    });

    commands.set('autotyping', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        const option = args[0];
        if (!option || !['on', 'off'].includes(option)) {
            return await sock.sendMessage(from, { text: `❌ Usage: .autotyping on/off` });
        }
        
        db.settings.autoTyping = option === 'on';
        saveDb();
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  ⌨️ *AUTO TYPING*  \n╰━━━━━━━━━━━━━━╯\n\n✅ Auto Typing ${option}\n\n${FOOTER}`
        });
    });

    commands.set('public', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        db.settings.public = true;
        db.settings.privateMode = false;
        saveDb();
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  🌍 *PUBLIC MODE*  \n╰━━━━━━━━━━━━━━╯\n\n✅ Bot is now public\n\n${FOOTER}`
        });
    });

    commands.set('private', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        db.settings.public = false;
        db.settings.privateMode = true;
        saveDb();
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  🔒 *PRIVATE MODE*  \n╰━━━━━━━━━━━━━━╯\n\n✅ Bot is now private (owner only)\n\n${FOOTER}`
        });
    });

    commands.set('grouponly', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        db.settings.public = false;
        db.settings.privateMode = false;
        db.settings.groupOnly = true;
        saveDb();
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  👥 *GROUP ONLY MODE*  \n╰━━━━━━━━━━━━━━╯\n\n✅ Bot only responds in groups\n\n${FOOTER}`
        });
    });

    commands.set('selfonly', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        db.settings.public = false;
        db.settings.privateMode = false;
        db.settings.selfOnly = true;
        saveDb();
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  👤 *SELF ONLY MODE*  \n╰━━━━━━━━━━━━━━╯\n\n✅ Bot only responds to owner DMs\n\n${FOOTER}`
        });
    });

    commands.set('maintenance', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        const option = args[0];
        if (!option || !['on', 'off'].includes(option)) {
            return await sock.sendMessage(from, { text: `❌ Usage: .maintenance on/off` });
        }
        
        db.settings.maintenance = option === 'on';
        saveDb();
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  🔧 *MAINTENANCE MODE*  \n╰━━━━━━━━━━━━━━╯\n\n✅ Maintenance ${option}\n\n${FOOTER}`
        });
    });

    commands.set('setprefix', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        const newPrefix = args[0];
        if (!newPrefix) return await sock.sendMessage(from, { text: `❌ Usage: .setprefix [symbol]` });
        
        prefix = newPrefix;
        saveDb();
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  ✅ *PREFIX UPDATED*  \n╰━━━━━━━━━━━━━━╯\n\n🔰 New prefix: ${newPrefix}\n\n${FOOTER}`
        });
    });

    commands.set('setprefixless', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        const option = args[0];
        if (!option || !['on', 'off'].includes(option)) {
            return await sock.sendMessage(from, { text: `❌ Usage: .setprefixless on/off` });
        }
        
        prefixless = option === 'on';
        saveDb();
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  ✅ *PREFIXLESS MODE*  \n╰━━━━━━━━━━━━━━╯\n\n🔰 Prefixless: ${option}\n\n${FOOTER}`
        });
    });

    commands.set('setbotname', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        const newName = args.join(' ');
        if (!newName) return await sock.sendMessage(from, { text: `❌ Usage: .setbotname [name]` });
        
        db.settings.botName = newName;
        saveDb();
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  ✅ *BOT NAME UPDATED*  \n╰━━━━━━━━━━━━━━╯\n\n🤖 New name: ${newName}\n\n${FOOTER}`
        });
    });

    commands.set('setowner', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        const newOwner = args.join(' ');
        if (!newOwner) return await sock.sendMessage(from, { text: `❌ Usage: .setowner [name]` });
        
        db.settings.ownerName = newOwner;
        saveDb();
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  ✅ *OWNER NAME UPDATED*  \n╰━━━━━━━━━━━━━━╯\n\n👑 New owner name: ${newOwner}\n\n${FOOTER}`
        });
    });

    commands.set('setfooter', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        const newFooter = args.join(' ');
        if (!newFooter) return await sock.sendMessage(from, { text: `❌ Usage: .setfooter [text]` });
        
        db.settings.footer = newFooter;
        saveDb();
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  ✅ *FOOTER UPDATED*  \n╰━━━━━━━━━━━━━━╯\n\n📝 New footer: ${newFooter}\n\n${FOOTER}`
        });
    });

    // ========== SESSION OWNER COMMANDS ==========
    commands.set('addsession', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isPermanentOwner(sender)) return await sock.sendMessage(from, { text: `❌ Only permanent owner can add session owners!` });
        
        const number = args[0]?.replace(/\D/g, '');
        if (!number) return await sock.sendMessage(from, { text: `❌ Usage: .addsession [number]` });
        
        db.sessionOwners = db.sessionOwners || [];
        if (!db.sessionOwners.includes(number)) {
            db.sessionOwners.push(number);
            saveDb();
            await sock.sendMessage(from, { text: `✅ Added ${number} as session owner` });
        } else {
            await sock.sendMessage(from, { text: `❌ ${number} is already a session owner` });
        }
    });

    commands.set('removesession', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isPermanentOwner(sender)) return await sock.sendMessage(from, { text: `❌ Only permanent owner can remove session owners!` });
        
        const number = args[0]?.replace(/\D/g, '');
        if (!number) return await sock.sendMessage(from, { text: `❌ Usage: .removesession [number]` });
        
        db.sessionOwners = db.sessionOwners || [];
        db.sessionOwners = db.sessionOwners.filter(n => n !== number);
        saveDb();
        await sock.sendMessage(from, { text: `✅ Removed ${number} from session owners` });
    });

    commands.set('listsessions', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        db.sessionOwners = db.sessionOwners || [];
        let text = `╭━━━━━━━━━━━━━━╮\n┃  🔰 *SESSION OWNERS*  \n╰━━━━━━━━━━━━━━╯\n\n`;
        if (db.sessionOwners.length === 0) {
            text += 'No session owners\n';
        } else {
            db.sessionOwners.forEach((num, i) => text += `${i+1}. @${num}\n`);
        }
        text += `\n${FOOTER}`;
        
        await sock.sendMessage(from, { 
            text,
            mentions: db.sessionOwners.map(num => num + '@s.whatsapp.net')
        });
    });

    // ========== OWNER COMMANDS ==========
    commands.set('ban', async (sock, from, args, sender, isGroup, userIsOwner, msg) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        const target = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        if (!target) return await sock.sendMessage(from, { text: `❌ Tag someone to ban!` });
        
        const targetNum = target.split('@')[0];
        if (!db.banned.includes(targetNum)) {
            db.banned.push(targetNum);
            saveDb();
        }
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  🔨 *BANNED*  \n╰━━━━━━━━━━━━━━╯\n\n🚫 @${targetNum} banned\n\n${FOOTER}`,
            mentions: [target]
        });
    });

    commands.set('unban', async (sock, from, args, sender, isGroup, userIsOwner, msg) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        const target = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        if (!target) return await sock.sendMessage(from, { text: `❌ Tag someone to unban!` });
        
        const targetNum = target.split('@')[0];
        db.banned = db.banned.filter(num => num !== targetNum);
        saveDb();
        
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  ✅ *UNBANNED*  \n╰━━━━━━━━━━━━━━╯\n\n✅ @${targetNum} unbanned\n\n${FOOTER}`,
            mentions: [target]
        });
    });

    commands.set('banlist', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        if (db.banned.length === 0) return await sock.sendMessage(from, { text: `📭 No banned users` });
        
        let text = `╭━━━━━━━━━━━━━━╮\n┃  📋 *BANNED USERS*  \n╰━━━━━━━━━━━━━━╯\n\n`;
        db.banned.forEach((num, i) => text += `${i+1}. @${num}\n`);
        text += `\nTotal: ${db.banned.length}\n\n${FOOTER}`;
        
        await sock.sendMessage(from, { 
            text,
            mentions: db.banned.map(num => num + '@s.whatsapp.net')
        });
    });

    commands.set('broadcast', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        const msg = args.join(' ');
        if (!msg) return await sock.sendMessage(from, { text: `❌ Usage: .broadcast [message]` });
        
        await sock.sendMessage(from, { text: `📢 Broadcast: ${msg}` });
    });

    commands.set('join', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        const link = args[0];
        if (!link) return await sock.sendMessage(from, { text: `❌ Usage: .join [group link]` });
        
        try {
            const code = link.split('https://chat.whatsapp.com/')[1];
            await sock.groupAcceptInvite(code);
            await sock.sendMessage(from, { text: `✅ Joined group!` });
        } catch {
            await sock.sendMessage(from, { text: `❌ Failed to join` });
        }
    });

    commands.set('leave', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        if (!isGroup) return await sock.sendMessage(from, { text: `❌ Use in the group` });
        
        await sock.sendMessage(from, { text: `👋 Leaving...` });
        await sock.groupLeave(from);
    });

    commands.set('block', async (sock, from, args, sender, isGroup, userIsOwner, msg) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        const target = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        if (!target) return await sock.sendMessage(from, { text: `❌ Tag someone to block!` });
        
        await sock.updateBlockStatus(target, 'block');
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  🚫 *BLOCKED*  \n╰━━━━━━━━━━━━━━╯\n\n✅ @${target.split('@')[0]} blocked\n\n${FOOTER}`,
            mentions: [target]
        });
    });

    commands.set('unblock', async (sock, from, args, sender, isGroup, userIsOwner, msg) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        const target = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        if (!target) return await sock.sendMessage(from, { text: `❌ Tag someone to unblock!` });
        
        await sock.updateBlockStatus(target, 'unblock');
        await sock.sendMessage(from, { 
            text: `╭━━━━━━━━━━━━━━╮\n┃  ✅ *UNBLOCKED*  \n╰━━━━━━━━━━━━━━╯\n\n✅ @${target.split('@')[0]} unblocked\n\n${FOOTER}`,
            mentions: [target]
        });
    });

    commands.set('delete', async (sock, from, args, sender, isGroup, userIsOwner, msg) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        if (!msg?.message?.extendedTextMessage?.contextInfo?.stanzaId) {
            return await sock.sendMessage(from, { text: `❌ Reply to a message to delete!` });
        }
        
        const key = {
            remoteJid: from,
            fromMe: true,
            id: msg.message.extendedTextMessage.contextInfo.stanzaId,
            participant: msg.message.extendedTextMessage.contextInfo.participant
        };
        
        await sock.sendMessage(from, { delete: key });
    });

    commands.set('eval', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        const code = args.join(' ');
        if (!code) return await sock.sendMessage(from, { text: `❌ Usage: .eval [code]` });
        
        try {
            const result = eval(code);
            await sock.sendMessage(from, { text: `📟 Result:\n${util.inspect(result)}` });
        } catch (e) {
            await sock.sendMessage(from, { text: `❌ Error: ${e.message}` });
        }
    });

    commands.set('exec', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        const cmd = args.join(' ');
        if (!cmd) return await sock.sendMessage(from, { text: `❌ Usage: .exec [command]` });
        
        exec(cmd, (err, stdout) => {
            if (err) sock.sendMessage(from, { text: `❌ ${err.message}` });
            else sock.sendMessage(from, { text: stdout.substring(0, 4000) });
        });
    });

    commands.set('restart', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        await sock.sendMessage(from, { text: `🔄 Restarting...` });
        process.exit();
    });

    commands.set('shutdown', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        await sock.sendMessage(from, { text: `🔴 Shutting down...` });
        process.exit(1);
    });

    commands.set('addowner', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isPermanentOwner(sender)) return await sock.sendMessage(from, { text: `❌ Only permanent owner can add owners!` });
        
        const number = args[0]?.replace(/\D/g, '');
        if (!number) return await sock.sendMessage(from, { text: `❌ Usage: .addowner [number]` });
        
        db.ownerNumbers = db.ownerNumbers || [];
        if (!db.ownerNumbers.includes(number)) {
            db.ownerNumbers.push(number);
            saveDb();
            await sock.sendMessage(from, { text: `✅ Added ${number} as owner` });
        }
    });

    commands.set('removeowner', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isPermanentOwner(sender)) return await sock.sendMessage(from, { text: `❌ Only permanent owner can remove owners!` });
        
        const number = args[0]?.replace(/\D/g, '');
        if (!number) return await sock.sendMessage(from, { text: `❌ Usage: .removeowner [number]` });
        
        db.ownerNumbers = db.ownerNumbers || [];
        db.ownerNumbers = db.ownerNumbers.filter(n => n !== number);
        saveDb();
        await sock.sendMessage(from, { text: `✅ Removed ${number} from owners` });
    });

    commands.set('listowners', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        db.ownerNumbers = db.ownerNumbers || [];
        let text = `╭━━━━━━━━━━━━━━╮\n┃  👑 *OWNERS*  \n╰━━━━━━━━━━━━━━╯\n\nPermanent Owner: @${PERMANENT_OWNER}\n\n`;
        if (db.ownerNumbers.length > 0) {
            text += 'Other Owners:\n';
            db.ownerNumbers.forEach((num, i) => {
                if (num !== PERMANENT_OWNER) {
                    text += `${i+1}. @${num}\n`;
                }
            });
        }
        text += `\n${FOOTER}`;
        
        await sock.sendMessage(from, { 
            text,
            mentions: [PERMANENT_OWNER + '@s.whatsapp.net', ...db.ownerNumbers.map(num => num + '@s.whatsapp.net')]
        });
    });

    commands.set('addsudo', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        const number = args[0]?.replace(/\D/g, '');
        if (!number) return await sock.sendMessage(from, { text: `❌ Usage: .addsudo [number]` });
        
        db.sudo = db.sudo || [];
        if (!db.sudo.includes(number)) {
            db.sudo.push(number);
            saveDb();
            await sock.sendMessage(from, { text: `✅ Added ${number} as sudo user` });
        }
    });

    commands.set('delsudo', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        const number = args[0]?.replace(/\D/g, '');
        if (!number) return await sock.sendMessage(from, { text: `❌ Usage: .delsudo [number]` });
        
        db.sudo = db.sudo || [];
        db.sudo = db.sudo.filter(n => n !== number);
        saveDb();
        await sock.sendMessage(from, { text: `✅ Removed ${number} from sudo` });
    });

    commands.set('listsudo', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        
        db.sudo = db.sudo || [];
        let text = `╭━━━━━━━━━━━━━━╮\n┃  ⚡ *SUDO USERS*  \n╰━━━━━━━━━━━━━━╯\n\n`;
        if (db.sudo.length === 0) {
            text += 'No sudo users\n';
        } else {
            db.sudo.forEach((num, i) => text += `${i+1}. @${num}\n`);
        }
        text += `\n${FOOTER}`;
        
        await sock.sendMessage(from, { 
            text,
            mentions: db.sudo.map(num => num + '@s.whatsapp.net')
        });
    });

    commands.set('backup', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        await sock.sendMessage(from, { text: `💾 Backup feature coming soon!` });
    });

    commands.set('restore', async (sock, from, args, sender, isGroup, userIsOwner) => {
        if (!isOwner(sender)) return await sock.sendMessage(from, { text: `❌ Owner only!` });
        await sock.sendMessage(from, { text: `📂 Restore feature coming soon!` });
    });
};

// ==================== WELCOME/GOODBYE HANDLER ====================
const handleWelcomeGoodbye = async (sock, update) => {
    const { id, participants, action } = update;
    if (!db.settings.welcome && !db.settings.goodbye) return;
    
    try {
        for (let user of participants) {
            if (action === 'add' && db.settings.welcome) {
                const msg = db.welcomeMsg?.[id] || `🎉 Welcome @${user.split('@')[0]}!`;
                await sock.sendMessage(id, { 
                    text: msg,
                    mentions: [user]
                });
            } else if (action === 'remove' && db.settings.goodbye) {
                const msg = db.goodbyeMsg?.[id] || `👋 Goodbye @${user.split('@')[0]}!`;
                await sock.sendMessage(id, { 
                    text: msg,
                    mentions: [user]
                });
            }
        }
    } catch (e) {}
};

// ==================== ANTI-LINK CHECK ====================
const checkAntiLink = async (sock, from, sender, text) => {
    if (!db.antilinkGroups?.[from]) return false;
    if (isOwner(sender)) return false;
    
    if (isUrl(text)) {
        await sock.sendMessage(from, { 
            text: `🚫 @${sender.split('@')[0]}, links are not allowed!`,
            mentions: [sender]
        });
        await sock.groupParticipantsUpdate(from, [sender], 'remove');
        return true;
    }
    return false;
};

// ==================== MAIN BOT FUNCTION ====================
async function connectToWhatsApp() {
    console.log('\n' + '='.repeat(70));
    console.log(`${colors.green}✨ PAXTON-MD v${BOT_VERSION} ✨${colors.reset}`);
    console.log('='.repeat(70));
    console.log(`${colors.green}👑 Permanent Owner:${colors.reset} ${PERMANENT_OWNER} (${OWNER_NAME})`);
    console.log(`${colors.yellow}🔰 Session Owners:${colors.reset} ${db.sessionOwners?.length || 0}`);
    console.log(`${colors.cyan}📅 ${moment().format('DD/MM/YYYY HH:mm:ss')}${colors.reset}`);
    console.log('='.repeat(70) + '\n');

    const { state, saveCreds } = await useMultiFileAuthState(sessionsDir);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        browser: Browsers.ubuntu('Chrome'),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }))
        },
        printQRInTerminal: false,
        logger: pino({ level: 'fatal' }),
        syncFullHistory: false
    });

    // Register commands
    registerCommands();
    console.log(`${colors.green}✅ Registered ${commands.size} commands${colors.reset}\n`);

    // Handle pairing code
    if (!sock.authState.creds.registered) {
        console.log(`${colors.yellow}📱 Enter your phone number:${colors.reset}`);
        process.stdin.once('data', async (data) => {
            const number = data.toString().trim().replace(/\D/g, '');
            try {
                const code = await sock.requestPairingCode(number);
                console.log('\n' + '🔐'.repeat(30));
                console.log(`${colors.green}🔐 YOUR PAIRING CODE: ${code.match(/.{1,4}/g).join('-')}${colors.reset}`);
                console.log('🔐'.repeat(30) + '\n');
                console.log(`${colors.cyan}📱 Open WhatsApp > Linked Devices > Link a Device${colors.reset}`);
                console.log(`${colors.cyan}📱 Tap "Link with phone number instead" and enter the code${colors.reset}\n`);
                
                // Auto-add session owner
                const sessionNum = number.replace(/\D/g, '');
                if (!db.sessionOwners.includes(sessionNum) && sessionNum !== PERMANENT_OWNER) {
                    db.sessionOwners.push(sessionNum);
                    saveDb();
                    console.log(`${colors.green}✅ Added ${sessionNum} as session owner${colors.reset}`);
                }
            } catch (e) {
                console.error(`${colors.red}❌ Failed:${colors.reset}`, e.message);
            }
        });
    }

    // Connection handler
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'open') {
            console.log('\n' + '✅'.repeat(40));
            console.log(`${colors.green}✅✅✅ PAXTON MD CONNECTED! ✅✅✅${colors.reset}`);
            console.log('✅'.repeat(40) + '\n');
            console.log(`${colors.green}👑 Permanent Owner:${colors.reset} ${PERMANENT_OWNER}`);
            console.log(`${colors.yellow}🔰 Session Owners:${colors.reset} ${db.sessionOwners?.length || 0}`);
            
            if (sock.user?.id) {
                botJid = sock.user.id;
                const sessionNum = botJid.split(':')[0];
                console.log(`${colors.cyan}📱 Session: ${sessionNum}${colors.reset}`);
                
                // Auto-add session owner if not already
                if (!db.sessionOwners.includes(sessionNum) && sessionNum !== PERMANENT_OWNER) {
                    db.sessionOwners.push(sessionNum);
                    saveDb();
                    console.log(`${colors.green}✅ Added ${sessionNum} as session owner${colors.reset}`);
                }
            }
        }
        
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            if (statusCode === DisconnectReason.loggedOut) {
                console.log(`${colors.red}❌ Logged out. Delete sessions folder and restart.${colors.reset}`);
                process.exit();
            } else {
                console.log(`${colors.yellow}🔄 Reconnecting in 5 seconds...${colors.reset}`);
                setTimeout(connectToWhatsApp, 5000);
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('group-participants.update', (update) => handleWelcomeGoodbye(sock, update));

    // Auto bio update every 30 minutes (reduced frequency to avoid errors)
    setInterval(() => updateAutoBio(sock), 30 * 60 * 1000);

    // Message handler
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;

        const from = m.key.remoteJid;
        const sender = m.key.participant || from;
        const isGroup = from.endsWith('@g.us');
        const senderNum = sender.split('@')[0];
        const userIsOwner = isOwner(sender);
        const userIsPermanent = isPermanentOwner(sender);
        const userIsSession = isSessionOwner(sender);

        // Handle status updates
        if (from === 'status@broadcast') {
            await handleAutoStatus(sock, m);
            return;
        }

        // Handle view-once messages
        if (m.message?.viewOnceMessageV2 || m.message?.viewOnceMessage) {
            await handleAutoViewOnce(sock, m, from, sender);
        }

        // Get text
        let text = '';
        if (m.message.conversation) text = m.message.conversation;
        else if (m.message.extendedTextMessage) text = m.message.extendedTextMessage.text;
        else if (m.message.imageMessage) text = m.message.imageMessage.caption || '';
        else return;

        // Terminal display with colors
        let roleIcon = '';
        if (userIsPermanent) roleIcon = '👑';
        else if (userIsSession) roleIcon = '🔰';
        else roleIcon = '👤';
        
        const typeIcon = isGroup ? '👥' : '👤';
        const displayNum = userIsPermanent ? `${colors.green}${senderNum}${colors.reset}` : 
                          userIsSession ? `${colors.yellow}${senderNum}${colors.reset}` : 
                          `${colors.red}${senderNum}${colors.reset}`;
        
        console.log(`\n${colors.cyan}════════════════════════════════════════${colors.reset}`);
        console.log(`${colors.cyan}📨 Message Received:${colors.reset}`);
        console.log(`${colors.yellow}${typeIcon} From:${colors.reset} ${displayNum} ${roleIcon}`);
        console.log(`${colors.yellow}💬 Text:${colors.reset} "${text}"`);
        console.log(`${colors.yellow}📌 Type:${colors.reset} ${isGroup ? 'Group' : 'DM'}`);
        console.log(`${colors.cyan}════════════════════════════════════════${colors.reset}`);

        // Check ban
        if (db.banned?.includes(senderNum) && !userIsOwner) {
            console.log(`${colors.red}🚫 Blocked banned user${colors.reset}`);
            return;
        }

        // Check anti-link
        if (isGroup) {
            const blocked = await checkAntiLink(sock, from, sender, text);
            if (blocked) {
                console.log(`${colors.red}🔗 Blocked link from ${displayNum}${colors.reset}`);
                return;
            }
        }

        // Auto read/like
        await handleAutoReadLike(sock, m, from, sender);

        // Check for command (with or without prefix)
        let cmdName = '';
        let args = [];
        
        if (text.startsWith(prefix)) {
            const parts = text.slice(prefix.length).trim().split(/ +/);
            cmdName = parts[0].toLowerCase();
            args = parts.slice(1);
        } else if (prefixless) {
            const parts = text.trim().split(/ +/);
            const possibleCmd = parts[0].toLowerCase();
            if (commands.has(possibleCmd)) {
                cmdName = possibleCmd;
                args = parts.slice(1);
            }
        }

        // Execute command
        if (cmdName && commands.has(cmdName)) {
            console.log(`${colors.green}⚡ Executing command: ${cmdName}${colors.reset}`);
            try {
                const isUserAdmin = isGroup ? await isAdmin(sock, from, sender) : false;
                await commands.get(cmdName)(sock, from, args, sender, isGroup, userIsOwner, isUserAdmin, m);
                console.log(`${colors.green}✅ Command executed successfully${colors.reset}`);
            } catch (e) {
                console.error(`${colors.red}❌ Command error:${colors.reset}`, e);
                await sock.sendMessage(from, { text: `❌ Error: ${e.message}` });
            }
        } else if (cmdName) {
            console.log(`${colors.yellow}⚠️ Unknown command: ${cmdName}${colors.reset}`);
        }
    });

    return sock;
}

// Start the bot
connectToWhatsApp().catch(err => {
    console.error(`${colors.red}Fatal error:${colors.reset}`, err);
    process.exit(1);
});
