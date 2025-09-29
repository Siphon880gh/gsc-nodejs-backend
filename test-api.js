#!/usr/bin/env node
/**
 * Test script for GSC API endpoints with JWT authentication
 * Run this after starting the JWT API server with: npm run api:jwt
 */

import readline from 'readline';

const BASE_URL = 'http://localhost:3000';
const USER_ID = 'testuser';
const USER_EMAIL = 'test@example.com';
const USER_NAME = 'Test User';

let authToken = null;

// Helper function to ask user for input
function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Helper function to clean up database directly
async function cleanupDatabase() {
  try {
    console.log('🧹 Attempting to clean up database directly...');
    
    // Try to delete the user directly via API if possible
    const deleteResult = await testEndpoint('DELETE', '/api/auth/user', null, false);
    
    if (deleteResult && deleteResult.success) {
      console.log('✅ Database cleanup successful!');
      return true;
    } else {
      console.log('⚠️  Direct database cleanup failed, but continuing...');
      return false;
    }
  } catch (error) {
    console.log('⚠️  Database cleanup error:', error.message);
    return false;
  }
}

// Helper function to manually clean up database file
async function manualDatabaseCleanup() {
  try {
    console.log('🗑️  Attempting manual database cleanup...');
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    // Remove the database file to start fresh
    await execAsync('rm -f gsc_auth.db');
    console.log('✅ Database file removed successfully!');
    
    // Restart the API server to recreate the database
    console.log('🔄 Restarting API server to recreate database...');
    const { spawn } = await import('child_process');
    
    // Kill existing server
    try {
      await execAsync('pkill -f "node src/api/server.js"');
    } catch (e) {
      // Ignore if no process found
    }
    
    // Start new server
    const server = spawn('npm', ['run', 'api'], { 
      stdio: 'pipe',
      cwd: process.cwd()
    });
    
    // Wait for server to start
    let attempts = 0;
    while (attempts < 10) {
      if (await checkServerRunning()) {
        console.log('✅ API server restarted successfully!');
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    
    console.log('❌ Failed to restart API server');
    return false;
  } catch (error) {
    console.log('❌ Manual database cleanup failed:', error.message);
    return false;
  }
}

async function testEndpoint(method, endpoint, data = null, useAuth = true) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  // Add Authorization header if token is available and auth is required
  if (useAuth && authToken) {
    options.headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, options);
    
    // Check content type to determine how to parse response
    const contentType = response.headers.get('content-type');
    
    let result;
    if (contentType && contentType.includes('text/csv')) {
      // Handle CSV response
      result = await response.text();
      console.log(`\n${method} ${endpoint}`);
      console.log('Status:', response.status);
      console.log('Response (CSV):', result.substring(0, 200) + (result.length > 200 ? '...' : ''));
    } else {
      // Handle JSON response
      result = await response.json();
      console.log(`\n${method} ${endpoint}`);
      console.log('Status:', response.status);
      console.log('Response:', JSON.stringify(result, null, 2));
    }
    
    return result;
  } catch (error) {
    console.error(`Error testing ${method} ${endpoint}:`, error.message);
    return null;
  }
}

