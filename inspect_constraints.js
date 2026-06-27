/* eslint-disable */
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
  console.log('Querying check constraints on tournaments table...')
  
  // We can query the pg_constraint catalog table via rpc or a query if allowed.
  // Wait, does Supabase REST API allow querying pg_catalog or information_schema?
  // Let's try querying information_schema.constraint_column_usage or pg_catalog.pg_constraint.
  // If the REST API doesn't allow direct SELECT on system catalog tables, it will return an error, but let's try it!
  const { data, error } = await supabase
    .from('tournaments')
    .select('id')
    .limit(1)

  // Wait, let's run a query to select check constraints.
  // Since we can't run arbitrary SQL via the REST client directly, let's check if there is an RPC function,
  // or if we can read the supabase_schema.sql. We already read it.
  // Wait! Let's query pg_constraint using the supabase REST API if possible:
  // supabase client can only query exposed tables unless we have a postgres function.
  // But wait! We can inspect the error message detail when we try to insert a wrong value.
  // Let's try inserting a tournament with different category values in a dry-run and see which ones violate the check constraint!
  
  const testCategories = ['anak_4_6', 'anak-anak', 'anak_7_12', 'remaja_pria', 'ibu_ibu', 'pasangan', 'anak-anak-4-6-tahun']
  
  console.log('Running test insertions for different categories...')
  for (const cat of testCategories) {
    const { error: insErr } = await supabase
      .from('tournaments')
      .insert({
        name: 'Test Lomba ' + cat,
        type: 'individu',
        category: cat
      })
    
    if (insErr) {
      console.log(`- Category "${cat}": FAILED - ${insErr.message}`);
    } else {
      console.log(`- Category "${cat}": SUCCESS (Inserting test row succeeded)`);
      // Delete the test row
      await supabase.from('tournaments').delete().eq('name', 'Test Lomba ' + cat)
    }
  }
}

main()
