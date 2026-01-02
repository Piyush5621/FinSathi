# Supabase Setup Guide for FinSathi

Welcome to the **FinSathi** Supabase setup guide. This document will walk you through setting up your database, authentication, and storage to get the application running perfectly.

---

## 🚀 1. Create a Supabase Project

1.  Go to [supabase.com](https://supabase.com) and sign in.
2.  Click **"New Project"**.
3.  Choose your **Organization**.
4.  Enter a **Name** (e.g., `FinSathi-Prod`).
5.  Set a strong **Database Password** (Save this!).
6.  Choose a **Region** close to you (e.g., `Mumbai`).
7.  Click **"Create new project"**.

---

## 🗄️ 2. Database Setup (Migrations)

Once your project is ready (green status), you need to create the database tables. We have prepared SQL migration files for you in `database/migrations/`.

1.  Go to the **SQL Editor** tab in the Supabase Dashboard (left sidebar).
2.  Click **"New Query"**.
3.  **Run Migrations in Order**:
    Copy the content of each file from your project's `database/migrations/` folder and paste it into the SQL Editor, then click **RUN** for each:

    -   `01_create_users_table.sql` (Creates Users table)
    -   `02_create_customers_table.sql` (Creates Customers table)
    -   `03_create_inventory_table.sql` (Creates Inventory table)
    -   `04_create_sales_table.sql` (Creates Sales table)
    -   `05_create_sale_items_table.sql` (Creates Sale Items table)

    *(Alternatively, you can just content of `database/schema.sql` which combines them all).*

---

## 🔐 3. Authentication Setup

FinSathi uses custom JWT authentication (`authMiddleware.js`), but it relies on the Supabase `users` table we created.

### Google OAuth (Optional)
If you want to enable "Continue with Google" directly via Supabase Auth in the future:
1.  Go to **Authentication** -> **Providers** in Supabase.
2.  Enable **Google**.
3.  You will need a **Client ID** and **Secret** from the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
4.  Add the **Redirect URL** provided by Supabase to your Google Console credentials.

*Note: The current FinSathi `Register` page uses a custom Direct Registration flow (Name, Email, Password) that stores data in our `public.users` table.*

---

## 🗃️ 4. Storage Setup

We need storage for Business Logos and Invoice PDFs.

1.  Go to the **Storage** tab in Supabase.
2.  Click **"New Bucket"**.
3.  Name it: **`finsathi-assets`**.
4.  Set it to **Public**.
5.  Click **Create**.

---

## 🌍 5. Environment Variables

Connect your code to this Supabase project.

1.  Go to **Project Settings** (Cog icon) -> **API**.
2.  Copy the **Project URL** and **`anon` public key**.

### Backend (`backend/.env`)
```env
PORT=5000
SUPABASE_URL=your_project_url
SUPABASE_KEY=your_anon_key
JWT_SECRET=super_secret_key_change_this
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

### Frontend (`frontend/.env`)
```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_KEY=your_anon_key
```

---

## ✅ Summary of Features
-   **Direct Registration**: The `Register.jsx` page captures user details and creates a record in the `users` table.
-   **JWT Auth**: The backend signs a token upon login/register, enabling secure access.
-   **RLS Security**: Your database tables have Row Level Security enabled (via the SQL migrations) to prepare for strict data access control.

You are now ready to launch! 🚀
