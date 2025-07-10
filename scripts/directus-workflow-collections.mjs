

/* eslint-disable padding-line-between-statements, newline-before-return */
import axios from 'axios';
import { config as dotenvConfig } from 'dotenv';

// Load environment variables
dotenvConfig();

// --- Configuration ---
const config = {
  DIRECTUS_URL: process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055',
  ADMIN_TOKEN: process.env.ADMIN_TOKEN || 'tZysSCeE3RsghJ1sX0Gr4idOrBgDGDG-',
  DEBUG: process.env.SCRIPT_DEBUG === 'true' || process.env.DEBUG === 'true' || false,
  CONTINUE_ON_ERROR: process.env.CONTINUE_ON_ERROR === 'true' || true,
};

// Track script execution state
let scriptSuccess = true;
let scriptWarnings = 0;
let scriptErrors = 0;
let totalSteps = 0;
let completedSteps = 0;

// Logging functions
const logStep = (message) => {
  totalSteps++;
  completedSteps++;
  console.log(`\n=== STEP: ${message} ===\n`);
};
const logInfo = (message) => console.log(`INFO: ${message}`);
const logWarning = (message) => {
  scriptWarnings++;
  console.log(`WARNING: ${message}`);
};
const logError = (message, fatal = false) => {
  scriptErrors++;
  console.log(`ERROR: ${message}`);
  if (!config.CONTINUE_ON_ERROR || fatal) {
    scriptSuccess = false;
    if (fatal) {
      console.log('FATAL ERROR: Exiting script.');
      process.exit(1);
    }
  }
};
const logSuccess = (message) => console.log(`SUCCESS: ${message}`);
const logDebug = (message) => config.DEBUG && console.log(`DEBUG: ${message}`);

// Cleanup function for script summary
process.on('exit', (code) => {
  console.log('\n=== SCRIPT SUMMARY ===\n');
  console.log(`Steps completed: ${completedSteps}/${totalSteps}`);
  console.log(`Warnings encountered: ${scriptWarnings}`);
  console.log(`Errors encountered: ${scriptErrors}`);
  console.log(`Overall status: ${scriptSuccess && code === 0 ? 'SUCCESS' : 'FAILED'}`);
});

