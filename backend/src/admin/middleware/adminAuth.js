import jwt from "jsonwebtoken";

export const adminAuth = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Admin access denied. No token provided." });
    }

    try {
        const secret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || "admin_secret";
        const verified = jwt.verify(token, secret);
        
        // Ensure only admin roles can pass
        if (verified.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Not an admin." });
        }
        
        req.admin = verified;
        next();
    } catch (err) {
        res.status(403).json({ message: "Invalid or expired admin token." });
    }
};
