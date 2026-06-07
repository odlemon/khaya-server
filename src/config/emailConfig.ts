// @ts-nocheck
import nodemailer from 'nodemailer';

// Centralized Email Configuration - All settings hardcoded here
export const emailConfig = {
  // SMTP Configuration
  smtp: {
    host: "smtp.zeptomail.com",
    port: 587,
    auth: {
      user: "emailapikey",
      pass: "wSsVR60jq0L4Cqt4mDz/I7s7nllWU1zyQUwsiQOi7iL1TfHH98c7kE3NAQauHfNKQGNgQjEbrbt4mhcIgTFciYgon1pRDCiF9mqRe1U4J3x17qnvhDzNXWRblBKALIoMxw1onGlpGsgj+g=="
    }
  },
  
  // From Address Configuration
  fromAddress: "noreply@khayalami.co.zw",
  
  // From Names
  fromNames: {
    verification: "Khayalami",
    security: "Khayalami Security",
    notifications: "Khayalami",
    default: "Khayalami"
  }
};

// Create and export nodemailer transport
export const emailTransport = nodemailer.createTransport({
  host: emailConfig.smtp.host,
  port: emailConfig.smtp.port,
  secure: false, // Use TLS for port 587
  auth: {
    user: emailConfig.smtp.auth.user,
    pass: emailConfig.smtp.auth.pass
  },
  tls: {
    rejectUnauthorized: false // Allow self-signed certificates if needed
  }
});

// Verify email transport connection on startup (optional - can be called manually)
export async function verifyEmailConnection(): Promise<boolean> {
  try {
    await emailTransport.verify();
    console.log('✅ Email transport connection verified successfully');
    return true;
  } catch (error: any) {
    console.error('❌ Email transport connection failed:', error);
    return false;
  }
}

// Helper function to get from address with name
export function getFromAddress(module: keyof typeof emailConfig.fromNames | 'default' = 'default'): { name: string; address: string } {
  return {
    name: emailConfig.fromNames[module] || emailConfig.fromNames.default,
    address: emailConfig.fromAddress
  };
}
