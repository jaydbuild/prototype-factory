
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  cloudflareToken: 'J3qVAC6cQI0fFpH_zBJVoZ_mP3YCBdsvUO4_Kbsu',
  githubToken: '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',
  projectName: 'prototype-app',
  productionBranch: 'main',
  environments: ['staging', 'production']
};

console.log('🚀 Starting Cloudflare Pages deployment process...');

// Create temporary wrangler.toml config if it doesn't exist
function ensureWranglerConfig() {
  console.log('📝 Ensuring wrangler configuration is set up...');
  
  if (!fs.existsSync('./wrangler.toml')) {
    console.log('Creating wrangler.toml file...');
    
    const wranglerConfig = `
name = "${config.projectName}"

[env.staging]
name = "${config.projectName}-staging"
route = "staging.${config.projectName}.pages.dev/*"
workers_dev = true
compatibility_date = "2023-10-02"

[env.production]
name = "${config.projectName}"
route = "${config.projectName}.pages.dev/*"
workers_dev = true
compatibility_date = "2023-10-02"

[site]
bucket = "./dist"
`;
    
    fs.writeFileSync('./wrangler.toml', wranglerConfig.trim());
    console.log('✅ wrangler.toml created successfully');
  } else {
    console.log('✅ wrangler.toml already exists');
  }
}

// Login to Cloudflare
function loginToCloudflare() {
  console.log('🔑 Logging in to Cloudflare...');
  
  try {
    // Create temporary token file
    const tokenFilePath = path.join(os.tmpdir(), '.cloudflare.token');
    fs.writeFileSync(tokenFilePath, config.cloudflareToken);
    
    // Set environment variable to point to token file
    process.env.CLOUDFLARE_API_TOKEN = config.cloudflareToken;
    
    console.log('✅ Successfully authenticated with Cloudflare');
    return true;
  } catch (error) {
    console.error('❌ Failed to authenticate with Cloudflare:', error.message);
    return false;
  }
}

// Initialize Cloudflare Pages project
function initializeProject() {
  console.log(`🏗️ Creating Cloudflare Pages project: ${config.projectName}...`);
  
  try {
    execSync(`npx wrangler pages project create ${config.projectName} --production-branch=${config.productionBranch}`, {
      env: { ...process.env, CLOUDFLARE_API_TOKEN: config.cloudflareToken },
      stdio: 'inherit'
    });
    console.log(`✅ Successfully created/initialized project: ${config.projectName}`);
    return true;
  } catch (error) {
    // If project already exists, this is fine
    if (error.message.includes('already exists')) {
      console.log(`ℹ️ Project ${config.projectName} already exists, continuing...`);
      return true;
    }
    
    console.error('❌ Failed to initialize Cloudflare Pages project:', error.message);
    return false;
  }
}

// Build for specific environment
function buildForEnvironment(environment) {
  console.log(`🔨 Building for ${environment} environment...`);
  
  try {
    execSync(`npm run build:${environment}`, { stdio: 'inherit' });
    console.log(`✅ Build successful for ${environment}`);
    return true;
  } catch (error) {
    console.error(`❌ Build failed for ${environment}:`, error.message);
    return false;
  }
}

// Deploy to specific environment
function deployToEnvironment(environment) {
  console.log(`🚀 Deploying to ${environment}...`);
  
  const projectName = environment === 'staging' 
    ? `${config.projectName}-staging` 
    : config.projectName;
    
  try {
    execSync(`npx wrangler pages deploy dist --project-name=${projectName} --commit-dirty=true --branch=${environment}`, {
      env: { ...process.env, CLOUDFLARE_API_TOKEN: config.cloudflareToken },
      stdio: 'inherit'
    });
    console.log(`✅ Successfully deployed to ${environment}`);
    return true;
  } catch (error) {
    console.error(`❌ Deployment failed for ${environment}:`, error.message);
    return false;
  }
}

// Main deployment function
async function deploy() {
  // Add missing os import
  const os = require('os');
  
  // Setup and login
  ensureWranglerConfig();
  
  if (!loginToCloudflare()) {
    console.error('❌ Authentication failed, aborting deployment');
    process.exit(1);
  }
  
  if (!initializeProject()) {
    console.error('❌ Project initialization failed, aborting deployment');
    process.exit(1);
  }
  
  // Deploy each environment
  for (const env of config.environments) {
    if (!buildForEnvironment(env)) {
      console.error(`❌ Build failed for ${env}, skipping deployment`);
      continue;
    }
    
    if (!deployToEnvironment(env)) {
      console.error(`❌ Deployment failed for ${env}`);
    }
  }
  
  console.log('\n✅ Deployment process completed');
  console.log('\n⚠️ SECURITY REMINDER: Remember to revoke or change the tokens used in this script!');
}

// Run the deployment process
deploy().catch(error => {
  console.error('❌ An unexpected error occurred:', error);
  process.exit(1);
});
