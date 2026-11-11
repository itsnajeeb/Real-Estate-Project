import mongoose from 'mongoose';

const userShema = mongoose.Schema({
    name: {
        type: String,
        required: [true, "Name is required"],
        trim: true,
        minlength: 2,
        maxlength: 100,
    },

    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
        select: false,

    },
    role: {
        type: String,
        enum: ["buyer", "seller", "admin"],
        default: "buyer"
    },
    phone: {
        type: String,
        trim: true,
    },
    isBlocked: {
        type: Boolean,
        default: false,
    },
    profilePic: {
        type: String,
        default: "",
    },
    address: {
        type: String,
    },
    isApproved: {
        type: Boolean,
        default: true,
    },
    isVerified: {
        type: Boolean,
        default: false,
    },

    // Email Verification
    verificationToken: {
        type: String,
        select: false,
    },
    verificationTokenExpire: {
        type: Date,
        select: false,
    },

    // Password Reset
    resetPasswordToken: {
        type: String,

    },
    resetPasswordExpire: {
        type: Date
    },
    // Activity
    lastLogin: {
        type: Date,
    },

}, { timestamps: true })

const User = mongoose.model("User", userShema)

export default User;