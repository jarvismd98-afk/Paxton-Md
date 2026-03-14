// FIXED BOT - SIMPLE VERSION - ONLY RESPONDS TO YOUR NUMBER
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');

// YOUR NUMBER - CHANGE THIS
const YOUR_NUMBER = '27687813781';

console.log('\n===============================================');
console.log('🚀 PAXTON-MD FIXED BOT');
console.log('===============================================');
console.log('👑 Owner: ' + YOUR_NUMBER);
console.log('📱 This bot will ONLY respond to you');
console.log('===============================================\n');

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('./sessions');

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: ['Paxton MD', 'Chrome', '1.0'],
        printQRInTerminal: false,
        syncFullHistory: false
    });

    // Handle pairing code if not registered
    if (!state.creds.registered) {
        console.log('📱 Enter your phone number (' + YOUR_NUMBER + '):');
        process.stdin.once('data', async (data) => {
            const number = data.toString().trim().replace(/\D/g, '');
            try {
                const code = await sock.requestPairingCode(number);
                console.log('\n🔐 YOUR PAIRING CODE: ' + code.match(/.{1,4}/g).join('-'));
                console.log('📱 Open WhatsApp > Linked Devices > Link a Device');
                console.log('📱 Tap "Link with phone number instead" and enter the code\n');
            } catch (e) {
                console.error('❌ Failed to generate code:', e.message);
            }
        });
    }

    // Connection handler
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'open') {
            console.log('\n✅✅✅ BOT CONNECTED! ✅✅✅\n');
            console.log('👑 Owner: ' + YOUR_NUMBER);
            console.log('📱 Send any message to test\n');
        }
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                console.log('❌ Disconnected, reconnecting in 5 seconds...');
                setTimeout(connectToWhatsApp, 5000);
            } else {
                console.log('❌ Logged out. Delete sessions folder and restart.');
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Message handler - ONLY responds to your number
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;

        const from = m.key.remoteJid;
        const sender = m.key.participant || from;
        const isGroup = from.endsWith('@g.us');
        const senderNum = sender.split('@')[0];
        
        // Get message text
        let text = '';
        if (m.message.conversation) text = m.message.conversation;
        else if (m.message.extendedTextMessage) text = m.message.extendedTextMessage.text;
        else return;

        // Log all messages for debugging
        console.log('\n📨 MESSAGE RECEIVED:');
        console.log('   From: ' + senderNum);
        console.log('   Type: ' + (isGroup ? 'Group' : 'DM'));
        console.log('   Text: "' + text + '"');
        console.log('   Is Owner: ' + (senderNum === YOUR_NUMBER ? 'YES' : 'NO'));

        // ONLY respond to your number in DM
        if (!isGroup && senderNum === YOUR_NUMBER) {
            console.log('✅ RESPONDING TO OWNER DM');
            
            // Remove any prefix and clean the command
            const cmd = text.toLowerCase().replace(/^\.+/, '').trim();
            
            // Simple responses
            if (cmd === 'test' || text === '.test') {
                await sock.sendMessage(from, { text: '✅ TEST SUCCESSFUL!\n\nYour DM is working!\nYour number: ' + YOUR_NUMBER });
            }
            else if (cmd === 'menu' || cmd === 'help' || text === '.menu' || text === '.help') {
                const menu = '*🤖 PAXTON-MD*\n\n' +
                            '*Commands:*\n' +
                            '• test - Test DM\n' +
                            '• menu - Show this menu\n' +
                            '• owner - Show owner info\n' +
                            '• ping - Check response time\n' +
                            '• info - Bot information\n\n' +
                            '👑 Owner: ' + YOUR_NUMBER + '\n' +
                            '💫 Powered by Paxton';
                await sock.sendMessage(from, { text: menu });
            }
            else if (cmd === 'owner' || text === '.owner') {
                await sock.sendMessage(from, { text: '👑 *Owner*\n\nNumber: ' + YOUR_NUMBER + '\nName: Paxton\nStatus: Online' });
            }
            else if (cmd === 'ping' || text === '.ping') {
                const start = Date.now();
                await sock.sendMessage(from, { text: '🏓 Pong!' });
                const end = Date.now();
                await sock.sendMessage(from, { text: '⏱️ Response time: ' + (end - start) + 'ms' });
            }
            else if (cmd === 'info' || text === '.info') {
                await sock.sendMessage(from, { 
                    text: '*🤖 Bot Information*\n\n' +
                          'Name: PAXTON-MD\n' +
                          'Version: 5.0.0\n' +
                          'Owner: ' + YOUR_NUMBER + '\n' +
                          'Commands: 130+\n' +
                          'Mode: Private (only you)\n' +
                          'Status: Online'
                });
            }
            else {
                // Default response for any other message
                await sock.sendMessage(from, { 
                    text: '✅ Message received: "' + text + '"\n\n' +
                          'Type "menu" or ".menu" to see available commands.'
                });
            }
        }
        else if (senderNum !== YOUR_NUMBER) {
            console.log('❌ Ignored message from non-owner: ' + senderNum);
        }
    });

    return sock;
}

connectToWhatsApp().catch(err => {
    console.error('Fatal error:', err);
});
