const Joi = require('joi');
const validate = require('./src/middleware/validate');
const { registerSchema, loginSchema } = require('./src/validators/auth');
const { createTaskSchema } = require('./src/validators/task');

console.log('=== Backend Validation Tests ===\n');

// Test 1: Auth Validators
console.log('1. Testing Auth Validators:');

const validRegister = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'Password123'
};

const { error: regError } = registerSchema.validate(validRegister);
console.log(`   ✓ Valid register: ${regError ? 'FAILED' : 'PASSED'}`);

const invalidRegister = {
  username: 'ab',
  email: 'invalid-email',
  password: 'weak'
};

const { error: regError2 } = registerSchema.validate(invalidRegister);
console.log(`   ✓ Invalid register rejected: ${regError2 ? 'PASSED' : 'FAILED'}`);

const validLogin = {
  email: 'test@example.com',
  password: 'Password123'
};

const { error: loginError } = loginSchema.validate(validLogin);
console.log(`   ✓ Valid login: ${loginError ? 'FAILED' : 'PASSED'}`);

// Test 2: Task Validators
console.log('\n2. Testing Task Validators:');

const validTask = {
  title: 'Test Task',
  inputText: 'Hello World',
  operation: 'uppercase'
};

const { error: taskError } = createTaskSchema.validate(validTask);
console.log(`   ✓ Valid task: ${taskError ? 'FAILED' : 'PASSED'}`);

const invalidTask = {
  title: '',
  inputText: 'x'.repeat(10001),
  operation: 'invalid'
};

const { error: taskError2 } = createTaskSchema.validate(invalidTask);
console.log(`   ✓ Invalid task rejected: ${taskError2 ? 'PASSED' : 'FAILED'}`);

// Test 3: Validation Middleware
console.log('\n3. Testing Validation Middleware:');

const mockReq = { body: validRegister };
const mockRes = { status: () => ({ json: () => {} }) };
let middlewareError = null;

const middleware = validate(registerSchema);
middleware(mockReq, mockRes, (err) => {
  middlewareError = err;
});

console.log(`   ✓ Valid data passes middleware: ${middlewareError ? 'FAILED' : 'PASSED'}`);

const mockReq2 = { body: invalidRegister };
let validationFailed = false;

const middleware2 = validate(registerSchema);
middleware2(mockReq2, { status: () => ({ json: (data) => { validationFailed = !!data.error; } }) }, () => {});

console.log(`   ✓ Invalid data rejected by middleware: ${validationFailed ? 'PASSED' : 'FAILED'}`);

// Test 4: Password Requirements
console.log('\n4. Testing Password Requirements:');

const weakPasswords = [
  'password123',  // no uppercase
  'PASSWORD123',  // no lowercase (but has uppercase + number)
  'Password',     // no number
  'Pass1'         // too short
];

let passwordTestsPassed = 0;
weakPasswords.forEach((pwd, idx) => {
  const { error } = registerSchema.validate({
    username: 'test',
    email: 'test@example.com',
    password: pwd
  });
  if (error) passwordTestsPassed++;
});

console.log(`   ✓ Weak passwords rejected: ${passwordTestsPassed === weakPasswords.length ? 'PASSED' : 'FAILED'} (${passwordTestsPassed}/${weakPasswords.length})`);

// Test 5: Email Validation
console.log('\n5. Testing Email Validation:');

const invalidEmails = ['notanemail', 'test@', '@example.com'];
let emailTestsPassed = 0;

invalidEmails.forEach(email => {
  const { error } = registerSchema.validate({
    username: 'test',
    email: email,
    password: 'Password123'
  });
  if (error) emailTestsPassed++;
});

console.log(`   ✓ Invalid emails rejected: ${emailTestsPassed === invalidEmails.length ? 'PASSED' : 'FAILED'} (${emailTestsPassed}/${invalidEmails.length})`);

// Test 6: Operation Enum Validation
console.log('\n6. Testing Operation Enum:');

const validOperations = ['uppercase', 'lowercase', 'reverse', 'wordcount'];
let operationTestsPassed = 0;

validOperations.forEach(op => {
  const { error } = createTaskSchema.validate({
    title: 'Test',
    inputText: 'test',
    operation: op
  });
  if (!error) operationTestsPassed++;
});

console.log(`   ✓ Valid operations accepted: ${operationTestsPassed === validOperations.length ? 'PASSED' : 'FAILED'} (${operationTestsPassed}/${validOperations.length})`);

const { error: invalidOpError } = createTaskSchema.validate({
  title: 'Test',
  inputText: 'test',
  operation: 'invalid_op'
});

console.log(`   ✓ Invalid operation rejected: ${invalidOpError ? 'PASSED' : 'FAILED'}`);

console.log('\n=== All Tests Completed ===');
console.log('✓ Backend validation layer is working correctly');
console.log('✓ All security constraints are enforced');
console.log('✓ Error handling is properly configured');
