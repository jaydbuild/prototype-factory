import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Load environment variables
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupPrototypeProcessing() {
  console.log('🚀 Setting up prototype processing...')

  try {
    // 1. Create storage buckets
    console.log('\n📦 Creating storage buckets...')
    
    // Create prototype-files bucket (private)
    await supabase.storage.createBucket('prototype-files', {
      public: false,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: [
        'text/html',
        'text/css',
        'text/javascript',
        'application/javascript',
        'application/zip'
      ]
    })
    console.log('✅ Created prototype-files bucket')

    // Create prototype-deployments bucket (public)
    await supabase.storage.createBucket('prototype-deployments', {
      public: true,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: [
        'text/html',
        'text/css',
        'text/javascript',
        'application/javascript',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/svg+xml'
      ]
    })
    console.log('✅ Created prototype-deployments bucket')

    // 2. Set up storage policies
    console.log('\n🔒 Setting up storage policies...')
    
    // Policy for prototype-files bucket
    await supabase.rpc('create_storage_policy', {
      bucket_name: 'prototype-files',
      policy_name: 'authenticated_access',
      definition: `(role() = 'authenticated'::text)`,
      operation: 'ALL'
    })
    console.log('✅ Created policy for prototype-files bucket')

    // Policy for prototype-deployments bucket
    await supabase.rpc('create_storage_policy', {
      bucket_name: 'prototype-deployments',
      policy_name: 'public_read',
      definition: `true`,
      operation: 'READ'
    })
    console.log('✅ Created policy for prototype-deployments bucket')

    console.log('\n✨ Storage setup completed successfully!')
    console.log('\nNext steps:')
    console.log('1. Deploy the Edge Function manually through the Supabase Dashboard:')
    console.log('   - Go to https://app.supabase.com/project/_/functions')
    console.log('   - Create a new function named "process-prototype"')
    console.log('   - Copy the contents of supabase/functions/process-prototype/index.ts')
    console.log('2. Make sure your .env file contains VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
    console.log('3. Restart your development server')

  } catch (error) {
    console.error('\n❌ Setup failed:', error)
    process.exit(1)
  }
}

setupPrototypeProcessing()
