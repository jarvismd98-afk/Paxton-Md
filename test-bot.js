// TEST BOT - ONLY RESPONDS TO YOUR NUMBER
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');

const YOUR_NUMBER = '27687813781';

console.log('\n🧪 TEST BOT');
console.log('Owner: ' + YOUR_NUMBER);
console.log('This bot will ONLY respond to you\n');

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

testBot();