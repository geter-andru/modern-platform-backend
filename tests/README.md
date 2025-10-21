# Backend Tests Documentation

**Purpose**: Guide for writing, running, and maintaining backend tests using Jest and ES modules.

**Last Updated**: October 21, 2025

---

## Quick Start

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test auth.test.js

# Run tests with coverage
npm run test:coverage
```

### Test Structure

```
/tests
├── helpers/              # Test utilities
│   └── auth.js          # JWT token generation helpers
├── auth.test.js         # Authentication endpoints
├── customer.test.js     # Customer CRUD operations
├── businessCase.test.js # Business case generation
├── export.test.js       # Data export functionality
├── health.test.js       # Health check endpoint
└── validation.test.js   # Input validation tests
```

---

## ES Module Testing with Jest

### Critical Pattern: ES Module Mocking

**Important**: Jest's ES module mocking MUST be done BEFORE any imports that use the mocked module.

#### ✅ Correct Pattern

```javascript
import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// 1. Create mock object FIRST
const mockService = {
  getData: jest.fn(),
  saveData: jest.fn(),
};

// 2. Mock the module BEFORE importing app
jest.unstable_mockModule('../src/services/dataService.js', () => ({
  default: mockService
}));

// 3. NOW import app (after mock is set up)
const { default: app } = await import('../src/server.js');

describe('Tests', () => {
  // Tests go here
});
```

#### ❌ Wrong Pattern

```javascript
// DON'T DO THIS - imports before mocking
import app from '../src/server.js';  // ❌ Too early!
import { jest } from '@jest/globals';

// Mock won't work - app already imported the real module
jest.unstable_mockModule('../src/services/dataService.js', () => ({
  default: {}
}));
```

**Why this matters**: ES modules are statically linked. If you import the app before setting up mocks, the app will have already imported the real services, and your mocks won't be used.

---

## Authentication in Tests

### Using the Auth Helper

All authenticated endpoints require valid JWT tokens. Use the `withAuth()` helper:

```javascript
import { withAuth } from './helpers/auth.js';

test('should access protected endpoint', async () => {
  const customerId = '550e8400-e29b-41d4-a716-446655440001';

  const response = await request(app)
    .get(`/api/customer/${customerId}`)
    .set(withAuth(customerId));  // ← Adds Authorization header

  expect(response.status).toBe(200);
});
```

### Auth Helper Functions

#### `withAuth(customerId)`
Most commonly used - adds Authorization header for supertest requests.

```javascript
.set(withAuth('CUST_001'))
```

#### `generateTestAccessToken(customerId)`
Returns just the JWT token string (no Bearer prefix).

```javascript
const token = generateTestAccessToken('CUST_001');
// Returns: "eyJhbGciOiJIUzI1NiIsInR5c..."
```

#### `generateTestTokenPair(customerId)`
Returns both access and refresh tokens.

```javascript
const { accessToken, refreshToken } = generateTestTokenPair('CUST_001');
```

#### `generateExpiredToken(customerId)`
For testing token expiration handling.

```javascript
const expiredToken = generateExpiredToken('CUST_001');

const response = await request(app)
  .get('/api/endpoint')
  .set({ 'Authorization': `Bearer ${expiredToken}` });

expect(response.status).toBe(401);
```

#### `generateInvalidToken()`
For testing error handling with malformed tokens.

```javascript
const badToken = generateInvalidToken();

const response = await request(app)
  .get('/api/endpoint')
  .set({ 'Authorization': `Bearer ${badToken}` });

expect(response.status).toBe(401);
```

---

## UUID Format Requirements

**Critical**: Customer IDs MUST be valid UUIDs in tests.

### ✅ Valid UUIDs

```javascript
'550e8400-e29b-41d4-a716-446655440001'  // ✅ Correct format
'f47ac10b-58cc-4372-a567-0e02b2c3d479'  // ✅ Correct format
```

### ❌ Invalid Formats

```javascript
'CUST_001'        // ❌ Wrong - not a UUID
'test-customer'   // ❌ Wrong - not a UUID
'12345'           // ❌ Wrong - not a UUID
```

### Why UUIDs Matter

The backend validates customer IDs using regex pattern matching. Using invalid formats will cause validation errors:

```
400 Bad Request
{
  "success": false,
  "error": "Invalid customer ID format - must be UUID"
}
```

### Generating Test UUIDs

Use [uuidgenerator.net](https://www.uuidgenerator.net/) or:

```javascript
import { randomUUID } from 'crypto';

