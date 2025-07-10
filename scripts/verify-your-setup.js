console.log("🔍 Verify Your Credential Setup")
console.log("=".repeat(40))
console.log("")

console.log("After you've added YOUR credentials to Vercel:")
console.log("")

console.log("1. ✅ Check Environment Status:")
console.log("   → Visit: /api/debug/public-env-check")
console.log("   → Should show all variables as ✅")
console.log("")

console.log("2. 🔐 Test Admin Login:")
console.log("   → Visit: /admin")
console.log("   → Use YOUR username and password")
console.log("   → Should redirect to admin dashboard")
console.log("")

console.log("3. 🗄️ Test Database Connection:")
console.log("   → Visit: /api/debug/test-supabase")
console.log("   → Should show successful connection")
console.log("")

console.log("4. 📊 Check Admin Panel:")
console.log("   → Should see token management interface")
console.log("   → Should be able to approve/reject tokens")
console.log("")

console.log("🚨 If login still fails:")
console.log("   → Double-check your password in Vercel settings")
console.log("   → Make sure you selected ALL environments")
console.log("   → Wait a few minutes after redeployment")
console.log("   → Check browser console for errors")
