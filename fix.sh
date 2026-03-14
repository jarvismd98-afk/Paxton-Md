#!/bin/bash
echo "🔧 PAXTON-MD FIX SCRIPT"
echo "========================"
echo ""
echo "🛑 Stopping any running bots..."
pkill -f node 2>/dev/null || true
echo "🗑️ Clearing old sessions..."
rm -rf sessions
echo "✅ Done!"
echo ""
echo "Now run: node fixed-bot.js"