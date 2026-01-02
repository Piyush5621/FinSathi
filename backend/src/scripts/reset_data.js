import { supabase } from "../config/db.js";

const clearData = async () => {
    try {
        console.log("Starting data cleanup...");

        // 1. Delete Sale Items (Child of Sales and Inventory)
        // Note: Using neq id 0 to simulate 'delete all' which supabase-js requires a filter for
        const { error: saleItemsError } = await supabase
            .from("sale_items")
            .delete()
            .neq("quantity", -999999); // Dummy filter to match all
        if (saleItemsError) console.error("Error deleting sale_items:", saleItemsError);
        else console.log("✅ Sale items cleared.");

        // 2. Delete Payments (Child of Sales/Users)
        const { error: paymentsError } = await supabase
            .from("payments")
            .delete()
            .neq("amount", -1);
        if (paymentsError) console.error("Error deleting payments:", paymentsError);
        else console.log("✅ Payments cleared.");

        // 3. Delete Sales (Child of Users/Customers)
        const { error: salesError } = await supabase
            .from("sales")
            .delete()
            .neq("total", -1); // Dummy filter
        if (salesError) console.error("Error deleting sales:", salesError);
        else console.log("✅ Sales cleared.");

        // 4. Delete Inventory Batches (Child of Inventory)
        const { error: batchesError } = await supabase
            .from("inventory_batches")
            .delete()
            .neq("stock", -1);
        if (batchesError) console.error("Error deleting inventory batches:", batchesError);
        else console.log("✅ Inventory batches cleared.");

        // 5. Delete Inventory/Products (Parent)
        const { error: inventoryError } = await supabase
            .from("inventory")
            .delete()
            .neq("price", -1);
        if (inventoryError) console.error("Error deleting inventory:", inventoryError);
        else console.log("✅ Inventory/Products cleared.");

        console.log("🎉 Data cleanup complete. Customers kept intact.");
        process.exit(0);

    } catch (err) {
        console.error("Unexpected error:", err);
        process.exit(1);
    }
};

clearData();
