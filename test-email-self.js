// Quick email connectivity test using the same ZeptoMail SMTP config as src/config/emailConfig.ts
const nodemailer = require("nodemailer");

const transport = nodemailer.createTransport({
  host: "smtp.zeptomail.com",
  port: 587,
  secure: false,
  auth: {
    user: "emailapikey",
    pass: "wSsVR60jq0L4Cqt4mDz/I7s7nllWU1zyQUwsiQOi7iL1TfHH98c7kE3NAQauHfNKQGNgQjEbrbt4mhcIgTFciYgon1pRDCiF9mqRe1U4J3x17qnvhDzNXWRblBKALIoMxw1onGlpGsgj+g==",
  },
  tls: { rejectUnauthorized: false },
});

(async () => {
  console.log("Verifying SMTP connection...");
  try {
    await transport.verify();
    console.log("✅ SMTP connection verified");
  } catch (err) {
    console.error("❌ SMTP verify failed:", err.message);
  }

  console.log("Sending test email to nyashakarata1@gmail.com ...");
  try {
    const info = await transport.sendMail({
      from: "Khayalami <noreply@khayalami.co.zw>",
      to: "nyashakarata1@gmail.com",
      subject: "Khayalami Email Test",
      html: `
        <h1>✅ Email Test Successful</h1>
        <p>This is a test email from the Khaya backend to confirm SMTP delivery is working.</p>
        <p>Sent at: ${new Date().toISOString()}</p>
      `,
    });
    console.log("✅ Test email sent. Message ID:", info.messageId);
    console.log("   Accepted:", info.accepted);
    console.log("   Rejected:", info.rejected);
  } catch (err) {
    console.error("❌ Failed to send test email:", err.message);
    if (err.response) console.error("   SMTP response:", err.response);
    process.exit(1);
  }
})();
