// ==================== PAXTON-MD DEBUG & FIX ====================
// Simple version - no backtick issues
// Run with: node debug-fix.js

const fs = require('fs');

console.log('\n============================================================');
console.log('🔍 PAXTON-MD DEBUG & FIX TOOL');
console.log('============================================================');

// YOUR NUMBER
const YOUR_NUMBER = '27687813781';
console.log('\n📱 Your number: ' + YOUR_NUMBER);

// Step 1: Fix database
console.log('\n📁 STEP 1: Fixing database...');

let db = { 
    settings: {}, 
    ownerNumbers: [], 
    sessionOwners: [] 
};

// Add your number
db.ownerNumbers = [YOUR_NUMBER];
db.sessionOwners = [YOUR_NUMBER];
db.settings = {
    public: false,
    privateMode: true,
    groupOnly: false,
    selfOnly: false,
    prefixless: true,
    ownerName: 'Paxton',
    botName: 'PAXTON-MD',
    footer: 'Powered by Paxton'
};

// Save database
fs.writeFileSync('./database.json', JSON.stringify(db, null, 2));
console.log('✅ Database fixed - your number set as owner');

// Step 2: Create test bot
console.log('\n🧪 STEP 2: Creating test bot...');

const testBot = `// TEST BOT - ONLY RESPONDS TO YOUR NUMBER
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');

const YOUR_NUMBER = '${YOUR_NUMBER}';

console.log('\\n🧪 TEST BOT');
console.log('Owner: ' + YOUR_NUMBER);
console.log('This bot will ONLY respond to you\\n');

async function testBot() {
    const { state } = await useMultiFileAuthState('./sessions');
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' })
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;

        const from = m.key.remoteJid;
        const sender = m.key.participant || from;
        const isGroup = from.endsWith('@g.us');
        const senderNum = sender.split('@')[0];
        
        let text = '';
        if (m.message.conversation) text = m.message.conversation;
        else if (m.message.extendedTextMessage) text = m.message.extendedTextMessage.text;
        else return;

        console.log('📨 From: ' + senderNum + ' | ' + (isGroup ? 'Group' : 'DM') + ' | "' + text + '"');

        // ONLY respond to your number in DM
        if (!isGroup && senderNum === YOUR_NUMBER) {
            console.log('✅ RESPONDING TO OWNER');
            await sock.sendMessage(from, { text: '✅ TEST BOT WORKING! Your message: "' + text + '"' });
        }
    });

    console.log('🔄 Test bot running - send a message to your DM');
}

testBot();`;

fs.writeFileSync('./test-bot.js', testBot);
console.log('✅ Created test-bot.js');

// Step 3: Create fixed bot
console.log('\n🚀 STEP 3: Creating fixed bot...');

const fixedBot = `// FIXED BOT - ONLY RESPONDS TO YOUR NUMBER
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');

const YOUR_NUMBER = '${YOUR_NUMBER}';

console.log('\\n🚀 FIXED BOT');
console.log('Owner: ' + YOUR_NUMBER);
console.log('This bot will ONLY respond to you\\n');

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('./sessions');

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: ['Paxton MD', 'Chrome', '1.0'],
        printQRInTerminal: false
    });

    if (!state.creds.registered) {
        console.log('📱 Enter your phone number (' + YOUR_NUMBER + '):');
        process.stdin.once('data', async (data) => {
            const number = data.toString().trim().replace(/\\D/g, '');
            try {
                const code = await sock.requestPairingCode(number);
                console.log('\\n🔐 YOUR PAIRING CODE: ' + code.match(/.{1,4}/g).join('-'));
                console.log('📱 Enter this in WhatsApp > Linked Devices\\n');
            } catch (e) {
                console.error('❌ Failed:', e.message);
            }
        });
    }

    sock.ev.on('connection.update', (update) => {
        const { connection } = update;
        if (connection === 'open') {
            console.log('\\n✅✅✅ BOT CONNECTED! ✅✅✅\\n');
        }
        if (connection === 'close') {
            console.log('❌ Disconnected, reconnecting...');
            setTimeout(connectToWhatsApp, 5000);
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;

        const from = m.key.remoteJid;
        const sender = m.key.participant || from;
        const senderNum = sender.split('@')[0];
        
        let text = '';
        if (m.message.conversation) text = m.message.conversation;
        else if (m.message.extendedTextMessage) text = m.message.extendedTextMessage.text;
        else return;

        // ONLY respond to your number
        if (senderNum === YOUR_NUMBER) {
            console.log('📨 Message from owner: ' + text);
            
            if (text === '.test' || text === 'test') {
                await sock.sendMessage(from, { text: '✅ Bot is working in your DM!' });
            } else if (text === '.menu' || text === 'menu' || text === '.help' || text === 'help') {
                await sock.sendMessage(from, { 
                    text: '╭━━━━━━━━━━━━━━╮\n┃  🤖 PAXTON-MD  ┃\n╰━━━━━━━━━━━━━━╯\n\nCommands:\n.test - Test DM\n.menu - This menu\n.owner - Show owner\n\nYour number: ' + YOUR_NUMBER 
                });
            } else if (text === '.owner' || text === 'owner') {
                await sock.sendMessage(from, { text: '👑 Owner: ' + YOUR_NUMBER });
            } else {
                await sock.sendMessage(from, { text: '✅ Message received: "' + text + '"\n\nType .menu for commands' });
            }
        }
    });

    return sock;
}

connectToWhatsApp();`;

fs.writeFileSync('./fixed-bot.js', fixedBot);
console.log('✅ Created fixed-bot.js');

// Step 4: Create fix script
console.log('\n⚡ STEP 4: Creating fix script...');

const fixScript = `#!/bin/bash
echo "🔧 PAXTON-MD FIX SCRIPT"
echo "========================"
echo ""
echo "🛑 Stopping any running bots..."
pkill -f node 2>/dev/null || true
echo "🗑️ Clearing old sessions..."
rm -rf sessions
echo "✅ Done!"
echo ""
echo "Now run: node fixed-bot.js"`;

fs.writeFileSync('./fix.sh', fixScript);
fs.chmodSync('./fix.sh', '755');
console.log('✅ Created fix.sh');

// Step 5: Summary
console.log('\n============================================================');
console.log('✅ DEBUG & FIX COMPLETE');
console.log('============================================================');
console.log('\n📱 YOUR NUMBER: ' + YOUR_NUMBER);
console.log('\n📋 Commands to run:');
console.log('   1. node test-bot.js   - Test if DM works');
console.log('   2. node fixed-bot.js  - Run full bot');
console.log('\n✅ The bot will ONLY respond to your number!');
console.log('============================================================\n');
