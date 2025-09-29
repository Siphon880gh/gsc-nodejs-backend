#!/usr/bin/env node
/**
 * Test script for GSC API endpoints with JWT authentication
 * Run this after starting the JWT API server with: npm run api:jwt
 */

const BASE_URL = 'http://localhost:3000';
const USER_ID = 'testuser';
const USER_EMAIL = 'test@example.com';
const USER_NAME = 'Test User';

let authToken = null;

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
    const result = await response.json();
    console.log(`\n${method} ${endpoint}`);
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
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
    console.log('❌ User signup failed! Cannot continue with other tests.');
    return;
  }
  console.log('✅ User signup successful!');
  
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
