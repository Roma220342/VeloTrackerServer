const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS 
    }
});

const sendResetEmail = async (email, code) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'VeloTracker: Your Password Reset Code',
        html: `
            <div style="font-family: 'Whitney', 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; background-color: #f7f9fc; border-radius: 8px;">
                <div style="max-width: 600px; margin: auto; background-color: #ffffff; padding: 30px; border-radius: 8px; border: 1px solid #e0e4e8;">
                    <h2 style="color: #5865f2; margin-bottom: 20px;">Hey there, VeloTracker User!</h2>
                    
                    <p style="font-size: 16px; line-height: 1.6; color: #4f5660;">
                        Looks like you (or someone who knows your email) requested a password reset for your VeloTracker account. No worries—it happens to the best of us!
                    </p>
                    
                    <p style="font-size: 16px; line-height: 1.6; color: #4f5660;">
                        To confirm this request and set up a new password, please use the 6-digit code below:
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <span style="display: inline-block; background-color: #5865f2; color: #ffffff; font-size: 32px; font-weight: bold; padding: 10px 20px; border-radius: 4px; letter-spacing: 5px;">
                            ${code}
                        </span>
                    </div>
                    
                    <p style="font-size: 16px; line-height: 1.6; color: #4f5660;">
                        <strong style="color: #e35a34;">Heads up:</strong> This code is only valid for the next <strong>10 minutes</strong>. If you don't use it in time, you'll need to request a new one.
                    </p>

                    <hr style="border: 0; border-top: 1px solid #e0e4e8; margin: 25px 0;">
                    
                    <p style="font-size: 14px; color: #99aab5; text-align: center;">
                        Not expecting this email? You can safely ignore it. Your password will remain unchanged.
                    </p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Password reset code successfully sent to ${email}`);
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

module.exports = sendResetEmail;