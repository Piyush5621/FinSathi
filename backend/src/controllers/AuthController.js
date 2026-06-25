import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { supabase } from "../config/db.js";
import { sendWelcomeEmail } from "../services/emailService.js";



/** ---------------------------
 *  REGISTER NEW USER
 * ----------------------------*/
export const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      businessName,
      businessType,
      city,
      state,
      phone,
    } = req.body;

    // ✅ 1. Field Validation
    if (!name || !email || !password || !businessName || !phone) {
      return res
        .status(400)
        .json({ message: "Please fill in all required fields." });
    }

    // ✅ 2. Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({
        message: "An account with this email already exists. Please login.",
      });
    }

    // ✅ 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ 4. Insert new user
    // ✅ 4. Insert new user
    const { data: newUser, error } = await supabase
      .from("users")
      .insert([
        {
          name,
          email,
          password: hashedPassword,
          business_name: businessName,
          business_type: businessType,
          city,
          state,
          phone,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Supabase Insert Error:", error.message);
      return res
        .status(500)
        .json({ message: `Database error: ${error.message}` });
    }

    // ✅ 5. Send Welcome Email
    await sendWelcomeEmail(email, name, businessName);

    // ✅ 6. Generate Token
    const secret = process.env.JWT_SECRET || "supersecret_jwt_key_change_me_in_production";
    const token = jwt.sign(
      { id: newUser?.id || email, email: email, name: name }, // specific payload
      secret,
      { expiresIn: "7d" }
    );

    // ✅ 7. Return Success
    // ✅ 7. Return Success
    res
      .status(201)
      .json({ message: "User registered successfully", token, user: newUser });
  } catch (err) {
    console.error("Register Error:", err.message);
    res
      .status(500)
      .json({ message: "Registration failed", error: err.message });
  }
};

/** ---------------------------
 *  LOGIN USER
 * ----------------------------*/
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ✅ Find user by email
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      console.error("Supabase Login Error:", error.message);
      return res.status(500).json({ message: "Database error during login", error: error.message });
    }

    if (!user) {
      console.warn(`Login attempt failed: User not found for email ${email}`);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // ✅ Check if account is suspended
    if (user.is_active === false) {
      console.warn(`Login attempt blocked: Account suspended for email ${email}`);
      return res.status(403).json({ error: "ACCOUNT_SUSPENDED", message: "Account Suspended: Please contact support." });
    }

    // ✅ Compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.warn(`Login attempt failed: Password mismatch for email ${email}`);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    console.log(`User logged in successfully: ${email}`);

    // ✅ Generate Token
    const secret = process.env.JWT_SECRET || "supersecret_jwt_key_change_me_in_production";
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      secret,
      { expiresIn: "7d" }
    );

    // ✅ Success response
    res.status(200).json({ message: "Login successful", token, user });
  } catch (err) {
    console.error("CRITICAL LOGIN ERROR:", err);
    res.status(500).json({ message: "Login failed", error: err.message });
  }
};



export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id; // ✅ Use secure ID from token instead of query email
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch profile", error: err.message });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const updates = req.body;
    
    // Safety check: do not allow updating email or id directly to prevent corruption
    delete updates.email;
    delete updates.id;

    const { error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", req.user.id);

    if (error) throw error;
    res.json({ message: "Profile updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Update failed", error: err.message });
  }
};