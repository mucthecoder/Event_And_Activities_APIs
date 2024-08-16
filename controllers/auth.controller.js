const User = require("../models/user.model");
const crypto = require('crypto');
const bcrypt = require("bcryptjs");
const transporter = require('../utils/transport');
const generateTokenAndSetCookie = require("../utils/generateToken");

const login = async(req,res) =>{
    try {
        const {email,password} = req.body;

        if (!email || !password ) {
            return res.status(400).json({ error: "All details are required" });
        }

        const findUser = await User.findOne({ email });

        const isPasswordCorrect = await bcrypt.compare(password,findUser?.password || "");

        if(!findUser || !isPasswordCorrect){
            return res.status(400).json({error:"Invalid email or password"});
        }

        const token = generateTokenAndSetCookie(findUser._id,res);

        res.status(201).json({
            token
        });

    } catch (error) {
        console.log("Error in login controller", error.message);
        res.status(500).json({error:"Internal Server Error"});
    }
};

const signup = async (req, res) => {
    try {
        const {fullname, email, password} = req.body;
        let { role } = req.body;

         // Validate input data
        if (!fullname || !email || !password ) {
            return res.status(400).json({ error: "All details are required" });
        }

        if(!role){
            role = "user";
        }

        const type_of_users = ['user', 'admin'];

        if (!type_of_users.includes(role)) {
            return res.status(400).json({ error: "undefined user type" });
        }

        const existingUserByEmail = await User.findOne({ email });
        if (existingUserByEmail) {
            return res.status(400).json({ error: "email is already registered" });
        }
        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = new User({
            fullname,
            email,
            password: hashedPassword,
            role
        });

        await newUser.save();

        const token = generateTokenAndSetCookie(newUser._id, res);

        res.status(201).json({
            token
        });

    } catch (error) {
        // Log the error for debugging
        console.error("Error in signup controller:", error.message);

        // Respond with generic error message
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const logout = async(req,res) =>{
    try {
        res.cookie("jwt","",{maxAge:0});
        res.status(200).json({message:"Logged out successfully"});
    } catch (error) {
        console.log("Error in logout controller", error.message);
        res.status(500).json({error:"Internal Server Error"});
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: "User not found" });
        }

        const resetToken = Math.floor(1000 + Math.random() * 9000);
        const hash = await bcrypt.hash(resetToken, 10);

        user.resetPasswordToken = hash;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        const mailOptions = {
            to: user.email,
            from: process.env.EMAIL_USER,
            subject: 'Password Reset Request',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
                    <h2 style="color: #007bff; text-align: center;">Password Reset Request</h2>
                    <p>Dear ${user.fullname || 'User'},</p>
                    <p>You are receiving this email because you (or someone else) requested a password reset for your account.</p>
                    <p>Please use the following 4-digit code to reset your password:</p>
                    <div style="text-align: center; margin: 20px 0;">
                        <span style="font-size: 24px; font-weight: bold; background-color: #f8f9fa; padding: 10px 20px; border: 1px solid #007bff; border-radius: 5px; color: #007bff;">
                            ${resetToken}
                        </span>
                    </div>
                    <p>This code is valid for 1 hour. If you did not request a password reset, please ignore this email, and your password will remain unchanged.</p>
                    <p style="margin-top: 30px;">Best regards,</p>
                    <p><strong>Your Company Name</strong></p>
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                    <p style="font-size: 12px; color: #999;">If you did not request this email, please contact our support team immediately.</p>
                </div>
            `,
        };

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.error('Error sending email: ', err);
                return res.status(500).send('Error sending email');
            }
            res.status(200).json({ message: 'Email sent', resetToken});
        });

    } catch (error) {
        console.log("Error in forgotPassword controller", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { resetToken } = req.params;
        const { email } = req.body;
        if (!resetToken) {
            return res.status(400).json({ error: "reset Token is required" });
        }

        const user = await User.findOne({
            email,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ error: "Invalid or expired resetToken" });
        }

        const isMatch = await bcrypt.compare(resetToken, user.resetPasswordToken);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid or expired reset Token" });
        }

        res.status(200).json({ message: "Valid reset token", userId: user._id });
    } catch (error) {
        console.log("Error in resetPassword controller", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const setNewPassword = async (req, res) => {
    try {
        const { userId, newPassword } = req.body;
        if (!userId || !newPassword) {
            return res.status(400).json({ error: "All details are required" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(400).json({ error: "User not found" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        console.log("Error in setNewPassword controller", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports = {
    login,
    signup,
    logout,
    forgotPassword,
    resetPassword,
    setNewPassword
}