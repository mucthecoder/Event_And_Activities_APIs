const User = require("../models/user.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const generateTokenAndSetCookie = require("../utils/generateToken");

const login = async(req,res) =>{
    try {
        const {email,password} = req.body;
        // Validate input data
        if (!email || !password ) {
            return res.status(400).json({ error: "All details are required" });
        }

        const findUser = await User.findOne({email});

        const isPasswordCorrect = await bcrypt.compare(password,findUser?.password || "");

        if(!findUser || !isPasswordCorrect){
            return res.status(400).json({error:"Invalid username or password"});
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

        const existingUserByUsername = await User.findOne({ email });
        if (existingUserByUsername) {
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

        const resetToken = crypto.randomBytes(32).toString("hex");
        const hash = await bcrypt.hash(resetToken, 10);

        user.resetPasswordToken = hash;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;

        const mailOptions = {
            to: user.email,
            from: process.env.EMAIL_USER,
            subject: 'Password Reset',
            text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n` +
                  `Please click on the following link, or paste this into your browser to complete the process:\n\n` +
                  `${resetUrl}\n\n` +
                  `If you did not request this, please ignore this email and your password will remain unchanged.\n`
        };

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.error('Error sending email: ', err);
                return res.status(500).send('Error sending email');
            }
            res.json({ message: 'Email sent', resetToken});
        });
    } catch (error) {
        console.log("Error in forgotPassword controller", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        if (!token) {
            return res.status(400).json({ error: "Token is required" });
        }

        const user = await User.findOne({
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ error: "Invalid or expired token" });
        }

        const isMatch = await bcrypt.compare(token, user.resetPasswordToken);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid or expired token" });
        }

        res.status(200).json({ message: "Valid token", userId: user._id });
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