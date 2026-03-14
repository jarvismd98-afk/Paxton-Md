// Simple test to check owner recognition
const fs = require('fs');
const path = require('path');

// YOUR NUMBER - update this if different
const YOUR_NUMBER = '27687813781';
const PERMANENT_OWNER = '27687813781';

console.log('\n' + '='.repeat(60));
console.log('🔍 PAXTON-MD OWNER DIAGNOSTIC');
console.log('='.repeat(60));

// Check if database exists
const dbPath = './database.json';
console.log(`\n📁 Checking database: ${dbPath}`);

let db = { ownerNumbers: [], sessionOwners: [] };

if (fs.existsSync(dbPath)) {
    try {
        db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        console.log('✅ Database found and loaded');
    } catch (e) {
        console.log('❌ Database exists but is corrupted');
        db = { ownerNumbers: [], sessionOwners: [] };
    }
} else {
    console.log('❌ Database not found (this is normal for first run)');
}

// Display current values
console.log('\n📊 CURRENT DATABASE VALUES:');
console.log(`ownerNumbers: ${JSON.stringify(db.ownerNumbers || [])}`);
console.log(`sessionOwners: ${JSON.stringify(db.sessionOwners || [])}`);

// Check if your number is recognized
console.log('\n✅ OWNER RECOGNITION CHECK:');
console.log(`Your number: ${YOUR_NUMBER}`);
console.log(`Permanent owner: ${PERMANENT_OWNER}`);

const isPermanent = YOUR_NUMBER === PERMANENT_OWNER;
const inOwnerNumbers = (db.ownerNumbers || []).includes(YOUR_NUMBER);
const inSessionOwners = (db.sessionOwners || []).includes(YOUR_NUMBER);

console.log(`\nResults:`);
console.log(`- Is permanent owner: ${isPermanent ? '✅ YES' : '❌ NO'}`);
console.log(`- In ownerNumbers: ${inOwnerNumbers ? '✅ YES' : '❌ NO'}`);
console.log(`- In sessionOwners: ${inSessionOwners ? '✅ YES' : '❌ NO'}`);

if (isPermanent || inOwnerNumbers || inSessionOwners) {
    console.log(`\n✅ GOOD: Your number ${YOUR_NUMBER} IS recognized as owner!`);
} else {
    console.log(`\n❌ PROBLEM: Your number ${YOUR_NUMBER} is NOT recognized as owner!`);
    console.log('\n🔧 FIX: Run this command to add yourself:');
    console.log('\nnode -e \'const fs=require("fs"); const db=JSON.parse(fs.readFileSync("./database.json")); db.ownerNumbers=db.ownerNumbers||[]; if(!db.ownerNumbers.includes("27687813781")) db.ownerNumbers.push("27687813781"); db.sessionOwners=db.sessionOwners||[]; if(!db.sessionOwners.includes("27687813781")) db.sessionOwners.push("27687813781"); fs.writeFileSync("./database.json", JSON.stringify(db, null, 2)); console.log("✅ Added 27687813781 to owners!");\'');
}

console.log('\n' + '='.repeat(60));