// Axios instance with defaults
const api = axios.create({
  baseURL: config.DIRECTUS_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Function to make API requests with retries
async function makeApiRequest(method, url, data = null, token = null) {
  const maxRetries = 3;
  let retryCount = 0;
  let response;

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  logInfo(`API Request: ${method} ${url}`);
  if (config.DEBUG && data) logDebug(`Payload: ${JSON.stringify(data, null, 2)}`);

  while (retryCount < maxRetries) {
    try {
      const requestConfig = {
        method,
        url,
        headers,
      };

      if (data) {
        requestConfig.data = data;
      }

      response = await api(requestConfig);
      break;
    } catch (error) {
      const status = error.response?.status || 500;
      if (status >= 500 && status < 600 && retryCount < maxRetries - 1) {
        retryCount++;
        logWarning(`Server error (status ${status}). Retrying (${retryCount}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, retryCount * 2000));
        continue;
      }
      throw error;
    }
  }

  logInfo(`API Status: ${response.status}`);
  if (config.DEBUG) {
    logDebug(`API Response Body: ${JSON.stringify(response.data, null, 2)}`);
  } else if (response.data) {
    logDebug(`API Response Body (first 200 chars): ${JSON.stringify(response.data).slice(0, 200)}`);
  }

  await new Promise((resolve) => setTimeout(resolve, 100)); // Rate limiting
  return response;
}

// Workflow Collections Schemas
const LORE_SUBMISSIONS_SCHEMA = {
  collection: 'lore_submissions',
  meta: { icon: 'edit_note', hidden: false, singleton: false },
  schema: { name: 'lore_submissions' },
  fields: [
    { field: 'id', type: 'uuid', meta: { interface: 'input', readonly: true, hidden: true, special: ['uuid'] }, schema: { is_primary_key: true } },
    { field: 'token', type: 'uuid', meta: { interface: 'select-dropdown-m2o', required: true, special: ['m2o'], options: { template: '{{name}}' } }, schema: { is_nullable: false, foreign_key_table: 'meme_tokens' } },
    { field: 'submitted_by', type: 'uuid', meta: { interface: 'select-dropdown-m2o', required: true, special: ['m2o'], options: { template: '{{email}}' } }, schema: { is_nullable: false, foreign_key_table: 'directus_users' } },
    { field: 'lore_content', type: 'text', meta: { interface: 'textarea', required: true }, schema: { is_nullable: false } },
    { field: 'status', type: 'string', meta: { interface: 'select-dropdown', options: { choices: [{ text: 'Draft', value: 'draft' }, { text: 'Submitted', value: 'submitted' }, { text: 'Under Review', value: 'under_review' }, { text: 'Approved', value: 'approved' }, { text: 'Rejected', value: 'rejected' }], default_value: 'draft' } }, schema: { is_nullable: false, default_value: 'draft' } },
    { field: 'submission_date', type: 'timestamp', meta: { interface: 'datetime', special: ['date-created'] }, schema: { is_nullable: true } },
    { field: 'reviewed_by', type: 'uuid', meta: { interface: 'select-dropdown-m2o', special: ['m2o'], options: { template: '{{email}}' } }, schema: { is_nullable: true, foreign_key_table: 'directus_users' } },
    { field: 'review_date', type: 'timestamp', meta: { interface: 'datetime' }, schema: { is_nullable: true } },
    { field: 'review_notes', type: 'text', meta: { interface: 'textarea' }, schema: { is_nullable: true } }
  ]
};

const USER_LIKES_SCHEMA = {
  collection: 'user_likes',
  meta: { icon: 'favorite', hidden: false, singleton: false },
  schema: { name: 'user_likes' },
  fields: [
    { field: 'id', type: 'uuid', meta: { interface: 'input', readonly: true, hidden: true, special: ['uuid'] }, schema: { is_primary_key: true } },
    { field: 'user', type: 'uuid', meta: { interface: 'select-dropdown-m2o', required: true, special: ['m2o'], options: { template: '{{email}}' } }, schema: { is_nullable: false, foreign_key_table: 'directus_users' } },
    { field: 'token', type: 'uuid', meta: { interface: 'select-dropdown-m2o', required: true, special: ['m2o'], options: { template: '{{name}}' } }, schema: { is_nullable: false, foreign_key_table: 'meme_tokens' } },
    { field: 'created_at', type: 'timestamp', meta: { interface: 'datetime', special: ['date-created'] }, schema: { is_nullable: true } }
  ]
};

const TOKEN_VIEWS_SCHEMA = {
  collection: 'token_views',
  meta: { icon: 'visibility', hidden: false, singleton: false },
  schema: { name: 'token_views' },
  fields: [
    { field: 'id', type: 'uuid', meta: { interface: 'input', readonly: true, hidden: true, special: ['uuid'] }, schema: { is_primary_key: true } },
    { field: 'token', type: 'uuid', meta: { interface: 'select-dropdown-m2o', required: true, special: ['m2o'], options: { template: '{{name}}' } }, schema: { is_nullable: false, foreign_key_table: 'meme_tokens' } },
    { field: 'user', type: 'uuid', meta: { interface: 'select-dropdown-m2o', special: ['m2o'], options: { template: '{{email}}' } }, schema: { is_nullable: true, foreign_key_table: 'directus_users' } },
    { field: 'ip_address', type: 'string', meta: { interface: 'input' }, schema: { is_nullable: true } },
    { field: 'user_agent', type: 'string', meta: { interface: 'input' }, schema: { is_nullable: true } },
    { field: 'viewed_at', type: 'timestamp', meta: { interface: 'datetime', special: ['date-created'] }, schema: { is_nullable: true } }
  ]
};

const TOKEN_SOCIAL_LINKS_SCHEMA = {
  collection: 'token_social_links',
  meta: { icon: 'link', hidden: false, singleton: false },
  schema: { name: 'token_social_links' },
  fields: [
    { field: 'id', type: 'uuid', meta: { interface: 'input', readonly: true, hidden: true, special: ['uuid'] }, schema: { is_primary_key: true } },
    { field: 'token', type: 'uuid', meta: { interface: 'select-dropdown-m2o', required: true, special: ['m2o'], options: { template: '{{name}}' } }, schema: { is_nullable: false, foreign_key_table: 'meme_tokens' } },
    { field: 'platform', type: 'string', meta: { interface: 'select-dropdown', options: { choices: [{ text: 'Twitter', value: 'twitter' }, { text: 'Telegram', value: 'telegram' }, { text: 'Discord', value: 'discord' }, { text: 'Website', value: 'website' }], allow_other: true }, required: true }, schema: { is_nullable: false } },
    { field: 'url', type: 'string', meta: { interface: 'input', required: true }, schema: { is_nullable: false } },
    { field: 'handle', type: 'string', meta: { interface: 'input' }, schema: { is_nullable: true } },
    { field: 'verified', type: 'boolean', meta: { interface: 'boolean', default_value: false }, schema: { is_nullable: false, default_value: false } },
    { field: 'created_at', type: 'timestamp', meta: { interface: 'datetime', special: ['date-created'] }, schema: { is_nullable: true } }
  ]
};

// Function to create collection directly
async function createCollectionDirect(collectionName, collectionSchema, token) {
  logInfo(`Creating collection '${collectionName}' directly...`);
  
  try {
    await makeApiRequest('POST', '/collections', collectionSchema, token);
    logSuccess(`Collection '${collectionName}' created successfully.`);
    return true;
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.errors?.[0]?.extensions?.code === 'RECORD_NOT_UNIQUE') {
      logWarning(`Collection '${collectionName}' already exists, skipping...`);
      return true;
    } else {
      logError(`Failed to create collection '${collectionName}'. Status: ${error.response?.status || 'unknown'}. Response: ${JSON.stringify(error.response?.data || error.message)}`);
      return false;
    }
  }
}

// Function to add fields to collection
async function addFieldsToCollection(collectionName, fields, token) {
  logInfo(`Adding fields to collection '${collectionName}'...`);
  
  let successCount = 0;
  
  for (const field of fields) {
    const fieldName = field.field;
    const isPrimaryKey = field.schema?.is_primary_key || false;
    
    if (isPrimaryKey) {
      logInfo(`Field '${fieldName}' is a primary key. Skipping...`);
      continue;
    }
    
    try {
      await makeApiRequest('POST', `/fields/${collectionName}`, field, token);
      logSuccess(`Field '${fieldName}' created successfully.`);
      successCount++;
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.errors?.[0]?.extensions?.code === 'RECORD_NOT_UNIQUE') {
        logWarning(`Field '${fieldName}' already exists, skipping...`);
        successCount++;
      } else {
        logError(`Failed to create field '${fieldName}'. Status: ${error.response?.status || 'unknown'}. Response: ${JSON.stringify(error.response?.data || error.message)}`);
      }
    }
  }
  
  logSuccess(`Added ${successCount} fields to collection '${collectionName}'.`);
  return successCount;
}

// Main command functions
async function setupCollections() {
  logStep('1. Validating Configuration');
  
  // Validate configuration
  logInfo('Checking configuration...');
  logDebug(`DIRECTUS_URL: ${config.DIRECTUS_URL}`);
  logDebug(`ADMIN_TOKEN: ${config.ADMIN_TOKEN?.slice(0, 10)}...(truncated)`);
  
  if (!config.ADMIN_TOKEN) {
    logError('ADMIN_TOKEN is required in environment variables', true);
    return;
  }
  
  logSuccess('Configuration validated');
  
  // Collections to create
  const collections = [
    { name: 'lore_submissions', schema: LORE_SUBMISSIONS_SCHEMA },
    { name: 'user_likes', schema: USER_LIKES_SCHEMA },
    { name: 'token_views', schema: TOKEN_VIEWS_SCHEMA },
    { name: 'token_social_links', schema: TOKEN_SOCIAL_LINKS_SCHEMA }
  ];
  
  let successCount = 0;
  
  for (const collection of collections) {
    const stepNumber = collections.indexOf(collection) + 2;
    logStep(`${stepNumber}. Creating ${collection.name} Collection`);
    
    // Create collection
    const createSuccess = await createCollectionDirect(collection.name, collection.schema, config.ADMIN_TOKEN);
    
    if (createSuccess) {
      // Add fields
      await addFieldsToCollection(collection.name, collection.schema.fields, config.ADMIN_TOKEN);
      successCount++;
    }
  }
  
  if (successCount === collections.length) {
    logSuccess('All workflow collections setup completed successfully!');
  } else {
    logError(`Only ${successCount}/${collections.length} collections were created successfully`);
  }
}

// Show usage information
function showUsage() {
  console.log(`
Usage:
  node directus-workflow-collections-fixed.mjs setup   - Create all workflow collections
`);
}

// Main execution
async function main() {
  const command = process.argv[2];
  
  // Debug information
  if (config.DEBUG) {
    console.log('DEBUG: === DIRECTUS WORKFLOW COLLECTIONS SCRIPT ===');
    console.log(`DEBUG: Command: ${command || 'none'}`);
    console.log(`DEBUG: Node.js version: ${process.version}`);
    console.log(`DEBUG: Script started at: ${new Date().toISOString()}`);
    console.log(`DEBUG: DIRECTUS_URL: ${config.DIRECTUS_URL}`);
    console.log(`DEBUG: ADMIN_TOKEN: ${config.ADMIN_TOKEN?.slice(0, 10)}...(truncated)`);
    console.log('');
  }
  
  if (!command) {
    showUsage();
    process.exit(0);
  }
  
  switch (command) {
    case 'setup':
      await setupCollections();
      break;
    default:
      console.log(`Unknown command: ${command}`);
      showUsage();
      process.exit(1);
  }
}

// Handle unhandled errors
process.on('unhandledRejection', (error) => {
  logError(`Unhandled rejection: ${error.message}`, true);
});

process.on('uncaughtException', (error) => {
  logError(`Uncaught exception: ${error.message}`, true);
});

// Run the script
main().catch((error) => {
  logError(`Script failed: ${error.message}`, true);
});