const testCustomerId = randomUUID();
// Returns: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'
```

---

## Common Test Patterns

### 1. Testing Protected Endpoints

```javascript
test('should return customer data for valid ID', async () => {
  const testCustomerId = '550e8400-e29b-41d4-a716-446655440001';

  const mockCustomer = {
    id: 'rec123',
    customerId: testCustomerId,
    customerName: 'Test Customer',
    email: 'test@example.com',
  };

  mockSupabaseDataService.getCustomerById.mockResolvedValue(mockCustomer);

  const response = await request(app)
    .get(`/api/customer/${testCustomerId}`)
    .set(withAuth(testCustomerId));  // ← Auth header

  expect(response.status).toBe(200);
  expect(response.body).toMatchObject({
    success: true,
    data: mockCustomer
  });
});
```

### 2. Testing Error Responses

```javascript
test('should return 404 for non-existent customer', async () => {
  const nonExistentId = '550e8400-e29b-41d4-a716-446655440999';

  mockSupabaseDataService.getCustomerById.mockResolvedValue(null);

  const response = await request(app)
    .get(`/api/customer/${nonExistentId}`)
    .set(withAuth(nonExistentId))
    .expect(404);  // ← Can chain expect for status

  expect(response.body).toMatchObject({
    success: false,
    error: 'Customer not found',
  });
});
```

### 3. Testing POST Requests

```javascript
test('should create new business case', async () => {
  const customerId = '550e8400-e29b-41d4-a716-446655440001';

  const mockBusinessCase = {
    id: 'rec456',
    customerId,
    content: 'Generated content',
  };

  mockAIService.generateBusinessCase.mockResolvedValue(mockBusinessCase);

  const response = await request(app)
    .post('/api/business-case')
    .set(withAuth(customerId))
    .send({
      customerId,
      prompt: 'Generate business case'
    });

  expect(response.status).toBe(201);
  expect(response.body.success).toBe(true);
});
```

### 4. Testing Rate Limiting

```javascript
test('should handle rate limiting', async () => {
  const customerId = '550e8400-e29b-41d4-a716-446655440001';

  // Make requests up to the limit
  const promises = [];
  for (let i = 0; i < 25; i++) {
    promises.push(
      request(app)
        .post('/api/endpoint')
        .set(withAuth(customerId))
        .send({ data: i })
    );
  }

  const results = await Promise.all(promises);

  // All should succeed
  results.forEach(res => expect(res.status).toBe(200));

  // Next request should be rate limited
  const rateLimited = await request(app)
    .post('/api/endpoint')
    .set(withAuth(customerId))
    .send({ data: 'test' });

  expect(rateLimited.status).toBe(429);
  expect(rateLimited.body.error).toContain('rate limit');
});
```

---

## Mocking Services

### Complete Mocking Pattern

```javascript
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import { withAuth } from './helpers/auth.js';

// 1. Create mock with all needed methods
const mockSupabaseDataService = {
  getCustomerById: jest.fn(),
  getCustomerByEmail: jest.fn(),
  updateCustomer: jest.fn(),
  getAllCustomers: jest.fn(),
  createCustomer: jest.fn(),
  deleteCustomer: jest.fn(),
};

// 2. Mock BEFORE import
jest.unstable_mockModule('../src/services/supabaseDataService.js', () => ({
  default: mockSupabaseDataService
}));

// 3. Import app
const { default: app } = await import('../src/server.js');