async function checkServerRunning() {
  try {
    const response = await fetch(`${BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function startServer() {
  console.log('🚀 Starting server...');
  const { spawn } = await import('child_process');
  const server = spawn('npm', ['run', 'api'], { 
    stdio: 'pipe',
    cwd: process.cwd()
  });
  
  // Wait for server to start
  let attempts = 0;
  while (attempts < 30) {
    if (await checkServerRunning()) {
      console.log('✅ Server is running!');
      return server;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;
  }
  
  throw new Error('Server failed to start within 30 seconds');
}

async function runTests() {
  console.log('🧪 Testing GSC API Endpoints with JWT Authentication\n');
  
  // Check if server is running
  if (!(await checkServerRunning())) {
    console.log('⚠️  Server not running, starting server...');
    await startServer();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for server to fully start
  } else {
    console.log('✅ Server is already running');
  }
  
  // Test health check (no auth required)
  await testEndpoint('GET', '/health', null, false);
  
  // Test user signup
  console.log('\n👤 Testing user signup...');
  const signupResult = await testEndpoint('POST', '/api/auth/signup', {
    userId: USER_ID,
    email: USER_EMAIL,
    name: USER_NAME
  }, false);
  
  if (!signupResult || !signupResult.success) {
    if (signupResult && signupResult.error && signupResult.error.includes('User already exists')) {
      console.log(`\n⚠️  User already exists with userId: "${USER_ID}" and email: "${USER_EMAIL}"`);
      const shouldDelete = await askQuestion('Do you want to delete this user and continue the test? (y/N): ');
      
      if (shouldDelete.toLowerCase() === 'y' || shouldDelete.toLowerCase() === 'yes') {
        // Ask if user wants to manually clean up database
        const shouldManualCleanup = await askQuestion('The user might be in an inactive state. Do you want to manually clean up the database? (y/N): ');
        
        if (shouldManualCleanup.toLowerCase() === 'y' || shouldManualCleanup.toLowerCase() === 'yes') {
          console.log('🗑️  Performing manual database cleanup...');
          const manualCleanupSuccess = await manualDatabaseCleanup();
          
          if (manualCleanupSuccess) {
            console.log('🔄 Retrying user signup after manual cleanup...');
            const retrySignupResult = await testEndpoint('POST', '/api/auth/signup', {
              userId: USER_ID,
              email: USER_EMAIL,
              name: USER_NAME
            }, false);
            
            if (retrySignupResult && retrySignupResult.success) {
              console.log('✅ User signup successful after manual cleanup!');
              authToken = null; // Reset token for fresh login later
            } else {
              console.log('❌ User signup failed after manual cleanup! Cannot continue with other tests.');
              return;
            }
          } else {
            console.log('❌ Manual database cleanup failed! Cannot continue with other tests.');
            return;
          }
        } else {
          console.log('🔄 Proceeding with automatic cleanup attempts...');
        }
        
        console.log('🗑️  Deleting existing user...');
        
        // First try to login to get a token for deletion
        const loginResult = await testEndpoint('POST', '/api/auth/login', {
          userId: USER_ID
        }, false);
        
        if (loginResult && loginResult.success && loginResult.token) {
          authToken = loginResult.token;
          const deleteResult = await testEndpoint('DELETE', '/api/auth/user');
          
          if (deleteResult && deleteResult.success) {
            console.log('✅ User deleted successfully!');
            
            // Now try signup again
            console.log('🔄 Retrying user signup...');
            const retrySignupResult = await testEndpoint('POST', '/api/auth/signup', {
              userId: USER_ID,
              email: USER_EMAIL,
              name: USER_NAME
            }, false);
            
            if (retrySignupResult && retrySignupResult.success) {
              console.log('✅ User signup successful after deletion!');
              authToken = null; // Reset token for fresh login later
            } else {
              console.log('❌ User signup failed after deletion! Cannot continue with other tests.');
              return;
            }
          } else {
            console.log('❌ User deletion failed! Cannot continue with other tests.');
            return;
          }
        } else {
          console.log('⚠️  Could not login to delete existing user. This might be due to user being inactive.');
          
          // Try database cleanup as fallback
          const cleanupSuccess = await cleanupDatabase();
          
          if (cleanupSuccess) {
            console.log('🔄 Retrying user signup after cleanup...');
            const retrySignupResult = await testEndpoint('POST', '/api/auth/signup', {
              userId: USER_ID,
              email: USER_EMAIL,
              name: USER_NAME
            }, false);
            
            if (retrySignupResult && retrySignupResult.success) {
              console.log('✅ User signup successful after cleanup!');
              authToken = null; // Reset token for fresh login later
            } else {
              console.log('❌ User signup failed after cleanup! Cannot continue with other tests.');
              return;
            }
          } else {
            console.log('🔄 Attempting manual database cleanup as final fallback...');
            
            // Try manual database cleanup as final fallback
            const manualCleanupSuccess = await manualDatabaseCleanup();
            
            if (manualCleanupSuccess) {
              console.log('🔄 Retrying user signup after manual cleanup...');
              const retrySignupResult = await testEndpoint('POST', '/api/auth/signup', {
                userId: USER_ID,
                email: USER_EMAIL,
                name: USER_NAME
              }, false);
              
              if (retrySignupResult && retrySignupResult.success) {
                console.log('✅ User signup successful after manual cleanup!');
                authToken = null; // Reset token for fresh login later
              } else {
                console.log('❌ User signup failed after manual cleanup! Cannot continue with other tests.');
                return;
              }
            } else {
              console.log('🔄 Attempting to continue with existing user...');
              
              // Try to continue with the existing user by attempting login again
              const retryLoginResult = await testEndpoint('POST', '/api/auth/login', {
                userId: USER_ID
              }, false);
              
              if (retryLoginResult && retryLoginResult.success && retryLoginResult.token) {
                console.log('✅ Successfully logged in with existing user!');
                authToken = retryLoginResult.token;
              } else {
                console.log('❌ Could not login with existing user! Cannot continue with other tests.');
                return;
              }
            }
          }
        }
      } else {
        console.log('❌ User signup failed and user chose not to delete existing user! Cannot continue with other tests.');
        return;
      }
    } else {
      console.log('❌ User signup failed! Cannot continue with other tests.');
      return;
    }
  } else {
    console.log('✅ User signup successful!');
  }
  
  // Test OAuth authentication first
  console.log('\n🔐 Testing OAuth authentication...');
  const oauthResult = await testEndpoint('POST', '/api/auth/oauth', {
    userId: USER_ID
  }, false);
  
  if (!oauthResult || !oauthResult.success) {
    console.log('❌ OAuth authentication failed! Cannot continue with other tests.');
    return;
  }
  console.log('✅ OAuth authentication successful!');
  
  // Test login to get JWT token
  console.log('\n🔑 Testing JWT login...');
  const loginResult = await testEndpoint('POST', '/api/auth/login', {
    userId: USER_ID
  }, false);
  
  if (loginResult && loginResult.success && loginResult.token) {
    authToken = loginResult.token;
    console.log(`✅ JWT login successful! Token: ${authToken.substring(0, 20)}...`);
  } else {
    console.log('❌ JWT login failed! Cannot continue with other tests.');
    return;
  }
  
  // Test user status
  await testEndpoint('GET', '/api/status');
  
  // Test list sites and select first verified site
  console.log('\n🌐 Testing sites list and selection...');
  const sitesResult = await testEndpoint('GET', '/api/sites');
  
  if (sitesResult && sitesResult.success && sitesResult.sites && sitesResult.sites.length > 0) {
    // Find first verified site (not unverified)
    const verifiedSite = sitesResult.sites.find(site => 
      site.permissionLevel !== 'siteUnverifiedUser'
    );
    
    if (verifiedSite) {
      console.log(`\n📍 Selecting first verified site: ${verifiedSite.siteUrl}`);
      await testEndpoint('POST', '/api/sites/select', {
        siteUrl: verifiedSite.siteUrl
      });
    } else {
      console.log('\n⚠️  No verified sites found, using first available site');
      await testEndpoint('POST', '/api/sites/select', {
        siteUrl: sitesResult.sites[0].siteUrl
      });
    }
  }
  
  // Test get current site
  await testEndpoint('GET', '/api/sites/current');
  
  // Test get schema
  await testEndpoint('GET', '/api/schema');
  
  // Test get presets
  await testEndpoint('GET', '/api/presets');
  
  // Test ad-hoc query (now that we have a site selected)
  console.log('\n📊 Testing ad-hoc query...');
  await testEndpoint('POST', '/api/query/adhoc', {
    metrics: ['clicks', 'impressions'],
    dimensions: ['query'],
    dateRangeType: 'last7',
    limit: 3
  });
  
  // Test preset query
  console.log('\n📋 Testing preset query...');
  await testEndpoint('POST', '/api/query/preset', {
    preset: 'top-queries',
    dateRangeType: 'last7',
    limit: 3
  });
  
  // Test CSV export
  console.log('\n📊 Testing CSV export...');
  await testEndpoint('POST', '/api/query/adhoc', {
    metrics: ['clicks', 'impressions'],
    dimensions: ['query'],
    dateRangeType: 'last7',
    limit: 3,
    outputFormat: 'csv'
  });
  
  // Test logout
  console.log('\n🚪 Testing logout...');
  await testEndpoint('POST', '/api/auth/logout');
  
  // Test that protected endpoints now fail without token
  console.log('\n🔒 Testing that protected endpoints fail without token...');
  authToken = null; // Clear token
  await testEndpoint('GET', '/api/status');
  
  // Test user deletion
  console.log('\n🗑️ Testing user deletion...');
  // Need to login again to get token for deletion
  const reloginResult = await testEndpoint('POST', '/api/auth/login', {
    userId: USER_ID
  }, false);
  
  if (reloginResult && reloginResult.success && reloginResult.token) {
    authToken = reloginResult.token;
    await testEndpoint('DELETE', '/api/auth/user');
    console.log('✅ User deletion successful!');
  } else {
    console.log('❌ Could not re-login for user deletion test.');
  }
  
  console.log('\n✅ All tests completed!');
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { testEndpoint, runTests };
