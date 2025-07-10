console.log("🔐 Set Up Your Admin Credentials")
console.log("=".repeat(50))
console.log("")

console.log("⚠️  IMPORTANT: Use YOUR actual admin credentials!")
console.log("   Don't use the sample values from .env.local.example")
console.log("")

console.log("🔧 Steps to Add Your Credentials to Vercel:")
console.log("")

console.log("1. 📋 Go to Vercel Dashboard:")
console.log("   → https://vercel.com/dashboard")
console.log("   → Select your project")
console.log("   → Settings → Environment Variables")
console.log("")

console.log("2. 🔑 Add These Variables with YOUR values:")
console.log("")

const envVars = [
  {
    name: "ADMIN_USERNAME",
    placeholder: "your-actual-username",
    description: "Your chosen admin username",
  },
  {
    name: "ADMIN_PASSWORD",
    placeholder: "your-actual-password",
    description: "Your chosen admin password (NOT the sample one)",
  },
  {
    name: "ADMIN_SECRET_KEY",
    placeholder: generateSecretKey(),
    description: "Generated secret key for sessions",
  },
]

envVars.forEach((env, index) => {
  console.log(`${index + 1}. Variable Name: ${env.name}`)
  console.log(`   Value: ${env.placeholder}`)
  console.log(`   Note: ${env.description}`)
  console.log("")
})

console.log("3. 🗄️ Supabase Variables (these are correct):")
console.log("")
console.log("NEXT_PUBLIC_SUPABASE_URL=https://mdfqesrzhzewdbncjpgk.supabase.co")
console.log("NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
console.log("SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
console.log("")

console.log("4. ✅ Make sure to select ALL environments:")
console.log("   ☑️ Production")
console.log("   ☑️ Preview")
console.log("   ☑️ Development")
console.log("")

console.log("5. 🔄 After adding all variables:")
console.log("   → Go to Deployments tab")
console.log("   → Click '...' on latest deployment")
console.log("   → Click 'Redeploy'")
console.log("   → Wait 2-3 minutes")
console.log("")

console.log("6. 🧪 Test your login:")
console.log("   → Visit /admin")
console.log("   → Use YOUR username and password")
console.log("   → Should work after redeploy!")

function generateSecretKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*"
  let result = ""
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
