// @ts-nocheck
require('dotenv').config();
const mongoose = require('mongoose');

require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    esModuleInterop: true
  }
});

const { Invoice } = require('./src/models/Invoice');
const { Payment } = require('./src/models/Payment');

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected\n');

    // Get all invoices
    const invoices = await Invoice.find({}).sort({ createdAt: 1 });
    console.log(`📊 Total Invoices: ${invoices.length}\n`);

    invoices.forEach((inv, idx) => {
      console.log(`${idx + 1}. Invoice: ${inv.invoiceNumber}`);
      console.log(`   Payment ID: ${inv.paymentId}`);
      console.log(`   Rental ID: ${inv.rentalId}`);
      console.log(`   Due Date: ${inv.dueDate?.toISOString() || 'N/A'}`);
      console.log(`   Amount: K${inv.total}`);
      console.log(`   Status: ${inv.status}`);
      console.log(`   Created: ${inv.createdAt.toISOString()}`);
      console.log('');
    });

    // Get all payments
    const payments = await Payment.find({ paymentType: 'rent' }).sort({ dueDate: 1, createdAt: 1 });
    console.log(`\n📊 Total Rent Payments: ${payments.length}\n`);

    payments.forEach((pay, idx) => {
      console.log(`${idx + 1}. Payment ID: ${pay._id}`);
      console.log(`   Rental ID: ${pay.rentalId}`);
      console.log(`   Due Date: ${pay.dueDate?.toISOString() || 'N/A'}`);
      console.log(`   Amount: K${pay.amount}`);
      console.log(`   Status: ${pay.status}`);
      console.log(`   Created: ${pay.createdAt.toISOString()}`);
      console.log('');
    });

    // Check for duplicates
    const paymentGroups = {};
    payments.forEach(pay => {
      const key = `${pay.rentalId}_${pay.dueDate?.toISOString()}`;
      if (!paymentGroups[key]) {
        paymentGroups[key] = [];
      }
      paymentGroups[key].push(pay);
    });

    console.log('\n🔍 Duplicate Payments (same rental + due date):\n');
    let foundDupes = false;
    Object.keys(paymentGroups).forEach(key => {
      if (paymentGroups[key].length > 1) {
        foundDupes = true;
        console.log(`⚠️  Key: ${key}`);
        console.log(`   Count: ${paymentGroups[key].length}`);
        paymentGroups[key].forEach((p, i) => {
          console.log(`   ${i + 1}. Payment ${p._id} (created: ${p.createdAt.toISOString()})`);
        });
        console.log('');
      }
    });

    if (!foundDupes) {
      console.log('✅ No duplicate payments found\n');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

check();
