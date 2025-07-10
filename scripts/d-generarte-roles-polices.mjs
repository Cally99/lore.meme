/* eslint-disable ... */
import { createDirectus, rest, authentication, readRoles, createRole, updateRole, readPolicies, createPolicy, readPermissions, createPermissions, updatePermissions, deletePermissions } from '@directus/sdk';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '.env') });

// Configuration
const DIRECTUS_CONFIG = {
  url: process.env.DIRECTUS_URL || 'http://localhost:8055',
  email: process.env.ADMIN_EMAIL || 'admin@example.com',
  password: process.env.ADMIN_PASSWORD || 'd1r3ctu5',
  debug: process.env.DEBUG === 'true'
};

// Global state
let directus;
let roleIdCache = new Map();
let policyIdCache = new Map();
let teamMemberRoleId = null;

// Logging utilities
const log = {
  info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
  warn: (msg) => console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`),
  error: (msg) => console.log(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
  debug: (msg) => DIRECTUS_CONFIG.debug && console.log(`\x1b[90m[DEBUG]\x1b[0m ${msg}`),
  step: (msg) => console.log(`\n\x1b[1m=== ${msg} ===\x1b[0m\n`)
};

// Role configurations for Web3 jobs board
const ROLES_CONFIG = [
  {
    role: {
      name: 'Public',
      description: 'Permissions for unauthenticated users browsing the job board',
      admin_access: false,
      app_access: false,
      icon: 'public',
    },
    policy: {
      name: 'Public Access Policy',
      permissions: [
        {
          collection: 'jobs',
          action: 'read',
          permissions: { status: { _eq: 'published' } },
          fields: ['id', 'title', 'description', 'company.name', 'category.name', 'skills.name', 'location', 'salary', 'posted_date', 'company.logo']
        },
        {
          collection: 'categories',
          action: 'read',
          fields: ['id', 'name', 'slug', 'type']
        },
        {
          collection: 'companies',
          action: 'read',
          fields: ['id', 'name', 'description', 'website', 'logo']
        },
        {
          collection: 'skills',
          action: 'read',
          fields: ['id', 'name', 'slug']
        },
        {
          collection: 'packages',
          action: 'read',
          fields: ['id', 'name', 'description', 'team_member_limit']
        }
      ],
    },
  },
  {
    role: {
      name: 'Employer Admin',
      description: 'Company owner with full control over their company, team, and job postings',
      admin_access: false,
      app_access: true,
      icon: 'business_center',
    },
    policy: {
      name: 'Employer Admin Policy',
      permissions: [
        // Own profile management
        {
          collection: 'user_profiles',
          action: 'read',
          permissions: { user: { _eq: '$CURRENT_USER' } },
          fields: ['*']
        },
        {
          collection: 'user_profiles',
          action: 'update',
          permissions: { user: { _eq: '$CURRENT_USER' } },
          fields: ['full_name', 'bio', 'civic_verification_status']
        },
        // Job management (company-scoped, subscription-gated)
        {
          collection: 'jobs',
          action: 'create',
          permissions: {
            company: { _eq: '$CURRENT_USER.profile.company' },
            'company.subscription_status': { _eq: 'active' }
          },
          fields: ['*']
        },
        {
          collection: 'jobs',
          action: 'read',
          permissions: { company: { _eq: '$CURRENT_USER.profile.company' } },
          fields: ['*']
        },
        {
          collection: 'jobs',
          action: 'update',
          permissions: { company: { _eq: '$CURRENT_USER.profile.company' } },
          fields: ['*']
        },
        {
          collection: 'jobs',
          action: 'delete',
          permissions: { company: { _eq: '$CURRENT_USER.profile.company' } }
        },
        // Application management
        {
          collection: 'job_applications',
          action: 'read',
          permissions: { job: { company: { _eq: '$CURRENT_USER.profile.company' } } },
          fields: ['*']
        },
        {
          collection: 'job_applications',
          action: 'update',
          permissions: { job: { company: { _eq: '$CURRENT_USER.profile.company' } } },
          fields: ['status']
        },
        // Chat system
        {
          collection: 'chat_rooms',
          action: 'create',
          permissions: { job_application: { job: { company: { _eq: '$CURRENT_USER.profile.company' } } } },
          fields: ['job_application', 'participants']
        },
        {
          collection: 'chat_rooms',
          action: 'read',
          permissions: { participants: { directus_users_id: { _eq: '$CURRENT_USER' } } },
          fields: ['*']
        },
        {
          collection: 'chat_messages',
          action: 'create',
          permissions: { chat_room: { participants: { directus_users_id: { _eq: '$CURRENT_USER' } } } },
          fields: ['content', 'sender', 'chat_room']
        },
        {
          collection: 'chat_messages',
          action: 'read',
          permissions: { chat_room: { participants: { directus_users_id: { _eq: '$CURRENT_USER' } } } },
          fields: ['*']
        },
        // Company management
        {
          collection: 'companies',
          action: 'read',
          permissions: { admin_user: { _eq: '$CURRENT_USER' } },
          fields: ['*']
        },
        {
          collection: 'companies',
          action: 'update',
          permissions: { admin_user: { _eq: '$CURRENT_USER' } },
          fields: ['name', 'description', 'website', 'logo', 'package', 'subscription_status']
        },
        // Team management
        {
          collection: 'directus_users',
          action: 'read',
          permissions: { 'profile.company': { _eq: '$CURRENT_USER.profile.company' } },
          fields: ['id', 'email', 'first_name', 'last_name', 'role', 'status', 'profile']
        },
        {
          collection: 'directus_users',
          action: 'update',
          permissions: {
            'profile.company': { _eq: '$CURRENT_USER.profile.company' },
            role: { _neq: '$ROLE.id' }
          },
          fields: ['role', 'status']
        },
        {
          collection: 'directus_users',
          action: 'create',
          validation: { role: { _in: ['$TEAM_MEMBER_ROLE_ID'] } },
          fields: ['email', 'password', 'first_name', 'last_name', 'role', 'status']
        },
        // Invitation management
        {
          collection: 'invitations',
          action: 'create',
          permissions: { company: { _eq: '$CURRENT_USER.profile.company' } },
          fields: ['*']
        },
        {
          collection: 'invitations',
          action: 'read',
          permissions: { company: { _eq: '$CURRENT_USER.profile.company' } },
          fields: ['*']
        },
        {
          collection: 'invitations',
          action: 'update',
          permissions: { company: { _eq: '$CURRENT_USER.profile.company' } },
          fields: ['status']
        }
      ],
    },
  },
  {
    role: {
      name: 'Team Member',
      description: 'Company team member with limited permissions for job management',
      admin_access: false,
      app_access: true,
      icon: 'group',
    },
    policy: {
      name: 'Team Member Policy',
      permissions: [
        // Own profile
        {
          collection: 'user_profiles',
          action: 'read',
          permissions: { user: { _eq: '$CURRENT_USER' } },
          fields: ['*']
        },
        {
          collection: 'user_profiles',
          action: 'update',
          permissions: { user: { _eq: '$CURRENT_USER' } },
          fields: ['full_name', 'bio']
        },
        // Job management (limited)
        {
          collection: 'jobs',
          action: 'create',
          permissions: {
            company: { _eq: '$CURRENT_USER.profile.company' },
            'company.subscription_status': { _eq: 'active' }
          },
          fields: ['title', 'description', 'category', 'skills', 'location', 'salary', 'status', 'company']
        },
        {
          collection: 'jobs',
          action: 'read',
          permissions: { company: { _eq: '$CURRENT_USER.profile.company' } },
          fields: ['*']
        },
        {
          collection: 'jobs',
          action: 'update',
          permissions: { company: { _eq: '$CURRENT_USER.profile.company' } },
          fields: ['title', 'description', 'category', 'skills', 'location', 'salary', 'status']
        },
        // Application handling
        {
          collection: 'job_applications',
          action: 'read',
          permissions: { job: { company: { _eq: '$CURRENT_USER.profile.company' } } },
          fields: ['*']
        },
        {
          collection: 'job_applications',
          action: 'update',
          permissions: { job: { company: { _eq: '$CURRENT_USER.profile.company' } } },
          fields: ['status']
        },
        // Chat access
        {
          collection: 'chat_rooms',
          action: 'read',
          permissions: { participants: { directus_users_id: { _eq: '$CURRENT_USER' } } },
          fields: ['*']
        },
        {
          collection: 'chat_messages',
          action: 'create',
          permissions: { chat_room: { participants: { directus_users_id: { _eq: '$CURRENT_USER' } } } },
          fields: ['content', 'sender', 'chat_room']
        },
        {
          collection: 'chat_messages',
          action: 'read',
          permissions: { chat_room: { participants: { directus_users_id: { _eq: '$CURRENT_USER' } } } },
          fields: ['*']
        },
        // Company info (read-only)
        {
          collection: 'companies',
          action: 'read',
          permissions: { id: { _eq: '$CURRENT_USER.profile.company' } },
          fields: ['name', 'logo', 'description', 'website']
        }
      ],
    },
  },
  {
    role: {
      name: 'Applicant',
      description: 'Job seeker who can apply for positions and manage their profile',
      admin_access: false,
      app_access: true,
      icon: 'person_search',
    },
    policy: {
      name: 'Applicant Policy',
      permissions: [
        // Profile management
        {
          collection: 'user_profiles',
          action: 'create',
          permissions: { user: { _eq: '$CURRENT_USER' } },
          fields: ['*']
        },
        {
          collection: 'user_profiles',
          action: 'read',
          permissions: { user: { _eq: '$CURRENT_USER' } },
          fields: ['*']
        },
        {
          collection: 'user_profiles',
          action: 'update',
          permissions: { user: { _eq: '$CURRENT_USER' } },
          fields: ['full_name', 'bio', 'portfolio_url', 'civic_verification_status']
        },
        // Job applications
        {
          collection: 'job_applications',
          action: 'create',
          permissions: { applicant: { _eq: '$CURRENT_USER' } },
          fields: ['job', 'cover_letter', 'resume']
        },
        {
          collection: 'job_applications',
          action: 'read',
          permissions: { applicant: { _eq: '$CURRENT_USER' } },
          fields: ['*']
        },
        {
          collection: 'job_applications',
          action: 'update',
          permissions: {
            applicant: { _eq: '$CURRENT_USER' },
            status: { _neq: 'hired' }
          },
          fields: ['cover_letter', 'resume']
        },
        // Job browsing
        {
          collection: 'jobs',
          action: 'read',
          permissions: { status: { _eq: 'published' } },
          fields: ['*']
        },
        // Company information
        {
          collection: 'companies',
          action: 'read',
          fields: ['name', 'logo', 'website', 'description']
        },
        // Chat system
        {
          collection: 'chat_rooms',
          action: 'read',
          permissions: { participants: { directus_users_id: { _eq: '$CURRENT_USER' } } },
          fields: ['*']
        },
        {
          collection: 'chat_messages',
          action: 'create',
          permissions: { chat_room: { participants: { directus_users_id: { _eq: '$CURRENT_USER' } } } },
          fields: ['content', 'sender', 'chat_room']
        },
        {
          collection: 'chat_messages',
          action: 'read',
          permissions: { chat_room: { participants: { directus_users_id: { _eq: '$CURRENT_USER' } } } },
          fields: ['*']
        },
        // Reference data
        {
          collection: 'categories',
          action: 'read',
          fields: ['*']
        },
        {
          collection: 'skills',
          action: 'read',
          fields: ['*']
        }
      ],
    },
  }
];

/**
 * Initialize Directus client and authenticate
 */
async function initializeDirectus() {
  try {
    log.step('Initializing Directus Connection');
    
    directus = createDirectus(DIRECTUS_CONFIG.url)
      .with(rest())
      .with(authentication('json'));

    log.info(`Connecting to: ${DIRECTUS_CONFIG.url}`);
    log.info(`Admin user: ${DIRECTUS_CONFIG.email}`);
    
    await directus.login(DIRECTUS_CONFIG.email, DIRECTUS_CONFIG.password);
    log.success('Successfully authenticated with Directus');
    
    return true;
  } catch (error) {
    log.error(`Failed to initialize Directus: ${error.message}`);
    
return false;
  }
}

/**
 * Get role ID by name, with caching
 */
async function getRoleId(roleName) {
  if (roleIdCache.has(roleName)) {
    return roleIdCache.get(roleName);
  }

  try {
    const roles = await directus.request(
      readRoles({
        filter: { name: { _eq: roleName } },
        fields: ['id'],
        limit: 1
      })
    );

    if (roles.length > 0) {
      const roleId = roles[0].id;

      roleIdCache.set(roleName, roleId);
      
return roleId;
    }
    
    return null;
  } catch (error) {
    log.error(`Failed to fetch role ID for "${roleName}": ${error.message}`);
    
return null;
  }
}

/**
 * Get policy ID by name, with caching
 */
async function getPolicyId(policyName) {
  if (policyIdCache.has(policyName)) {
    return policyIdCache.get(policyName);
  }

  try {
    const policies = await directus.request(
      readPolicies({
        filter: { name: { _eq: policyName } },
        fields: ['id'],
        limit: 1
      })
    );

    if (policies.length > 0) {
      const policyId = policies[0].id;

      policyIdCache.set(policyName, policyId);
      
return policyId;
    }
    
    return null;
  } catch (error) {
    log.error(`Failed to fetch policy ID for "${policyName}": ${error.message}`);
    
return null;
  }
}

/**
 * Create or update a role
 */
async function syncRole(roleConfig) {
  const { name } = roleConfig;

  log.info(`Processing role: ${name}`);

  try {
    let roleId = await getRoleId(name);

    if (roleId) {
      log.debug(`Role "${name}" exists with ID: ${roleId}, updating...`);
      await directus.request(updateRole(roleId, roleConfig));
      log.success(`Updated role: ${name}`);
    } else {
      log.debug(`Creating new role: ${name}`);
      const result = await directus.request(createRole(roleConfig));

      roleId = result.id;
      roleIdCache.set(name, roleId);
      log.success(`Created role: ${name} (ID: ${roleId})`);
    }

    // Cache team member role ID for permissions
    if (name === 'Team Member') {
      teamMemberRoleId = roleId;
      log.debug(`Cached Team Member role ID: ${teamMemberRoleId}`);
    }

    return roleId;
  } catch (error) {
    log.error(`Failed to sync role "${name}": ${error.message}`);
    throw error;
  }
}

/**
 * Create or update a policy
 */
async function syncPolicy(policyConfig, roleId) {
  const { name } = policyConfig;

  log.info(`Processing policy: ${name}`);

  try {
    let policyId = await getPolicyId(name);
    const policyPayload = { name };

    if (policyId) {
      log.debug(`Policy "${name}" exists with ID: ${policyId}`);
    } else {
      log.debug(`Creating new policy: ${name}`);
      const result = await directus.request(createPolicy(policyPayload));

      policyId = result.id;
      policyIdCache.set(name, policyId);
      log.success(`Created policy: ${name} (ID: ${policyId})`);
    }

    return policyId;
  } catch (error) {
    log.error(`Failed to sync policy "${name}": ${error.message}`);
    throw error;
  }
}

/**
 * Sync permissions for a policy
 */
async function syncPermissions(policyId, policyName, permissionsConfig) {
  log.info(`Syncing permissions for policy: ${policyName}`);

  try {
    // Get existing permissions
    const existingPermissions = await directus.request(
      readPermissions({
        filter: { policy: { _eq: policyId } },
        fields: ['id', 'collection', 'action', 'permissions', 'validation', 'presets', 'fields'],
        limit: -1
      })
    );

    const existingPermsMap = new Map(
      existingPermissions.map(p => [`${p.collection}-${p.action}`, p])
    );

    const permsToCreate = [];
    const permsToUpdate = [];
    const targetPermSignatures = new Set();

    // Process each permission configuration
    for (let permConfig of permissionsConfig) {
      // Replace placeholder values
      let permConfigString = JSON.stringify(permConfig);

      if (teamMemberRoleId && permConfigString.includes('$TEAM_MEMBER_ROLE_ID')) {
        permConfigString = permConfigString.replace(/"\$TEAM_MEMBER_ROLE_ID"/g, `"${teamMemberRoleId}"`);
      }
      permConfig = JSON.parse(permConfigString);

      // Handle 'manage' action (creates CRUD permissions)
      const actions = permConfig.action === 'manage' 
        ? ['create', 'read', 'update', 'delete'] 
        : [permConfig.action];

      for (const action of actions) {
        const signature = `${permConfig.collection}-${action}`;

        targetPermSignatures.add(signature);

        const payload = {
          policy: policyId,
          collection: permConfig.collection,
          action,
          permissions: permConfig.permissions || {},
          validation: permConfig.validation || {},
          presets: permConfig.presets || {},
          fields: permConfig.fields || null,
        };

        const existingPerm = existingPermsMap.get(signature);

        if (existingPerm) {
          // Check if update is needed
          const needsUpdate = Object.keys(payload).some(key => {
            if (key === 'policy') return false;
            if (typeof payload[key] === 'object' && payload[key] !== null && 
                typeof existingPerm[key] === 'object' && existingPerm[key] !== null) {
              return JSON.stringify(payload[key]) !== JSON.stringify(existingPerm[key]);
            }
            
return payload[key] !== existingPerm[key];
          });

          if (needsUpdate) {
            permsToUpdate.push({ id: existingPerm.id, ...payload });
          }
        } else {
          permsToCreate.push(payload);
        }
      }
    }

    // Find permissions to delete
    const idsToDelete = existingPermissions
      .filter(p => !targetPermSignatures.has(`${p.collection}-${p.action}`))
      .map(p => p.id);

    // Execute permission changes
    if (permsToCreate.length > 0) {
      log.debug(`Creating ${permsToCreate.length} new permissions`);
      await directus.request(createPermissions(permsToCreate));
    }

    if (permsToUpdate.length > 0) {
      log.debug(`Updating ${permsToUpdate.length} permissions`);
      for (const perm of permsToUpdate) {
        const { id, ...updateData } = perm;

        await directus.request(updatePermissions(id, updateData));
      }
    }

    if (idsToDelete.length > 0) {
      log.debug(`Deleting ${idsToDelete.length} stale permissions`);
      await directus.request(deletePermissions(idsToDelete));
    }

    const totalChanges = permsToCreate.length + permsToUpdate.length + idsToDelete.length;

    if (totalChanges > 0) {
      log.success(`Updated ${totalChanges} permissions for policy "${policyName}"`);
    } else {
      log.info(`No permission changes needed for policy "${policyName}"`);
    }

  } catch (error) {
    log.error(`Failed to sync permissions for policy "${policyName}": ${error.message}`);
    throw error;
  }
}

/**
 * Main execution function
 */
async function main() {
  log.step('Directus 11.8.0 Role & Policy Creator');
  log.info('Creating roles, policies, and permissions for Web3 jobs board');
  log.info(`Node.js version: ${process.version}`);
  log.info(`ES Modules: ${import.meta.url ? 'Enabled' : 'Disabled'}`);

  try {
    // Initialize connection
    const connected = await initializeDirectus();

    if (!connected) {
      process.exit(1);
    }

    // Process each role configuration
    log.step('Creating Roles and Policies');
    
    for (const config of ROLES_CONFIG) {
      try {
        log.info(`\n--- Processing: ${config.role.name} ---`);
        
        // 1. Create/update role
        const roleId = await syncRole(config.role);
        
        // 2. Create/update policy
        const policyId = await syncPolicy(config.policy, roleId);
        
        // 3. Sync permissions
        if (config.policy.permissions) {
          await syncPermissions(policyId, config.policy.name, config.policy.permissions);
        }
        
        log.success(`Completed: ${config.role.name}`);
        
      } catch (error) {
        log.error(`Failed to process "${config.role.name}": ${error.message}`);
        if (!DIRECTUS_CONFIG.debug) {
          log.info('Enable DEBUG=true for detailed error information');
        }
      }
    }

    // Summary
    log.step('Setup Complete');
    log.success('✅ All roles, policies, and permissions have been created/updated');
    log.info('📝 Manual steps remaining:');
    log.info('   1. Link policies to roles in Directus Admin UI');
    log.info('   2. Configure Civic Pass integration');
    log.info('   3. Set up company subscription validation');
    log.info('   4. Test role permissions with sample users');
    
    console.log('\n🎉 Ready for your Web3 jobs board with KYC support!');

  } catch (error) {
    log.error(`Script execution failed: ${error.message}`);
    if (DIRECTUS_CONFIG.debug) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Execute if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main, ROLES_CONFIG, initializeDirectus };