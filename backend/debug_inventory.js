
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

(async () => {
    const { data, error } = await supabase
        .from('inventory')
        .select(`
            name, 
            price, 
            inventory_batches (
                batch_name, 
                selling_price, 
                stock
            )
        `)
        .limit(3);

    if (error) console.error(error);
    else console.log(JSON.stringify(data, null, 2));
})();
