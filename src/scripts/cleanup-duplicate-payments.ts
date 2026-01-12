// @ts-nocheck
/**
 * Script to clean up duplicate payments and invoices
 * Removes duplicate payments with same rental + due date (keeps the first one)
 * Removes duplicate invoices (keeps the first one, links payments to it)
 */

import mongoose from 'mongoose';
import { Invoice } from '../models/Invoice';
import { Payment } from '../models/Payment';
import { Rental } from '../models/Rental';
import dotenv from 'dotenv';

dotenv.config();

async function cleanupDuplicates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB\n');

    // Find all pending rent payments (not just pending, all rent payments)
    const payments = await Payment.find({ paymentType: 'rent' })
      .sort({ dueDate: 1, createdAt: 1 });

    console.log(`📊 Total Pending Rent Payments: ${payments.length}\n`);

    // Group by rentalId and dueDate
    const paymentMap = new Map();
    payments.forEach(pay => {
      const rentalId = pay.rentalId.toString();
      const dueDate = pay.dueDate?.toISOString() || 'no-date';
      const key = `${rentalId}_${dueDate}`;
      
      if (!paymentMap.has(key)) {
        paymentMap.set(key, []);
      }
      paymentMap.get(key).push(pay);
    });

    // Find and remove duplicate payments
    console.log('🔍 Finding duplicate payments...\n');
    let duplicateCount = 0;
    const paymentsToDelete = [];

    paymentMap.forEach((paymentList, key) => {
      if (paymentList.length > 1) {
        duplicateCount++;
        const [rentalId, dueDate] = key.split('_');
        console.log(`⚠️  DUPLICATE PAYMENTS FOUND:`);
        console.log(`   Rental ID: ${rentalId}`);
        console.log(`   Due Date: ${dueDate}`);
        console.log(`   Number of payments: ${paymentList.length}`);
        
        // Keep the first one (oldest), delete the rest
        const [keepPayment, ...duplicatePayments] = paymentList.sort((a, b) => 
          a.createdAt.getTime() - b.createdAt.getTime()
        );
        
        console.log(`   ✅ Keeping: Payment ${keepPayment._id} (created: ${keepPayment.createdAt.toISOString()})`);
        duplicatePayments.forEach((pay, idx) => {
          console.log(`   🗑️  Will delete: Payment ${pay._id} (created: ${pay.createdAt.toISOString()})`);
          paymentsToDelete.push(pay._id);
        });
        console.log('');
      }
    });

    if (duplicateCount === 0) {
      console.log('✅ No duplicate payments found\n');
    } else {
      console.log(`\n🗑️  Found ${paymentsToDelete.length} duplicate payments to delete\n`);
      
      // Delete duplicate payments
      if (paymentsToDelete.length > 0) {
        const deleteResult = await Payment.deleteMany({ _id: { $in: paymentsToDelete } });
        console.log(`✅ Deleted ${deleteResult.deletedCount} duplicate payments\n`);
      }
    }

    // Now check for duplicate invoices
    console.log('🔍 Finding duplicate invoices...\n');
    const invoices = await Invoice.find({})
      .sort({ dueDate: 1, createdAt: 1 });

    const invoiceMap = new Map();
    invoices.forEach(inv => {
      const rentalId = inv.rentalId.toString();
      const dueDate = inv.dueDate?.toISOString() || 'no-date';
      const key = `${rentalId}_${dueDate}`;
      
      if (!invoiceMap.has(key)) {
        invoiceMap.set(key, []);
      }
      invoiceMap.get(key).push(inv);
    });

    let duplicateInvoiceCount = 0;
    const invoicesToDelete = [];
    const paymentUpdates = [];

    invoiceMap.forEach((invoiceList, key) => {
      if (invoiceList.length > 1) {
        duplicateInvoiceCount++;
        const [rentalId, dueDate] = key.split('_');
        console.log(`⚠️  DUPLICATE INVOICES FOUND:`);
        console.log(`   Rental ID: ${rentalId}`);
        console.log(`   Due Date: ${dueDate}`);
        console.log(`   Number of invoices: ${invoiceList.length}`);
        
        // Keep the first one (oldest), delete the rest
        const [keepInvoice, ...duplicateInvoices] = invoiceList.sort((a, b) => 
          a.createdAt.getTime() - b.createdAt.getTime()
        );
        
        console.log(`   ✅ Keeping: Invoice ${keepInvoice.invoiceNumber} (ID: ${keepInvoice._id})`);
        duplicateInvoices.forEach((inv) => {
          console.log(`   🗑️  Will delete: Invoice ${inv.invoiceNumber} (ID: ${inv._id})`);
          invoicesToDelete.push(inv._id);
          
          // Update any payments linked to this duplicate invoice to point to the kept invoice
          if (inv.paymentId) {
            paymentUpdates.push({
              paymentId: inv.paymentId,
              newInvoiceId: keepInvoice._id
            });
          }
        });
        console.log('');
      }
    });

    if (duplicateInvoiceCount === 0) {
      console.log('✅ No duplicate invoices found\n');
    } else {
      console.log(`\n🗑️  Found ${invoicesToDelete.length} duplicate invoices to delete\n`);
      
      // Update payments to point to kept invoices
      if (paymentUpdates.length > 0) {
        console.log('🔄 Updating payments to link to kept invoices...\n');
        for (const update of paymentUpdates) {
          await Payment.updateOne(
            { _id: update.paymentId },
            { invoiceId: update.newInvoiceId }
          );
          console.log(`   ✅ Updated payment ${update.paymentId} to use invoice ${update.newInvoiceId}`);
        }
        console.log('');
      }
      
      // Delete duplicate invoices
      if (invoicesToDelete.length > 0) {
        const deleteResult = await Invoice.deleteMany({ _id: { $in: invoicesToDelete } });
        console.log(`✅ Deleted ${deleteResult.deletedCount} duplicate invoices\n`);
      }
    }

    console.log('✅ Cleanup complete!\n');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanupDuplicates();




