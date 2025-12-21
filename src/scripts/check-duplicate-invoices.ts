// @ts-nocheck
/**
 * Script to check for duplicate invoices and payments
 * Helps diagnose why multiple invoices are being created
 */

import mongoose from 'mongoose';
import { Invoice } from '../models/Invoice';
import { Payment } from '../models/Payment';
import { Rental } from '../models/Rental';
import dotenv from 'dotenv';

dotenv.config();

async function checkDuplicates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB\n');

    // Find all invoices
    const invoices = await Invoice.find({})
      .populate('paymentId', 'dueDate amount status')
      .populate('rentalId', 'startDate endDate')
      .sort({ dueDate: 1, createdAt: 1 });

    console.log(`📊 Total Invoices: ${invoices.length}\n`);

    // Group by rentalId and dueDate
    const invoiceMap = new Map();
    invoices.forEach(inv => {
      const key = `${inv.rentalId}_${inv.dueDate?.toISOString()}`;
      if (!invoiceMap.has(key)) {
        invoiceMap.set(key, []);
      }
      invoiceMap.get(key).push(inv);
    });

    // Find duplicates
    console.log('🔍 Checking for duplicate invoices (same rental + due date):\n');
    let hasDuplicates = false;

    invoiceMap.forEach((invoiceList, key) => {
      if (invoiceList.length > 1) {
        hasDuplicates = true;
        const [rentalId, dueDate] = key.split('_');
        console.log(`⚠️  DUPLICATE FOUND:`);
        console.log(`   Rental ID: ${rentalId}`);
        console.log(`   Due Date: ${dueDate}`);
        console.log(`   Number of invoices: ${invoiceList.length}`);
        invoiceList.forEach((inv, idx) => {
          console.log(`   ${idx + 1}. Invoice: ${inv.invoiceNumber}`);
          console.log(`      Payment ID: ${inv.paymentId?._id || 'N/A'}`);
          console.log(`      Payment Due: ${inv.paymentId?.dueDate?.toISOString() || 'N/A'}`);
          console.log(`      Amount: K${inv.total}`);
          console.log(`      Status: ${inv.status}`);
          console.log(`      Created: ${inv.createdAt.toISOString()}`);
        });
        console.log('');
      }
    });

    if (!hasDuplicates) {
      console.log('✅ No duplicate invoices found (same rental + due date)\n');
    }

    // Check for duplicate payments
    console.log('🔍 Checking for duplicate payments (same rental + due date):\n');
    const payments = await Payment.find({ paymentType: 'rent', status: 'pending' })
      .sort({ dueDate: 1, createdAt: 1 });

    const paymentMap = new Map();
    payments.forEach(pay => {
      const key = `${pay.rentalId}_${pay.dueDate?.toISOString()}`;
      if (!paymentMap.has(key)) {
        paymentMap.set(key, []);
      }
      paymentMap.get(key).push(pay);
    });

    let hasDuplicatePayments = false;
    paymentMap.forEach((paymentList, key) => {
      if (paymentList.length > 1) {
        hasDuplicatePayments = true;
        const [rentalId, dueDate] = key.split('_');
        console.log(`⚠️  DUPLICATE PAYMENT FOUND:`);
        console.log(`   Rental ID: ${rentalId}`);
        console.log(`   Due Date: ${dueDate}`);
        console.log(`   Number of payments: ${paymentList.length}`);
        paymentList.forEach((pay, idx) => {
          console.log(`   ${idx + 1}. Payment ID: ${pay._id}`);
          console.log(`      Amount: K${pay.amount}`);
          console.log(`      Status: ${pay.status}`);
          console.log(`      Created: ${pay.createdAt.toISOString()}`);
        });
        console.log('');
      }
    });

    if (!hasDuplicatePayments) {
      console.log('✅ No duplicate payments found (same rental + due date)\n');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkDuplicates();


