// ==================== FRESH START BOT ====================
// This is the simplest possible bot to get you connected

const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('\n' + '='.repeat(50));
console.log('🤖 FRESH START BOT');
console.log('='.repeat(50));

async function startBot() {
    console.log('\n📁 Creating new session...');
    const { state, saveCreds } = await useMultiFileAuthState('./sessions');
    
    const sock = makeWASocket({
        auth: state,
        browser: ['Fresh Start', 'Chrome', '1.0'],
        printQRInTerminal: false,
        syncFullHistory: false
    });

    // If not registered, get pairing code
    if (!state.creds.registered) {
        console.log('\n📱 Please enter your phone number (with country code):');
        rl.question('> ', async (number) => {
            const cleanNumber = number.replace(/\D/g, '');
            console.log(`\n⏳ Generating pairing code for ${cleanNumber}...`);
            
            try {
                const code = await sock.requestPairingCode(cleanNumber);
                console.log('\n' + '🔐'.repeat(20));
                console.log(`🔐 YOUR PAIRING CODE: ${code.match(/.{1,4}/g).join('-')}`);
                console.log('🔐'.repeat(20) + '\n');
                console.log('📱 Steps to connect:');
                console.log('   1. Open WhatsApp on your phone');
                console.log('   2. Go to Settings → Linked Devices');
                console.log('   3. Tap "Link a Device"');
                console.log('   4. Tap "Link with phone number instead"');
                console.log('   5. Enter the code above\n');
                console.log('⏳ Waiting for connection...\n');
            } catch (error) {
                console.error('❌ Error:', error.message);
                process.exit(1);
            }
        });
    }

    // Connection updates
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'open') {
            console.log('\n' + '✅'.repeat(30));
            console.log('✅✅✅ BOT CONNECTED! ✅✅✅');
            console.log('✅'.repeat(30) + '\n');
            console.log('📱 You can now send messages to the bot\n');
            rl.close();
        }
        
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            if (statusCode === 428) {
                console.log('\n❌ Connection closed: Invalid pairing code or timeout');
                console.log('🔄 Please restart and try again with a new code\n');
                process.exit(1);
            } else {
                console.log('\n❌ Disconnected, reconnecting...\n');
                setTimeout(startBot, 5000);
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

startBot();
