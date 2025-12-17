// Quick verification script for Brooke's account
// Fetches user by email and writes a JSON snapshot to brooke-status.json

// @ts-nocheck
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function verifyBrookeStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    const user = await db.collection('users').findOne({ email: 'brookechimoto@gmail.com' });

    const outputPath = path.join(process.cwd(), 'brooke-status.json');

    if (!user) {
      const payload = { error: 'User not found', email: 'brookechimoto@gmail.com' };
      fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf8');
      await mongoose.disconnect();
      return;
    }

    const safeUser = {
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isVerified: user.isVerified,
      isActive: user.isActive,
      documentVerification: user.documentVerification || null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    fs.writeFileSync(outputPath, JSON.stringify(safeUser, null, 2), 'utf8');

    await mongoose.disconnect();
  } catch (error) {
    try {
      const outputPath = path.join(process.cwd(), 'brooke-status.json');
      fs.writeFileSync(outputPath, JSON.stringify({ error: String(error) }, null, 2), 'utf8');
    } catch (_) {}
    await mongoose.disconnect();
  }
}

verifyBrookeStatus();
