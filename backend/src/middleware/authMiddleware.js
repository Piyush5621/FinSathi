import jwt from "jsonwebtoken";
import { supabase } from "../config/db.js";

export const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }

    try {
        const secret = process.env.JWT_SECRET || "supersecret_jwt_key_change_me_in_production";
        const verified = jwt.verify(token, secret);
        
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
