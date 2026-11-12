
import User from "../models/user.model.js";
import { uploadToCloudinary } from "../utils/uploadCloudinary.js";

// GET LOGGED-IN USER PROFILE
export const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.status(200).json({
            success: true,
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


// GET PUBLIC USER PROFILE
export const getPublicProfile = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id)
            .select("name profilePic role createdAt");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.status(200).json({
            success: true,
            user,
        });

    } catch (error) {
        console.error("Public Profile Fetching Error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};


// UPDATE USER PROFILE
export const updateProfile = async (req, res) => {
    try {
        const { name, phone, address, removeProfilePic } = req.body;

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Update basic information
        if (name !== undefined) {
            user.name = name.trim();
        }

        if (phone !== undefined) {
            user.phone = phone.trim();
        }

        if (address !== undefined) {
            user.address = address.trim();
        }

        // Remove profile picture
        if (removeProfilePic === "true" || removeProfilePic === true) {
            user.profilePic = null;
        }

        // Upload new profile picture
        else if (req.file) {

            const result = await uploadToCloudinary(
                req.file.buffer,
                "profiles"
            );

            user.profilePic = result.secure_url;
        }

        const updatedUser = await user.save();

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: {
                ...updatedUser.toObject(),
                password: undefined,
            },
        });

    } catch (error) {
        console.error("Profile Update Error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
