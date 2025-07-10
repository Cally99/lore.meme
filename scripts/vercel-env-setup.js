console.log("🚀 Vercel Environment Variables Setup Guide")
console.log("=".repeat(50))
console.log("")

console.log("📋 STEP 1: Go to Vercel Dashboard")
console.log("   → https://vercel.com/dashboard")
console.log("   → Select your project: 'Lore.meme website design'")
console.log("")

console.log("⚙️  STEP 2: Add Environment Variables")
console.log("   → Go to Settings → Environment Variables")
console.log("   → Add each variable below for ALL environments:")
console.log("     ✅ Production")
console.log("     ✅ Preview")
console.log("     ✅ Development")
console.log("")

console.log("🔑 STEP 3: Add These Variables:")
console.log("")

const envVars = [
  {
    name: "ADMIN_USERNAME",
    value: "admin",
    description: "Admin login username",
  },
  {
    name: "ADMIN_PASSWORD",
    value: "admin123",
    description: "Admin login password",
  },
  {
    name: "ADMIN_SECRET_KEY",
    value: generateSecretKey(),
    description: "Secret key for admin sessions",
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_URL",
    value: "https://mdfqesrzhzewdbncjpgk.supabase.co",
    description: "Your Supabase project URL",
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    value:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kZnFlc3J6aHpld2RibmNqcGdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4MzI2MDcsImV4cCI6MjA2NTQwODYwN30.V8uwMBhDIw4pY_T4SgsHAXjD-num1vBvAlEDtAC2ZdQ",
    description: "Supabase anonymous/public key",
  },
  {
    name: "SUPABASE_SERVICE_ROLE_KEY",
    value:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kZnFlc3J6aHpld2RibmNqcGdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTgzMjYwNywiZXhwIjoyMDY1NDA4NjA3fQ.8m5XridYADEAYd17lnIPn73cqBMPc1AgxlJxKtpC0c8",
    description: "Supabase service role key (admin access)",
  },
]

envVars.forEach((env, index) => {
  console.log(`${index + 1}. ${env.name}`)
  console.log(`   Value: ${env.value}`)
  console.log(`   Description: ${env.description}`)
  console.log("")
})

console.log("🔄 STEP 4: Redeploy")
console.log("   → After adding all variables, redeploy your site")
console.log("   → Go to Deployments → Click '...' → Redeploy")
console.log("   → Or push a new commit to trigger deployment")
console.log("")

console.log("⏱️  STEP 5: Wait & Test")
console.log("   → Wait 2-3 minutes for deployment to complete")
console.log("   → Visit your admin page to test login")
console.log("   → Check /api/debug/public-env-check for status")
console.log("")

console.log("🎯 Quick Copy-Paste Values:")
console.log("-".repeat(30))
envVars.forEach((env) => {
  console.log(`${env.name}=${env.value}`)
})

function generateSecretKey() {
  // Simple secret key generation for display
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
