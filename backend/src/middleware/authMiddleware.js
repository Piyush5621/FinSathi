import jwt from "jsonwebtoken";
import { supabase } from "../config/db.js";

export const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }

    try {
        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ message: "JWT secret not configured on server." });
        }
        let verified;
        try {
            verified = jwt.verify(token, process.env.JWT_SECRET);
        } catch (verifyErr) {
            // Graceful fallback for existing browser sessions signed with legacy key
            if (verifyErr.name === "JsonWebTokenError") {
                verified = jwt.verify(token, "supersecret_jwt_key_change_me_in_production");
            } else {
                throw verifyErr;
            }
        }


        
        // Normalize user ID across JWT variations
        const userId = verified.id || verified.user_id || verified.sub;
        verified.id = userId;
        verified.user_id = userId;

        // Add is_active check
        if (userId) {
            const { data: user, error } = await supabase
                .from("users")
                .select("is_active")
                .eq("id", userId)
                .maybeSingle();
                
            if (user && user.is_active === false) {
                return res.status(403).json({ error: "ACCOUNT_SUSPENDED", message: "Account suspended. Please contact support." });
            }
        }

        req.user = verified;
        req.userId = userId;
        next();
    } catch (err) {
        res.status(401).json({ message: "Invalid or expired token.", error: "TOKEN_EXPIRED" });
    }
};
