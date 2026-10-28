import http from 'http';
import app from '../index';
import { prisma } from '../config/prisma';

interface TestStep {
  name: string;
  passed: boolean;
  message: string;
}

const steps: TestStep[] = [];

function assertStep(name: string, condition: boolean, message: string) {
  steps.push({ name, passed: condition, message });
  const icon = condition ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon}: [${name}] - ${message}`);
  if (!condition) {
    console.error(`   Error details: ${message}`);
  }
}

async function runBedDeallocationAudit() {
  console.log('\n================================================================');
  console.log('   URBAN NEST — BED ALLOCATION & DEALLOCATION AUDIT SUITE       ');
  console.log('================================================================\n');

  const PORT = 5099;
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(PORT, resolve));
  const BASE_URL = `http://127.0.0.1:${PORT}/api`;

  let createdResidentId1: string | null = null;
  let createdResidentId2: string | null = null;
  let testRoomId: string | null = null;
  let testBedId: string | null = null;

  try {
    // -------------------------------------------------------------
    // STEP 1: AUTHENTICATE AS PROPERTY OWNER
    // -------------------------------------------------------------
    console.log('--- Step 1: Authentication ---');
    const ownerLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@pg.com', password: 'admin123' }),
    });
    const ownerAuth = await ownerLogin.json();
    const token = ownerAuth.data?.token;
    assertStep('Owner Login', !!token, `Logged in successfully as ${ownerAuth.data?.user?.email}`);

    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // -------------------------------------------------------------
    // STEP 2: GET ROOMS & ENSURE A TEST ROOM WITH BED
    // -------------------------------------------------------------
    console.log('\n--- Step 2: Fetch Rooms & Locate / Create Test Bed ---');
    const roomsRes = await fetch(`${BASE_URL}/owner/rooms`, { headers: authHeaders });
    const roomsData = await roomsRes.json();
    assertStep('Fetch Rooms', roomsRes.status === 200 && Array.isArray(roomsData.data), `Fetched ${roomsData.data?.length} rooms`);

    const property = await prisma.property.findFirst();
    if (!property) throw new Error('No property found in database');

    const testRoomNumber = `T${Date.now().toString().slice(-4)}`;
    const createRoomRes = await fetch(`${BASE_URL}/owner/rooms`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        propertyId: property.id,
        number: testRoomNumber,
        type: 'Double',
        capacity: '2',
        baseRent: '12000',
        deposit: '24000',
      }),
    });
    const createRoomData = await createRoomRes.json();
    testRoomId = createRoomData.data?.id;
    testBedId = createRoomData.data?.beds?.[0]?.id;
    assertStep('Create Test Room & Beds', (createRoomRes.status === 200 || createRoomRes.status === 201) && !!testBedId, `Created test room ${testRoomNumber} with bed ${testBedId}`);

    // -------------------------------------------------------------
    // STEP 3: TOGGLE BED STATUS TO MAINTENANCE & BACK TO AVAILABLE
    // (Verifies fix for prisma.bed.update id: undefined bug)
    // -------------------------------------------------------------
    console.log('\n--- Step 3: Test Bed Status Toggling (Fix for prisma id: undefined) ---');
    const maintRes = await fetch(`${BASE_URL}/owner/beds/${testBedId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ status: 'MAINTENANCE' }),
    });
    const maintData = await maintRes.json();
    assertStep(
      'Toggle Maintenance',
      maintRes.status === 200 && maintData.data?.status === 'MAINTENANCE',
      `Bed status successfully updated to MAINTENANCE (status: ${maintRes.status})`
    );

    const availRes = await fetch(`${BASE_URL}/owner/beds/${testBedId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ status: 'AVAILABLE' }),
    });
    const availData = await availRes.json();
    assertStep(
      'Toggle Available',
      availRes.status === 200 && availData.data?.status === 'AVAILABLE',
      `Bed status successfully restored to AVAILABLE (status: ${availRes.status})`
    );

    // -------------------------------------------------------------
    // STEP 4: ALLOCATE A RESIDENT TO THE BED
    // -------------------------------------------------------------
    console.log('\n--- Step 4: Allocate Resident to Bed ---');
    const testEmail1 = `test.resident.${Date.now()}@example.com`;
    const moveInRes1 = await fetch(`${BASE_URL}/owner/residents/move-in`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        propertyId: property.id,
        bedId: testBedId,
        fullName: 'Test Resident One',
        email: testEmail1,
        mobile: '9876543211',
        monthlyRent: 12000,
        securityDepositAmount: 24000,
        joiningDate: new Date().toISOString(),
      }),
    });
    const moveInData1 = await moveInRes1.json();
    createdResidentId1 = moveInData1.data?.id;
    assertStep(
      'Allocate Resident 1',
      (moveInRes1.status === 200 || moveInRes1.status === 201) && !!createdResidentId1,
      `Resident allocated with id ${createdResidentId1}`
    );

    // Verify bed is now OCCUPIED
    const bedCheck1 = await prisma.bed.findUnique({ where: { id: testBedId } });
    assertStep('Bed Status is OCCUPIED', bedCheck1?.status === 'OCCUPIED', `Bed is now ${bedCheck1?.status}`);

    // Verify blocking: cannot directly set occupied bed to AVAILABLE via PATCH
    const directAvailRes = await fetch(`${BASE_URL}/owner/beds/${testBedId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ status: 'AVAILABLE' }),
    });
    assertStep(
      'Block Direct Available for Occupied Bed',
      directAvailRes.status === 400,
      `Correctly rejected setting occupied bed to AVAILABLE without deallocation (HTTP ${directAvailRes.status})`
    );

    // -------------------------------------------------------------
    // STEP 5: DEALLOCATE BED WITH moveOut: false (UNASSIGN BED ONLY)
    // -------------------------------------------------------------
    console.log('\n--- Step 5: Deallocate Bed with moveOut: false (Unassign Bed Only) ---');
    const deallocUnassignRes = await fetch(`${BASE_URL}/owner/beds/${testBedId}/deallocate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        moveOut: false,
        remarks: 'Transferring to another room',
      }),
    });
    const deallocUnassignData = await deallocUnassignRes.json();
    assertStep(
      'Deallocate (Unassign Bed Only)',
      deallocUnassignRes.status === 200 && deallocUnassignData.data?.bed?.status === 'AVAILABLE',
      `Deallocated bed: status is now AVAILABLE`
    );

    // Verify resident record in DB
    const resCheck1 = await prisma.resident.findUnique({ where: { id: createdResidentId1 } });
    assertStep(
      'Resident 1 Remains ACTIVE but bedId cleared',
      resCheck1?.status === 'ACTIVE' && resCheck1?.bedId === null,
      `Resident 1 status is ${resCheck1?.status}, bedId is ${resCheck1?.bedId}`
    );

    // -------------------------------------------------------------
    // STEP 6: ALLOCATE RESIDENT 2 & DEALLOCATE WITH moveOut: true (VACATE)
    // -------------------------------------------------------------
    console.log('\n--- Step 6: Allocate Resident 2 & Vacate (Full Move-Out) ---');
    const testEmail2 = `test.resident2.${Date.now()}@example.com`;
    const moveInRes2 = await fetch(`${BASE_URL}/owner/residents/move-in`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        propertyId: property.id,
        bedId: testBedId,
        fullName: 'Test Resident Two',
        email: testEmail2,
        mobile: '9876543212',
        monthlyRent: 12000,
        securityDepositAmount: 24000,
        joiningDate: new Date().toISOString(),
      }),
    });
    const moveInData2 = await moveInRes2.json();
    createdResidentId2 = moveInData2.data?.id;
    assertStep('Allocate Resident 2', (moveInRes2.status === 200 || moveInRes2.status === 201) && !!createdResidentId2, `Allocated Resident 2`);

    // Deallocate with moveOut: true
    const deallocVacateRes = await fetch(`${BASE_URL}/owner/beds/${testBedId}/deallocate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        moveOut: true,
        deductions: 500,
        deductionNotes: 'Room deep cleaning fee',
        remarks: 'Tenure completed',
      }),
    });
    const deallocVacateData = await deallocVacateRes.json();
    assertStep(
      'Deallocate (Vacate & Move Out)',
      deallocVacateRes.status === 200 && deallocVacateData.data?.bed?.status === 'AVAILABLE',
      `Bed status returned to AVAILABLE (HTTP ${deallocVacateRes.status})`
    );

    // Verify resident 2 in DB is MOVED_OUT
    const resCheck2 = await prisma.resident.findUnique({ where: { id: createdResidentId2 } });
    assertStep(
      'Resident 2 status is MOVED_OUT and bedId cleared',
      resCheck2?.status === 'MOVED_OUT' && resCheck2?.bedId === null,
      `Resident 2 status is ${resCheck2?.status}, bedId is ${resCheck2?.bedId}`
    );

    // Verify Security Deposit updated
    const depositCheck = await prisma.securityDeposit.findFirst({
      where: { residentId: createdResidentId2 },
    });
    assertStep(
      'Security Deposit Refunded with Deductions',
      depositCheck?.status === 'REFUNDED' && Number(depositCheck?.deductions) === 500,
      `Deposit status: ${depositCheck?.status}, deductions: ${depositCheck?.deductions}`
    );
  } catch (err: any) {
    console.error('Fatal test error:', err);
    assertStep('Suite Execution', false, err.message);
  } finally {
    // -------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------
    console.log('\n--- Cleanup ---');
    try {
      if (createdResidentId1) {
        await prisma.payment.deleteMany({ where: { residentId: createdResidentId1 } });
        await prisma.securityDeposit.deleteMany({ where: { residentId: createdResidentId1 } });
        const res = await prisma.resident.findUnique({ where: { id: createdResidentId1 } });
        await prisma.resident.delete({ where: { id: createdResidentId1 } }).catch(() => {});
        if (res?.userId) await prisma.user.delete({ where: { id: res.userId } }).catch(() => {});
      }
      if (createdResidentId2) {
        await prisma.payment.deleteMany({ where: { residentId: createdResidentId2 } });
        await prisma.securityDeposit.deleteMany({ where: { residentId: createdResidentId2 } });
        const res = await prisma.resident.findUnique({ where: { id: createdResidentId2 } });
        await prisma.resident.delete({ where: { id: createdResidentId2 } }).catch(() => {});
        if (res?.userId) await prisma.user.delete({ where: { id: res.userId } }).catch(() => {});
      }
      if (testBedId) {
        await prisma.bed.delete({ where: { id: testBedId } }).catch(() => {});
      }
      if (testRoomId) {
        await prisma.room.delete({ where: { id: testRoomId } }).catch(() => {});
      }
    } catch (e: any) {
      console.warn('Cleanup error (ignorable):', e.message);
    }

    server.close();

    console.log('\n================================================================');
    console.log('                   AUDIT SUMMARY                                ');
    console.log('================================================================');
    const passed = steps.filter((s) => s.passed).length;
    const failed = steps.filter((s) => !s.passed).length;
    console.log(`TOTAL STEPS: ${steps.length} | PASSED: ${passed} | FAILED: ${failed}`);
    if (failed > 0) {
      process.exit(1);
    }
  }
}

runBedDeallocationAudit().catch((e) => {
  console.error(e);
  process.exit(1);
});
