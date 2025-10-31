#!/usr/bin/env tsx

console.log('🔧 MongoDB Atlas Connection String Generator')
console.log('==========================================')
console.log('')

const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
})

readline.question('Enter your MongoDB Atlas username: ', (username) => {
  readline.question('Enter your MongoDB Atlas password: ', (password) => {
    readline.question('Enter your cluster name (e.g., cluster0.ozxjq7p): ', (cluster) => {
      readline.question('Enter your database name (e.g., sovads): ', (dbName) => {
        
        // URL encode the password to handle special characters
        const encodedPassword = encodeURIComponent(password)
        
        const connectionString = `mongodb+srv://${username}:${encodedPassword}@${cluster}.mongodb.net/${dbName}?retryWrites=true&w=majority&appName=${dbName}`
        
        console.log('')
        console.log('✅ Generated Connection String:')
        console.log('================================')
        console.log(connectionString)
        console.log('')
        console.log('📝 Add this to your .env file:')
        console.log(`DATABASE_URL="${connectionString}"`)
        console.log('')
        console.log('🔍 Make sure to:')
        console.log('1. Add your IP address to MongoDB Atlas whitelist')
        console.log('2. Ensure your user has "Read and write to any database" permissions')
        console.log('3. Test the connection with: pnpm testconnection')
        
        readline.close()
      })
    })
  })
})
