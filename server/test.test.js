const { MongoMemoryReplSet } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('./app');

// Import models
const Tenant = require('./src/models/Tenant');
const User = require('./src/models/User');
const Role = require('./src/models/Role');
const EmployeeProfile = require('./src/models/EmployeeProfile');
const LeaveRequest = require('./src/models/LeaveRequest');

let replSet;

beforeAll(async () => {
  // Start an in-memory MongoDB replica set required for multi-document transactions
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 3 } });
  const uri = replSet.getUri();
  
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

describe('Anti-Gravity Protocol Validation', () => {
  jest.setTimeout(30000); // Increase timeout for replica set initialization

  let tenantA, tenantB;
  let userA, userB; // representing authenticating users

  beforeAll(async () => {
    // Scaffold Tenants
    tenantA = await Tenant.create({ name: 'Tenant A', subdomain: 'tenanta', activeModules: ['inventory'] });
    tenantB = await Tenant.create({ name: 'Tenant B', subdomain: 'tenantb', activeModules: [] }); // free tier, no inventory

    // Tenant Isolation Assurance Vector: 100 users for A, 5 users for B
    const usersA = [];
    for (let i = 0; i < 100; i++) usersA.push({ email: `a${i}@tenanta.com`, passwordHash: 'hash', tenantId: tenantA._id });
    await User.insertMany(usersA);
    userA = await User.findOne({ tenantId: tenantA._id });
    
    const usersB = [];
    for (let i = 0; i < 5; i++) usersB.push({ email: `b${i}@tenantb.com`, passwordHash: 'hash', tenantId: tenantB._id });
    await User.insertMany(usersB);
    userB = await User.findOne({ tenantId: tenantB._id });
  });

  test('Tenant Isolation Assurance (Cross-Pollination Check)', async () => {
    // Authenticate as Tenant B (using user B id to supply tenant context fallback, or passing the subdomain)
    const res = await request(app)
      .get('/api/users')
      .set('x-tenant-id', tenantB.subdomain)
      .set('x-user-id', userB._id.toString());
      
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(5); // Only sees 5 users, not 105!
    
    // Prove it's not a general find by checking Tenant A as well just to be certain
    const resA = await request(app)
      .get('/api/users')
      .set('x-tenant-id', tenantA.subdomain)
      .set('x-user-id', userA._id.toString());
      
    expect(resA.status).toBe(200);
    expect(resA.body.length).toBe(100); 
  });

  test('RBAC Matrix and Entitlement Verification', async () => {
    // Create Role without payroll permission for tenant B
    const roleNoPayroll = await Role.create({
      tenantId: tenantB._id, name: 'Normal User', permissions: ['edit_attendance']
    });
    userB.roles = [roleNoPayroll._id];
    await userB.save();

    // 1. RBAC Check: Should block since role lacks view_payroll
    const resRbac = await request(app)
      .get('/api/v1/payroll')
      .set('x-tenant-id', tenantB.subdomain)
      .set('x-user-id', userB._id.toString());
    
    expect(resRbac.status).toBe(403);
    
    // 2. Entitlement Check: Block free tier tenant (Tenant B) from accessing inventory module
    const resEntitlement = await request(app)
      .get('/api/v1/inventory')
      .set('x-tenant-id', tenantB.subdomain)
      .set('x-user-id', userB._id.toString());
    
    expect(resEntitlement.status).toBe(402);
    
    // 3. Entitlement Verify Pass: Tenant A has inventory module
    const resEntitlementA = await request(app)
      .get('/api/v1/inventory')
      .set('x-tenant-id', tenantA.subdomain)
      .set('x-user-id', userA._id.toString());
    
    expect(resEntitlementA.status).toBe(200);
  });

  test('Transactional Integrity Evaluation', async () => {
    // Scaffold employee with 14 vacation days
    const employee = await EmployeeProfile.create({
      tenantId: tenantA._id, userId: userA._id, firstName: 'Jon', lastName: 'Doe', leaveCredits: { vacation: 14, sick: 7, bereavement: 3 }
    });
    
    // Request 1: 5 days
    const req1 = await LeaveRequest.create({
      tenantId: tenantA._id, employeeId: employee._id, leaveType: 'vacation', startDate: new Date('2026-03-20'), endDate: new Date('2026-03-25')
    });
    // Request 2: 7 days
    const req2 = await LeaveRequest.create({
        tenantId: tenantA._id, employeeId: employee._id, leaveType: 'vacation', startDate: new Date('2026-04-01'), endDate: new Date('2026-04-08')
    });
    // Request 3: 5 days (Total 5+7+5 = 17 days, exceeds 14 days limit!)
    const req3 = await LeaveRequest.create({
        tenantId: tenantA._id, employeeId: employee._id, leaveType: 'vacation', startDate: new Date('2026-05-01'), endDate: new Date('2026-05-06')
    });

    const managerHdr = { 'x-tenant-id': tenantA.subdomain, 'x-user-id': userA._id.toString(), 'x-manager-id': userA._id.toString() };

    // Fire concurrently to simulate race condition and test MongoDB withTransaction abort capabilities
    const results = await Promise.allSettled([
      request(app).post(`/api/leaves/${req1._id}/approve`).set(managerHdr),
      request(app).post(`/api/leaves/${req2._id}/approve`).set(managerHdr),
      request(app).post(`/api/leaves/${req3._id}/approve`).set(managerHdr)
    ]);
    
    const successes = results.filter(r => r.value && r.value.status === 200);
    const failures = results.filter(r => r.value && r.value.status === 400);
    
    // At least one must fail due to overdrawing the 14 days credit
    expect(failures.length).toBeGreaterThan(0);
    
    // DB state verification
    const employeeFinal = await EmployeeProfile.findById(employee._id);
    expect(employeeFinal.leaveCredits.vacation).toBeGreaterThanOrEqual(0);
    
    const approvedRequests = await LeaveRequest.countDocuments({ status: 'approved' });
    const pendingRequests = await LeaveRequest.countDocuments({ status: 'pending' });
    
    const sumDaysApproved = (approvedRequests === 2) ? 12 : 5; // can mock based on ordering; but we just need bounds check
    expect(pendingRequests).toBeGreaterThan(0);
    expect(approvedRequests).toBeLessThan(3);
  });

});
