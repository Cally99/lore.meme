// working-flow-creator.js
const DIRECTUS_URL = 'http://localhost:8055';
const ADMIN_TOKEN = 'tZysSCeE3RsghJ1sX0Gr4idOrBgDGDG-';

// PROPER LOGGING
class Logger {
  static logRequest(method, endpoint, body = null) {
    console.log(`\n🔵 REQUEST: ${method} ${DIRECTUS_URL}/${endpoint}`);
    if (body) {
      console.log(`📤 BODY:`, JSON.stringify(body, null, 2));
    }
  }
  
  static logResponse(response, data) {
    console.log(`🔴 RESPONSE: ${response.status} ${response.statusText}`);
    console.log(`📥 DATA:`, JSON.stringify(data, null, 2));
  }
  
  static logError(error) {
    console.log(`💥 ERROR:`, error.message);
  }
}

async function makeRequest(endpoint, method = 'GET', body = null) {
  Logger.logRequest(method, endpoint, body);
  
  const options = {
    method,
    headers: { 
      'Authorization': `Bearer ${ADMIN_TOKEN}`,
      'Content-Type': 'application/json'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${DIRECTUS_URL}/${endpoint}`, options);
    
    let data;
    const text = await response.text();
    
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { raw_text: text };
      }
    } else {
      data = { empty_response: true };
    }
    
    Logger.logResponse(response, data);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
    }
    
    return data;
  } catch (error) {
    Logger.logError(error);
    throw error;
  }
}

async function createTestCollections() {
  console.log('\n🏗️  CREATING TEST COLLECTIONS WITH CORRECT API');
  
  // Create source collection with fields in one request
  const sourceCollection = {
    collection: 'test_source',
    fields: [
      {
        field: 'id',
        type: 'integer',
        meta: {
          hidden: true,
          interface: 'input',
          readonly: true
        },
        schema: {
          is_primary_key: true,
          has_auto_increment: true,
          is_nullable: false
        }
      },
      {
        field: 'title',
        type: 'string',
        meta: {
          interface: 'input',
          required: true
        },
        schema: {
          is_nullable: false,
          max_length: 255
        }
      },
      {
        field: 'content',
        type: 'text',
        meta: {
          interface: 'input-multiline',
          required: true
        },
        schema: {
          is_nullable: false
        }
      },
      {
        field: 'is_published',
        type: 'boolean',
        meta: {
          interface: 'boolean',
          default_value: false
        },
        schema: {
          is_nullable: false,
          default_value: false
        }
      },
      {
        field: 'author_name',
        type: 'string',
        meta: {
          interface: 'input'
        },
        schema: {
          is_nullable: true,
          max_length: 255
        }
      }
    ],
    meta: {
      collection: 'test_source',
      icon: 'edit',
      note: 'Source collection for testing',
      display_template: '{{title}}',
      hidden: false,
      singleton: false,
      accountability: 'all'
    },
    schema: {
      name: 'test_source'
    }
  };
  
  console.log('\n📝 Creating test_source collection...');
  const sourceResult = await makeRequest('collections', 'POST', sourceCollection);
  
  // Create target collection
  const targetCollection = {
    collection: 'test_target',
    fields: [
      {
        field: 'id',
        type: 'uuid',
        meta: {
          hidden: true,
          interface: 'input',
          readonly: true
        },
        schema: {
          is_primary_key: true,
          is_nullable: false
        }
      },
      {
        field: 'copied_title',
        type: 'string',
        meta: {
          interface: 'input'
        },
        schema: {
          is_nullable: true,
          max_length: 255
        }
      },
      {
        field: 'copied_content',
        type: 'text',
        meta: {
          interface: 'input-multiline'
        },
        schema: {
          is_nullable: true
        }
      },
      {
        field: 'original_author',
        type: 'string',
        meta: {
          interface: 'input'
        },
        schema: {
          is_nullable: true,
          max_length: 255
        }
      },
      {
        field: 'published_at',
        type: 'timestamp',
        meta: {
          interface: 'datetime'
        },
        schema: {
          is_nullable: true
        }
      },
      {
        field: 'source_id',
        type: 'integer',
        meta: {
          interface: 'input'
        },
        schema: {
          is_nullable: true
        }
      }
    ],
    meta: {
      collection: 'test_target',
      icon: 'publish',
      note: 'Target collection for testing',
      display_template: '{{copied_title}}',
      hidden: false,
      singleton: false,
      accountability: 'all'
    },
    schema: {
      name: 'test_target'
    }
  };
  
  console.log('\n📝 Creating test_target collection...');
  const targetResult = await makeRequest('collections', 'POST', targetCollection);
  
  console.log('\n✅ TEST COLLECTIONS CREATED SUCCESSFULLY');
  return { source: 'test_source', target: 'test_target' };
}

async function createTestFlow() {
  console.log('\n🔨 CREATING TEST FLOW');
  
  // Create flow
  const flowConfig = {
    name: 'Test Publisher Flow',
    icon: 'auto_awesome',
    color: '#4CAF50',
    description: 'Test flow: copies data when is_published becomes true',
    status: 'active',
    trigger: 'event',
    accountability: 'all',
    options: {
      type: 'action',
      scope: ['items.update'],
      collections: ['test_source']
    }
  };
  
  console.log('\n📝 Creating flow...');
  const flow = await makeRequest('flows', 'POST', flowConfig);
  const flowId = flow.data.id;
  
  // Create condition operation
  const conditionConfig = {
    flow: flowId,
    name: 'Check Published',
    key: 'check_published',
    type: 'condition',
    position_x: 100,
    position_y: 100,
    options: {
      filter: {
        is_published: {
          _eq: true
        }
      }
    }
  };
  
  console.log('\n📝 Creating condition operation...');
  const condition = await makeRequest('operations', 'POST', conditionConfig);
  
  // Create item-create operation
  const createConfig = {
    flow: flowId,
    name: 'Create Target Record',
    key: 'create_target',
    type: 'item-create',
    position_x: 200,
    position_y: 100,
    options: {
      collection: 'test_target',
      permissions: '$trigger',
      emitEvents: true,
      payload: {
        copied_title: '{{ $trigger.payload.title }}',
        copied_content: '{{ $trigger.payload.content }}',
        original_author: '{{ $trigger.payload.author_name }}',
        published_at: '{{ $now }}',
        source_id: '{{ $trigger.payload.id }}'
      }
    }
  };
  
  console.log('\n📝 Creating create operation...');
  const create = await makeRequest('operations', 'POST', createConfig);
  
  // Connect operations
  console.log('\n🔗 Connecting operations...');
  await makeRequest(`operations/${condition.data.id}`, 'PATCH', {
    resolve: create.data.id
  });
  
  console.log('\n✅ TEST FLOW CREATED SUCCESSFULLY');
  return flowId;
}

async function testTheFlow(flowId) {
  console.log('\n🧪 TESTING THE FLOW');
  
  // Create test record
  const testRecord = {
    title: 'Test Article',
    content: 'This content should be copied when published.',
    author_name: 'Test Author',
    is_published: false
  };
  
  console.log('\n📝 Creating test record...');
  const record = await makeRequest('items/test_source', 'POST', testRecord);
  const recordId = record.data.id;
  
  // Count target records before
  console.log('\n📊 Counting target records before...');
  const beforeCount = await makeRequest('items/test_target?aggregate[count]=*');
  const beforeTotal = beforeCount.data[0].count;
  console.log(`📊 Target records before: ${beforeTotal}`);
  
  // Trigger flow
  console.log('\n🚀 TRIGGERING FLOW - Setting is_published = true...');
  const updateResult = await makeRequest(`items/test_source/${recordId}`, 'PATCH', {
    is_published: true
  });
  
  // Monitor for success
  let success = false;
  console.log('\n⏳ Monitoring for 15 seconds...');
  
  for (let i = 1; i <= 30; i++) {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (i % 5 === 0) {
      console.log(`\n📊 Check ${i/2}s:`);
      
      const currentCount = await makeRequest('items/test_target?aggregate[count]=*');
      const currentTotal = currentCount.data[0].count;
      console.log(`   Target records: ${currentTotal}`);
      
      if (currentTotal > beforeTotal) {
        console.log(`🎉 SUCCESS! Flow worked after ${i/2} seconds`);
        success = true;
        
        // Get the created record
        const targetRecords = await makeRequest(`items/test_target?filter[source_id][_eq]=${recordId}`);
        if (targetRecords.data.length > 0) {
          const target = targetRecords.data[0];
          console.log('✅ Created target record:');
          console.log(`   ID: ${target.id}`);
          console.log(`   Title: ${target.copied_title}`);
          console.log(`   Author: ${target.original_author}`);
          console.log(`   Published: ${target.published_at}`);
        }
        break;
      }
    }
  }
  
  if (!success) {
    console.log('\n❌ FLOW FAILED');
    
    // Check activity
    const activity = await makeRequest('activity?sort=-timestamp&limit=5');
    console.log('\n📋 Recent activity:');
    activity.data.forEach(act => {
      console.log(`   ${act.timestamp} - ${act.action} ${act.collection}`);
    });
  }
  
  // Cleanup
  console.log('\n🧹 Cleaning up...');
  await makeRequest(`items/test_source/${recordId}`, 'DELETE');
  
  if (success) {
    const targetRecords = await makeRequest(`items/test_target?filter[source_id][_eq]=${recordId}`);
    for (const target of targetRecords.data) {
      await makeRequest(`items/test_target/${target.id}`, 'DELETE');
    }
  }
  
  return success;
}

async function cleanup() {
  console.log('\n🧹 CLEANING UP TEST DATA');
  
  try {
    // Delete test collections
    await makeRequest('collections/test_source', 'DELETE');
    await makeRequest('collections/test_target', 'DELETE');
  } catch (e) {
    console.log('⚠️  Cleanup warnings (expected if collections don\'t exist)');
  }
}

async function main() {
  console.log('🚀 WORKING FLOW CREATOR - PROPER DIRECTUS API');
  console.log('==============================================');
  
  try {
    await cleanup(); // Clean up first
    
    const collections = await createTestCollections();
    const flowId = await createTestFlow();
    const success = await testTheFlow(flowId);
    
    if (success) {
      console.log('\n🎉 FLOW TEST SUCCESSFUL!');
      console.log('✅ This proves flows work in your Directus');
      console.log('✅ The issue with your lore flow is in the configuration');
    } else {
      console.log('\n❌ FLOW TEST FAILED');
      console.log('💡 This indicates a deeper Directus issue');
    }
    
    // Clean up
    await makeRequest(`flows/${flowId}`, 'DELETE');
    await cleanup();
    
  } catch (error) {
    console.error('\n💥 SCRIPT FAILED:', error.message);
  }
}

main();
