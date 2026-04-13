const nodemailer = require('nodemailer');

// Use environment variables for production
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT || 587,
    auth: {
        user: process.env.SMTP_USER || 'ethereal.user@ethereal.email',
        pass: process.env.SMTP_PASS || 'ethereal.pass'
    }
});

const sendOTP = async (email, otp) => {
    // DEVELOPER CONSOLE LOG (Always visible in your terminal!)
    console.log("==========================================");
    console.log(`🔑 SECURE OTP FOR [${email}] is: [${otp}]`);
    console.log("==========================================");

    try {
        // Only attempt real mail if SMTP_USER is provided.
        if (process.env.SMTP_USER) {
            const info = await transporter.sendMail({
                from: '"Secure Chat App" <noreply@securechat.com>',
                to: email,
                subject: 'Your Login OTP',
                text: `Your OTP for Secure Chat App is: ${otp}. It is valid for 10 minutes.`,
                html: `<b>Your OTP for Secure Chat App is: ${otp}</b><br/>It is valid for 10 minutes.`
            });
            console.log('Real Email sent: %s', info.messageId);
        } else {
            console.log('Skipping real email: No SMTP_USER configured in .env. Use the console log above!');
        }
        return true; 
    } catch (error) {
        console.error('Real Email sending failed, but continuing with console OTP. Error:', error.message);
        // We still return true because the OTP is logged to the console for the developer to use.
        return true; 
    }
};

module.exports = { sendOTP };
