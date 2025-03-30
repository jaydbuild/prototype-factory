
const { exec } = require('child_process');
const fs = require('fs');

// Get environment from command line arguments
const args = process.argv.slice(2);
const env = args[0] || 'staging';

if (!['staging', 'production'].includes(env)) {
  console.error('Invalid environment. Use "staging" or "production"');
  process.exit(1);
}

console.log(`Deploying to ${env} environment...`);

// Build for the specified environment
exec(`npm run build:${env}`, (error, stdout, stderr) => {
  if (error) {
    console.error(`Build error: ${error}`);
    return;
  }
  
  console.log(`Build output: ${stdout}`);
  
  if (stderr) {
    console.error(`Build stderr: ${stderr}`);
  }
  
  // Deploy to Cloudflare Pages
  exec(`npx wrangler pages deploy dist --project-name=prototype-app${env === 'staging' ? '-staging' : ''} --commit-dirty=true --branch=${env}`, 
    (error, stdout, stderr) => {
      if (error) {
        console.error(`Deployment error: ${error}`);
        return;
      }
      
      console.log(`Deployment output: ${stdout}`);
      
      if (stderr) {
        console.error(`Deployment stderr: ${stderr}`);
      }
      
      console.log(`Successfully deployed to ${env} environment!`);
    }
  );
});