describe('Tests', () => {
  // 4. Clear mocks between tests
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('example test', async () => {
    // 5. Set up mock return values
    mockSupabaseDataService.getCustomerById.mockResolvedValue({
      id: 'rec123',
      customerId: '550e8400-e29b-41d4-a716-446655440001',
      customerName: 'Test'
    });

    // 6. Make request
    const response = await request(app)
      .get('/api/customer/550e8400-e29b-41d4-a716-446655440001')
      .set(withAuth('550e8400-e29b-41d4-a716-446655440001'));

    // 7. Verify mock was called correctly
    expect(mockSupabaseDataService.getCustomerById)
      .toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001');
  });
});
```

### Mock Return Values

```javascript
// Resolve with data
mockService.getData.mockResolvedValue({ data: 'value' });

// Reject with error
mockService.getData.mockRejectedValue(new Error('Database error'));

// Return different values on successive calls
mockService.getData
  .mockResolvedValueOnce({ id: 1 })
  .mockResolvedValueOnce({ id: 2 })
  .mockResolvedValueOnce({ id: 3 });
```

---

## Testing Async Operations

### Standard Async Pattern

```javascript
test('should handle async operation', async () => {
  mockService.asyncMethod.mockResolvedValue({ result: 'success' });

  const response = await request(app)
    .post('/api/endpoint')
    .set(withAuth('550e8400-e29b-41d4-a716-446655440001'))
    .send({ data: 'test' });

  expect(response.status).toBe(200);
  expect(response.body.result).toBe('success');
});
```

### Testing Error Handling

```javascript
test('should handle service errors gracefully', async () => {
  mockService.getData.mockRejectedValue(
    new Error('Database connection failed')
  );

  const response = await request(app)
    .get('/api/endpoint')
    .set(withAuth('550e8400-e29b-41d4-a716-446655440001'));

  expect(response.status).toBe(500);
  expect(response.body.success).toBe(false);
  expect(response.body.error).toContain('Database');
});
```

---

## Response Format Testing

### Standard Success Response

```javascript
expect(response.body).toMatchObject({
  success: true,
  data: expect.any(Object)
});
```

### Standard Error Response

```javascript
expect(response.body).toMatchObject({
  success: false,
  error: expect.any(String)
});
```

### Pagination Response

```javascript
expect(response.body).toMatchObject({
  success: true,
  data: expect.arrayContaining([
    expect.objectContaining({
      id: expect.any(String)
    })
  ]),
  pagination: expect.objectContaining({
    page: expect.any(Number),
    limit: expect.any(Number),
    total: expect.any(Number)
  })
});
```

---

## Debugging Tests

### Console Logging

```javascript
test('debugging example', async () => {
  const response = await request(app).get('/api/endpoint');

  // Debug helpers
  console.log('Status:', response.status);
  console.log('Body:', JSON.stringify(response.body, null, 2));
  console.log('Headers:', response.headers);

  expect(response.status).toBe(200);
});
```

### Mock Call Inspection

```javascript
test('inspect mock calls', () => {
  mockService.getData('arg1', 'arg2');

  // Check if called
  expect(mockService.getData).toHaveBeenCalled();

  // Check call count
  expect(mockService.getData).toHaveBeenCalledTimes(1);

  // Check arguments
  expect(mockService.getData).toHaveBeenCalledWith('arg1', 'arg2');

  // Inspect all calls
  console.log('All calls:', mockService.getData.mock.calls);
  // [[arg1, arg2]]
});
```

### Running Single Test

```bash
# Run only one test file
npm test customer.test.js

# Run only tests matching pattern
npm test -- -t "should return customer data"
```

---

## Common Issues & Solutions

### Issue: Mock not working

**Problem**: Mock setup after imports

**Solution**:
```javascript
// ❌ Wrong
import app from '../src/server.js';
jest.unstable_mockModule(...);

// ✅ Correct
jest.unstable_mockModule(...);
const { default: app } = await import('../src/server.js');
```

### Issue: "Invalid customer ID format"

**Problem**: Using non-UUID customer IDs

**Solution**:
```javascript
// ❌ Wrong
const customerId = 'CUST_001';

// ✅ Correct
const customerId = '550e8400-e29b-41d4-a716-446655440001';
```

### Issue: 401 Unauthorized in tests

**Problem**: Missing or invalid auth token

**Solution**:
```javascript
// ❌ Wrong
const response = await request(app).get('/api/customer/...');

