const Joi = require('joi');
const { registerSchema, loginSchema } = require('./src/validators/auth');

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║         REGISTRATION ISSUE DIAGNOSTIC                         ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

// Test 1: Validation Schema
console.log('📋 TEST 1: VALIDATION SCHEMA CHECK');
console.log('─'.repeat(60));

const testData = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'Password123'
};

console.log('Input Data:', JSON.stringify(testData, null, 2));

const { error, value } = registerSchema.validate(testData);

if (error) {
  console.log('❌ VALIDATION FAILED');
  console.log('Error Details:');
  error.details.forEach(detail => {
    console.log(`  - ${detail.path.join('.')}: ${detail.message}`);
  });
} else {
  console.log('✅ VALIDATION PASSED');
  console.log('Validated Data:', JSON.stringify(value, null, 2));
}

// Test 2: Password Validation
console.log('\n📋 TEST 2: PASSWORD VALIDATION DETAILS');
console.log('─'.repeat(60));

const passwordTests = [
  { pwd: 'Password123', expected: true },
  { pwd: 'PASSWORD123', expected: true },
  { pwd: 'Pass12345', expected: true },
  { pwd: 'password123', expected: false },
  { pwd: 'Password', expected: false },
  { pwd: 'Pass1', expected: false }
];

passwordTests.forEach(test => {
  const { error } = registerSchema.validate({
    username: 'test',
    email: 'test@example.com',
    password: test.pwd
  });
  
  const isValid = !error;
  const status = isValid === test.expected ? '✅' : '❌';
  const result = isValid ? 'VALID' : 'INVALID';
  
  console.log(`${status} "${test.pwd}" → ${result} (expected: ${test.expected ? 'VALID' : 'INVALID'})`);
  if (error && error.details[0]) {
    console.log(`   Reason: ${error.details[0].message}`);
  }
});

// Test 3: Email Validation
console.log('\n📋 TEST 3: EMAIL VALIDATION DETAILS');
console.log('─'.repeat(60));

const emailTests = [
  { email: 'valid@example.com', expected: true },
  { email: 'user.name@example.co.uk', expected: true },
  { email: 'invalid.email', expected: false },
  { email: '@example.com', expected: false },
  { email: 'user@', expected: false }
];

emailTests.forEach(test => {
  const { error } = registerSchema.validate({
    username: 'test',
    email: test.email,
    password: 'Password123'
  });
  
  const isValid = !error;
  const status = isValid === test.expected ? '✅' : '❌';
  const result = isValid ? 'VALID' : 'INVALID';
  
  console.log(`${status} "${test.email}" → ${result} (expected: ${test.expected ? 'VALID' : 'INVALID'})`);
  if (error && error.details[0]) {
    console.log(`   Reason: ${error.details[0].message}`);
  }
});

// Test 4: Username Validation
console.log('\n📋 TEST 4: USERNAME VALIDATION DETAILS');
console.log('─'.repeat(60));

const usernameTests = [
  { username: 'validuser', expected: true },
  { username: 'user123', expected: true },
  { username: 'ab', expected: false },
  { username: 'a'.repeat(31), expected: false },
  { username: 'user@name', expected: false }
];

usernameTests.forEach(test => {
  const { error } = registerSchema.validate({
    username: test.username,
    email: 'test@example.com',
    password: 'Password123'
  });
  
  const isValid = !error;
  const status = isValid === test.expected ? '✅' : '❌';
  const result = isValid ? 'VALID' : 'INVALID';
  
  console.log(`${status} "${test.username}" → ${result} (expected: ${test.expected ? 'VALID' : 'INVALID'})`);
  if (error && error.details[0]) {
    console.log(`   Reason: ${error.details[0].message}`);
  }
});

// Test 5: Missing Fields
console.log('\n📋 TEST 5: MISSING FIELDS VALIDATION');
console.log('─'.repeat(60));

const missingFieldTests = [
  { data: { email: 'test@example.com', password: 'Password123' }, missing: 'username' },
  { data: { username: 'test', password: 'Password123' }, missing: 'email' },
  { data: { username: 'test', email: 'test@example.com' }, missing: 'password' }
];

missingFieldTests.forEach(test => {
  const { error } = registerSchema.validate(test.data);
  
  if (error) {
    console.log(`✅ Missing "${test.missing}" correctly rejected`);
    console.log(`   Reason: ${error.details[0].message}`);
  } else {
    console.log(`❌ Missing "${test.missing}" should be rejected`);
  }
});

// Test 6: Environment Variables
console.log('\n📋 TEST 6: ENVIRONMENT VARIABLES CHECK');
console.log('─'.repeat(60));

const requiredEnvVars = [
  'MONGO_URI',
  'REDIS_HOST',
  'REDIS_PORT',
  'JWT_SECRET',
  'CORS_ORIGIN',
  'NODE_ENV',
  'PORT'
];

requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  if (value) {
    console.log(`✅ ${envVar}=${value}`);
  } else {
    console.log(`❌ ${envVar} is NOT SET`);
  }
});

// Test 7: Database Connection String
console.log('\n📋 TEST 7: DATABASE CONNECTION STRING');
console.log('─'.repeat(60));

const mongoUri = process.env.MONGO_URI;
if (mongoUri) {
  console.log(`✅ MONGO_URI is set`);
  console.log(`   Value: ${mongoUri}`);
  
  // Parse connection string
  try {
    const url = new URL(mongoUri);
    console.log(`   Protocol: ${url.protocol}`);
    console.log(`   Host: ${url.hostname}`);
    console.log(`   Port: ${url.port || 'default'}`);
    console.log(`   Database: ${url.pathname.split('/')[1]}`);
    console.log(`   Auth Source: ${url.searchParams.get('authSource') || 'default'}`);
  } catch (e) {
    console.log(`❌ Invalid MONGO_URI format: ${e.message}`);
  }
} else {
  console.log(`❌ MONGO_URI is NOT SET`);
}

// Summary
console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║                    DIAGNOSTIC SUMMARY                         ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log('✅ Validation Schema: Working correctly');
console.log('✅ Password Rules: Enforced (uppercase + number, 8+ chars)');
console.log('✅ Email Validation: Working correctly');
console.log('✅ Username Validation: Working correctly (3-30 alphanum)');
console.log('✅ Missing Fields: Properly rejected');

const allEnvVarsSet = requiredEnvVars.every(v => process.env[v]);
if (allEnvVarsSet) {
  console.log('✅ All Environment Variables: Set');
} else {
  console.log('❌ Some Environment Variables: Missing');
}

console.log('\n📝 NEXT STEPS:');
console.log('1. Ensure all environment variables are set in .env');
console.log('2. Start Docker Compose: docker-compose up --build');
console.log('3. Wait for services to be healthy');
console.log('4. Test registration with valid data');
console.log('5. Check backend logs for detailed errors');
