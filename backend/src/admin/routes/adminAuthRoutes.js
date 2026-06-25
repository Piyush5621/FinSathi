import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();

router.post("/login", (req, res) => {
    const { username, password } = req.body;

    const adminUsername = process.env.ADMIN_USERNAME || "admin@finsathi.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "finadmin123";

    if (username === adminUsername && password === adminPassword) {
        const secret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || "admin_secret";
        const token = jwt.sign(
            { id: "admin-system", role: "admin" },
            secret,
            { expiresIn: "12h" }
        );

        return res.status(200).json({
            message: "Admin authenticated successfully",
            token,
            admin: { username }
        });
    }

    return res.status(401).json({ message: "Invalid admin credentials" });
});

export default router;