// ✅ Correct
const response = await request(app)
  .get('/api/customer/...')
  .set(withAuth('550e8400-e29b-41d4-a716-446655440001'));
```

### Issue: Tests fail with "Cannot find module"

**Problem**: ES module import path issue

**Solution**:
```javascript
// ❌ Wrong
import helper from './helpers/auth';

// ✅ Correct - include .js extension
import helper from './helpers/auth.js';
```

---

## Test Coverage

### Running Coverage Reports

```bash
npm run test:coverage
```

### Coverage Targets

- **Statements**: >80%
- **Branches**: >75%
- **Functions**: >80%
- **Lines**: >80%

### Viewing Coverage

Coverage reports are generated in `/coverage/lcov-report/index.html`

```bash
# Generate and open coverage report
npm run test:coverage
open coverage/lcov-report/index.html
```

---

## Best Practices

### 1. Clear Test Descriptions

```javascript
// ✅ Good
test('should return 404 when customer does not exist', async () => {

// ❌ Bad
test('customer test', async () => {
```

### 2. Arrange-Act-Assert Pattern

```javascript
test('should update customer', async () => {
  // Arrange
  const customerId = '550e8400-e29b-41d4-a716-446655440001';
  mockService.updateCustomer.mockResolvedValue({ success: true });

  // Act
  const response = await request(app)
    .put(`/api/customer/${customerId}`)
    .set(withAuth(customerId))
    .send({ name: 'New Name' });

  // Assert
  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
});
```

### 3. Test One Thing Per Test

```javascript
// ✅ Good - one assertion focus
test('should return 200 status', async () => {
  const response = await request(app).get('/health');
  expect(response.status).toBe(200);
});

test('should return success message', async () => {
  const response = await request(app).get('/health');
  expect(response.body.status).toBe('healthy');
});

// ❌ Bad - too many unrelated assertions
test('health endpoint', async () => {
  const response = await request(app).get('/health');
  expect(response.status).toBe(200);
  expect(response.body.status).toBe('healthy');
  expect(response.headers['content-type']).toContain('json');
  expect(response.body.timestamp).toBeDefined();
  // etc...
});
```

### 4. Clean Up Mocks

```javascript
describe('Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();  // ← Reset mock state
  });

  test('first test', () => {
    // Fresh mocks
  });

  test('second test', () => {
    // Clean slate, no pollution from first test
  });
});
```

### 5. Use Descriptive Variable Names

```javascript
// ✅ Good
const validCustomerId = '550e8400-e29b-41d4-a716-446655440001';
const nonExistentCustomerId = '550e8400-e29b-41d4-a716-446655440999';

// ❌ Bad
const id1 = '550e8400-e29b-41d4-a716-446655440001';
const id2 = '550e8400-e29b-41d4-a716-446655440999';
```

---

## Quick Reference

### Imports

```javascript
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import { withAuth } from './helpers/auth.js';
```

### Mock Setup

```javascript
const mockService = { method: jest.fn() };
jest.unstable_mockModule('../src/services/service.js', () => ({
  default: mockService
}));
const { default: app } = await import('../src/server.js');
```

### Auth Header

```javascript
.set(withAuth('550e8400-e29b-41d4-a716-446655440001'))
```

### Common Assertions

```javascript
expect(response.status).toBe(200);
expect(response.body.success).toBe(true);
expect(response.body).toMatchObject({ key: 'value' });
expect(mockService.method).toHaveBeenCalledWith(arg);
expect(mockService.method).toHaveBeenCalledTimes(1);
```

---

## Related Documentation

- [Jest ES Module Documentation](https://jestjs.io/docs/ecmascript-modules)
- [Supertest API](https://github.com/ladjs/supertest#api)
- [JWT.io](https://jwt.io/) - Token debugging
- [UUID Generator](https://www.uuidgenerator.net/)

---

## Questions?

- Check `/dev/reference/guides/` for integration guides
- Review existing test files for patterns
- See `/dev/active/sprint/TEST_SUITE_AUTH_PROGRESS_2025-10-20.md` for test suite status

**Last Updated**: October 21, 2025 (Agent 3)
