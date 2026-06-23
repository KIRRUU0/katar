import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('.env', 'utf8')
const env = {}
envFile.split('\n').forEach(line => {
  const parts = line.split('=')
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim()
  }
})

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

async function main() {
  console.log('--- SIGNING IN ---')
  await supabase.auth.signInWithPassword({
    email: 'admin@iremda.com',
    password: 'iremda02'
  })

  console.log('--- TESTING tournaments COLUMNS ---')
  const { data, error } = await supabase
    .from('tournaments')
    .select('schedule, end_time')
    .limit(1)

  if (error) {
    console.log('❌ Error querying columns:', error.message)
  } else {
    console.log('✅ Columns exist! Result:', data)
  }
}

main()
