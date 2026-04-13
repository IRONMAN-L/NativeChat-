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
    const brandColor = '#00e5ff';
    const htmlTemplate = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: ${brandColor}; margin: 0; font-size: 28px;">NativeChat</h1>
                <p style="color: #666; font-size: 14px; margin-top: 5px;">Your Secure Messenger</p>
            </div>
            <div style="background-color: #f9f9f9; padding: 30px; border-radius: 8px; text-align: center;">
                <p style="font-size: 16px; color: #333; margin-top: 0;">Hello there,</p>
                <p style="font-size: 16px; color: #333;">To access your account, please use the following one-time password:</p>
                <div style="margin: 30px 0;">
                    <span style="font-size: 42px; font-weight: bold; color: ${brandColor}; letter-spacing: 5px; background: #eee; padding: 10px 20px; border-radius: 4px;">${otp}</span>
                </div>
                <p style="font-size: 14px; color: #999;">This code is valid for 10 minutes. Please do not share this code with anyone.</p>
            </div>
            <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
                <p>&copy; 2026 NativeChat Team. All rights reserved.</p>
                <p>This is an automated message, please do not reply.</p>
            </div>
        </div>
    `;

    // Always log to console for development convenience
    console.log("==========================================");
    console.log(`🔑 SECURE OTP FOR [${email}] is: [${otp}]`);
    console.log("==========================================");

    try {
        if (process.env.SMTP_USER) {
            const info = await transporter.sendMail({
                from: `"NativeChat Security" <${process.env.SMTP_FROM || 'noreply@nativechat.com'}>`,
                to: email,
                subject: `${otp} is your NativeChat verification code`,
                text: `Your NativeChat OTP is: ${otp}. It is valid for 10 minutes.`,
                html: htmlTemplate
            });
            console.log('Production Email sent: %s', info.messageId);
        } else {
            console.log('Skipping SMTP: No SMTP_USER configured. Use the console log above for testing.');
        }
        return true; 
    } catch (error) {
        console.error('Email delivery error:', error.message);
        // We still return true to allow local testing to continue if only SMTP fails
        return true; 
    }
};

module.exports = { sendOTP };
