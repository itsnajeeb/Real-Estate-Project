
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

// Protect Routes
export const protect = async (req, res, next) => {
    try {
        //  Get token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Not authorized. Token missing.",
            });
        }

        const token = authHeader.split(" ")[1];

        // Verify JWT token
        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is missing");
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find user in database
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User no longer exists. Please login again.",
            });
        }

        // Check blocked account
        if (user.isBlocked) {
            return res.status(403).json({
                success: false,
                message: "Your account has been blocked by admin.",
            });
        }

        // Check token version
        if (
            decoded.tokenVersion !== undefined &&
            decoded.tokenVersion !== user.tokenVersion
        ) {
            return res.status(401).json({
                success: false,
                message: "Session expired. Please login again.",
            });
        }

        // Attach user to request
        req.user = user;

        // Continue to next middleware/controller
        next();

    } catch (error) {
        console.error("Authorization Error:", error.message);

        if (
            error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError" ||
            error.name === "NotBeforeError"
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token. Please login again.",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};



// Role Based Authorization
export const authorize = (...roles) => {
    return (req, res, next) => {
        try {
            // Check authenticated user
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: "Please login first.",
                });
            }

            // Check user role
            if (!roles.includes(req.user.role)) {
                return res.status(403).json({
                    success: false,
                    message: "Access Denied. You don't have permission.",
                });
            }

            // Allow access
            next();

        } catch (error) {
            console.error("Authorization Error:", error.message);

            return res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    };
};
