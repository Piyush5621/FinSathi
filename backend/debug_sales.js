
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

(async () => {
    // 1. Fetch Sales (count and latest dates)
    const { data: sales, error } = await supabase
        .from('sales')
        .select('*')
        .order('date', { ascending: false });

    if (error) console.error("Sales Error:", error);
    else {
        console.log(`Total Sales Found: ${sales.length}`);
        if (sales.length > 0) {
            console.log("Latest Sale:", sales[0]);
            console.log("Oldest Sale:", sales[sales.length - 1]);
        }
    }
})();
