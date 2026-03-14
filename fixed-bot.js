// FIXED BOT - ONLY RESPONDS TO YOUR NUMBER
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');

const YOUR_NUMBER = '27687813781';

console.log('\n🚀 FIXED BOT');
console.log('Owner: ' + YOUR_NUMBER);
console.log('This bot will ONLY respond to you\n');

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
            const number = data.toString().trim().replace(/\D/g, '');
            try {
                const code = await sock.requestPairingCode(number);
                console.log('\n🔐 YOUR PAIRING CODE: ' + code.match(/.{1,4}/g).join('-'));
                console.log('📱 Enter this in WhatsApp > Linked Devices\n');
            } catch (e) {
                console.error('❌ Failed:', e.message);
            }
        });
    }

    sock.ev.on('connection.update', (update) => {
        const { connection } = update;
        if (connection === 'open') {
            console.log('\n✅✅✅ BOT CONNECTED! ✅✅✅\n');
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
                    text: '╭━━━━━━━━━━━━━━╮
┃  🤖 PAXTON-MD  ┃
╰━━━━━━━━━━━━━━╯

Commands:
.test - Test DM
.menu - This menu
.owner - Show owner

Your number: ' + YOUR_NUMBER 
                });
            } else if (text === '.owner' || text === 'owner') {
                await sock.sendMessage(from, { text: '👑 Owner: ' + YOUR_NUMBER });
            } else {
                await sock.sendMessage(from, { text: '✅ Message received: "' + text + '"

Type .menu for commands' });
            }
        }
    });

    return sock;
}

connectToWhatsApp();