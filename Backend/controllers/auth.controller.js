
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import sendEmail from "../utils/sendEmail.js";
import jwt from "jsonwebtoken";

const escapeHtml = (value = "") => {

    return String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    })[char]);
};

// User Register
export const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required",
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters",
            });
        }

        // 2. Allow only buyer and seller registration
        const userRole = role || "buyer";

        // if (!["buyer", "seller"].includes(userRole)) {
        //     return res.status(400).json({
        //         success: false,
        //         message: "Invalid registration role. Admin Can't Registerd",
        //     });
        // }

        const normalizedEmail = email.trim().toLowerCase();

        // Check existing user
        const userExist = await User.findOne({
            email: normalizedEmail,
        });

        if (userExist) {
            return res.status(409).json({
                success: false,
                message: "User already exists. with this Email.",
            });
        }

        // Hash password
        const hashPassword = await bcrypt.hash(password, 12);

        // Generate 6-digit OTP
        const verificationToken = crypto
            .randomInt(100000, 1000000)
            .toString();

        // OTP expires after 15 minutes
        const verificationTokenExpire = new Date(
            Date.now() + 15 * 60 * 1000
        );

        // Create user
        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashPassword,
            role: userRole,
            isVerified: false,

            // Sellers require admin approval
            isApproved: userRole === "buyer",

            verificationToken,
            verificationTokenExpire,
        });

        // Send verification email
        try {
            await sendEmail({
                email: user.email,
                name: user.name,
                subject: "Verify Your Email - Real Estate",

                html: `
                    <div style="font-family: Arial; padding: 20px;">
                        <h2>Welcome ${escapeHtml(user.name)}!</h2>

                        <p>Thank you for registering with us.</p>

                        <p>Your email verification code is:</p>

                        <h1 style="color: #2563eb; letter-spacing: 5px;">
                            ${verificationToken}
                        </h1>

                        <p>Enter this code on the verification page.</p>

                        <p>This OTP will expire in 15 minutes.</p>

                        <p>If you did not create this account,
                        please ignore this email.</p>
                    </div>
                `,
            });

        } catch (emailError) {
            console.error("Verification email failed:", emailError.message);

            // Delete account if verification email cannot be sent.
            await User.findByIdAndDelete(user._id);

            return res.status(503).json({
                success: false,
                message: "Unable to send verification email. Please try again.",
            });
        }

        // Success response
        return res.status(200).json({
            success: true,
            message: "Registration successful. Please verify your email.",
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isVerified: user.isVerified,
                isApproved: user.isApproved,
            },
        });

    } catch (error) {
        console.error("Registration Error:", error);

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Email already registered",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};


// Login Controller
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Find user and explicitly select password
        const user = await User.findOne({
            email: normalizedEmail,
        }).select("+password");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        // Check password
        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        // Check blocked account
        if (user.isBlocked) {
            return res.status(403).json({
                success: false,
                message: "Your account has been blocked by admin. Please contact support.",
            });
        }

        // Check email verification
        if (!user.isVerified) {
            return res.status(403).json({
                success: false,
                message: "Please verify your email before logging in.",
                isVerified: false,
            });
        }

        // Check seller approval
        if (user.role === "seller" && !user.isApproved) {
            return res.status(403).json({
                success: false,
                message: "Your seller account is waiting for admin approval.",
                isApproved: false,
            });
        }

        // Check JWT secret
        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is missing in environment variables");
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                id: user._id,
                role: user.role,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d",
            }
        );

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Safe user response
        const userData = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            profilePic: user.profilePic,
            address: user.address,
            isVerified: user.isVerified,
            isApproved: user.isApproved,
        };

        //  Send response
        return res.status(200).json({
            success: true,
            message: "Logged in successfully",
            token,
            user: userData,
        });

    } catch (error) {
        console.error("Login Error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};


// Get Logged-in User Profile
export const getMe = async (req, res) => {
    try {
        // Find logged-in user
        const user = await User.findById(req.user.id).select(
            "name email role phone profilePic address isBlocked isApproved isVerified lastLogin createdAt"
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Check blocked account
        if (user.isBlocked) {
            return res.status(403).json({
                success: false,
                message: "Your account has been blocked. Please contact support.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Profile fetched successfully",
            user,
        });

    } catch (error) {
        console.error("Profile Fetching Error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};


// Verify Email
export const verifyEmail = async (req, res) => {
    try {
        const { email, code } = req.body;

        // Validate input
        if (!email || !code) {
            return res.status(400).json({
                success: false,
                message: "Email and verification code are required",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Find user and retrieve hidden verification fields
        const user = await User.findOne({
            email: normalizedEmail,
        }).select(
            "+verificationToken +verificationTokenExpire"
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Check already verified
        if (user.isVerified) {
            return res.status(400).json({
                success: false,
                message: "Email is already verified",
            });
        }

        // Check OTP existence
        if (!user.verificationToken || !user.verificationTokenExpire) {
            return res.status(400).json({
                success: false,
                message: "Verification code is invalid or expired. Please request a new code.",
            });
        }

        // Check OTP expiration
        if (user.verificationTokenExpire.getTime() < Date.now()) {
            return res.status(400).json({
                success: false,
                message: "Verification code has expired. Please request a new code.",
            });
        }

        // Check OTP
        if (String(user.verificationToken) !== String(code).trim()) {
            return res.status(400).json({
                success: false,
                message: "Invalid verification code",
            });
        }

        //  Verify email
        user.isVerified = true;

        // Clear verification data
        user.verificationToken = undefined;
        user.verificationTokenExpire = undefined;

        await user.save();

        //  Success response
        return res.status(200).json({
            success: true,
            message: "Email verified successfully. You can now log in.",
        });

    } catch (error) {
        console.error("Email Verification Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};


// Forgot Password
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        //  Validate email
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        //  Find user
        const user = await User.findOne({
            email: normalizedEmail,
        });

        // Use a generic response to avoid revealing registered emails
        const successMessage =
            "If an account exists with this email, a password reset link will be sent.";

        if (!user) {
            return res.status(200).json({
                success: true,
                message: successMessage,
            });
        }

        //  Generate reset token
        const resetToken = crypto.randomBytes(32).toString("hex");

        //  Hash token before storing in database
        const hashedToken = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");

        //  Set token expiration (15 minutes)
        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpire = new Date(
            Date.now() + 15 * 60 * 1000
        );

        await user.save();

        //  Generate reset URL
        const clientUrl = process.env.FRONTEND_URL;

        if (!clientUrl) {
            throw new Error("FRONTEND_URL is missing in .env");
        }

        const resetUrl =
            `${clientUrl.replace(/\/$/, "")}/reset-password/${resetToken}`;

        // Prepare email
        const html = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>Password Reset Request</h2>

                <p>Hello ${String(user.name).replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char])},</p>

                <p>You requested a password reset.</p>

                <p>Click the button below to reset your password:</p>

                <a href="${resetUrl}"
                   style="background: #2563eb;
                          color: white;
                          padding: 12px 20px;
                          text-decoration: none;
                          border-radius: 5px;
                          display: inline-block;">
                    Reset Password
                </a>

                <p>This link will expire in 15 minutes.</p>

                <p>If you did not request this password reset,
                   please ignore this email.</p>
            </div>
        `;

        // Send email through Brevo
        try {
            await sendEmail({
                email: user.email,
                name: user.name,
                subject: "Password Reset - Real Estate Platform",
                html,
            });

        } catch (emailError) {
            console.error("Password Reset Email Error:", emailError);

            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;

            await user.save();

            return res.status(503).json({
                success: false,
                message: "Unable to send password reset email. Please try again.",
            });
        }

        //  Success response
        return res.status(200).json({
            success: true,
            message: successMessage,
        });

    } catch (error) {
        console.error("Forgot Password Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};


// Reset Password
export const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        // Validate input
        if (!token || !password) {
            return res.status(400).json({
                success: false,
                message: "Token and new password are required",
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters",
            });
        }

        //  Hash received token
        const resetPasswordToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        //  Find user with valid reset token
        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: new Date() },
        }).select("+resetPasswordToken +resetPasswordExpire");

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired password reset token",
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Update password
        user.password = hashedPassword;

        //  Clear reset token
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        //  Save changes
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password updated successfully. Please login with your new password.",
        });

    } catch (error) {
        console.error("Reset Password Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
