import { supabase } from "../config/db.js";
import { SalesRepository } from "../repositories/SalesRepository.js";
import { CustomerRepository } from "../repositories/CustomerRepository.js";
import { ExpenseRepository } from "../repositories/ExpenseRepository.js";
import { HealthScoreService } from "./HealthScoreService.js";
import { FinancialCacheService, FinancialCacheKeys } from "../utils/cache.js";

/**
 * DashboardService — Business Command Center Engine
 * Aggregates holistic MSME operational, financial, inventory, customer,
 * and intelligence metrics across the business.
 */
export const DashboardService = {
    async getDashboardData(userId, orgId = null, storeId = null) {
        const targetId = orgId || userId;
        const cacheKey = FinancialCacheKeys.dashboard(storeId ? `${targetId}_store_${storeId}` : targetId);

        // 1. Try cache
        const cachedData = await FinancialCacheService.get(cacheKey);
        if (cachedData) {
            return cachedData;
        }

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000));
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        // 1. Fetch Fundamental Data in Parallel
        const [
            salesRaw,
            allExpensesRaw,
            productsRaw,
            customersRaw,
            paymentsRaw,
            purchaseOrdersRaw,
            healthScoreData
        ] = await Promise.all([
            (async () => {
                try {
                    return await SalesRepository.findAllSales(userId, 5000, 'date', false);
                } catch (e) {
                    return [];
                }
            })(),
            (async () => {
                try {
                    return await ExpenseRepository.findAll(userId);
                } catch (e) {
                    return [];
                }
            })(),
            (async () => {
                try {
                    const res = await supabase.from('inventory').select('id, name, price, cost_price, stock, low_stock_threshold, inventory_batches(stock)').eq('user_id', userId);
                    return res || { data: [] };
                } catch (e) {
                    return { data: [] };
                }
            })(),
            (async () => {
                try {
                    const res = await supabase.from('customers').select('id, name, phone, created_at, outstanding_balance').eq('user_id', userId);
                    return res || { data: [] };
                } catch (e) {
                    return { data: [] };
                }
            })(),
            (async () => {
                try {
                    const res = await supabase.from('payments').select('id, amount, date, payment_mode, customer_id, customers(name)').eq('user_id', userId).order('date', { ascending: false }).limit(20);
                    return res || { data: [] };
                } catch (e) {
                    return { data: [] };
                }
            })(),
            (async () => {
                try {
                    const res = await supabase.from('purchase_orders').select('id, order_no, total_amount, status, created_at, store_id, suppliers(name)').eq('user_id', userId).order('created_at', { ascending: false }).limit(20);
                    return res || { data: [] };
                } catch (e) {
                    return { data: [] };
                }
            })(),
            (async () => {
                try {
                    return await HealthScoreService.calculateAndLog(userId, orgId);
                } catch (e) {
                    return null;
                }
            })()
        ]);

        let sales = salesRaw || [];
        let allExpenses = allExpensesRaw || [];
        let products = productsRaw?.data || [];
        const customers = customersRaw?.data || [];
        const payments = paymentsRaw?.data || [];
        let purchaseOrders = purchaseOrdersRaw?.data || [];

        // Apply Store Branch Filter if specified
        if (storeId) {
            sales = sales.filter(s => !s.store_id || s.store_id === storeId);
            allExpenses = allExpenses.filter(e => !e.store_id || e.store_id === storeId);
            purchaseOrders = purchaseOrders.filter(po => !po.store_id || po.store_id === storeId);
        }

        // 2. Metrics & Aggregations
        let currentMonthRevenue = 0;
        let lastMonthRevenue = 0;
        let currentMonthOrders = 0;
        let lastMonthOrders = 0;
        
        let todayRevenue = 0;
        let todayOrders = 0;
        let yesterdayRevenue = 0;
        let yesterdayOrders = 0;

        let outstandingAmount = 0;
        let totalProfit = 0;
        let todayProfit = 0;
        let currentMonthInflow = 0;
        let currentMonthExpense = 0;

        const customerDuesMap = {}; // customerId -> due amount
        const customerSalesCountMap = {}; // customerId -> count
        const customerSalesTotalMap = {}; // customerId -> total spent
        const soldProductQtyMap = {}; // productId -> quantity sold
        const soldProductRevenueMap = {}; // productId -> revenue
        const soldProductProfitMap = {}; // productId -> profit
        const soldProductSet30Days = new Set();

        const trendMapDaily = {}; // YYYY-MM-DD -> { revenue, orders, profit }
        const hourMapToday = Array(24).fill(0).map((_, h) => ({ hour: `${h}:00`, revenue: 0, orders: 0 }));

        const isSameDay = (d1, d2) => 
            d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();

        // Process Sales
        sales.forEach(sale => {
            const saleDate = new Date(sale.date || sale.created_at);
            const amount = Number(sale.total ?? sale.amount ?? 0);
            const amountPaid = Number(sale.amount_paid !== null && sale.amount_paid !== undefined ? sale.amount_paid : (sale.payment_status === 'paid' ? amount : 0));
            const customerId = sale.customer_id;
            const dateKey = saleDate.toISOString().split('T')[0];

            // Daily trend
            if (!trendMapDaily[dateKey]) {
                trendMapDaily[dateKey] = { revenue: 0, orders: 0, profit: 0 };
            }
            trendMapDaily[dateKey].revenue += amount;
            trendMapDaily[dateKey].orders += 1;

            // Today vs Yesterday
            if (isSameDay(saleDate, now)) {
                todayRevenue += amount;
                todayOrders++;
                const hour = saleDate.getHours();
                if (hour >= 0 && hour < 24) {
                    hourMapToday[hour].revenue += amount;
                    hourMapToday[hour].orders += 1;
                }
            } else if (isSameDay(saleDate, yesterday)) {
                yesterdayRevenue += amount;
                yesterdayOrders++;
            }

            // Current Month vs Last Month
            if (saleDate >= startOfCurrentMonth) {
                currentMonthRevenue += amount;
                currentMonthOrders++;
                currentMonthInflow += amountPaid;

                if (customerId) {
                    customerSalesCountMap[customerId] = (customerSalesCountMap[customerId] || 0) + 1;
                    customerSalesTotalMap[customerId] = (customerSalesTotalMap[customerId] || 0) + amount;
                }
            } else if (saleDate >= startOfLastMonth && saleDate <= endOfLastMonth) {
                lastMonthRevenue += amount;
                lastMonthOrders++;
            }

            // Product & Profit Calculations
            let saleProfit = 0;
            if (Array.isArray(sale.items)) {
                sale.items.forEach(item => {
                    const pId = item.productId || item.id;
                    const price = Number(item.price || item.selling_price || 0);
                    const cost = Number(item.cost_price || 0);
                    const qty = Number(item.quantity || 1);
                    const lineProfit = (price - cost) * qty;
                    const lineRevenue = price * qty;

                    saleProfit += lineProfit;

                    if (pId) {
                        if (saleDate >= thirtyDaysAgo) {
                            soldProductSet30Days.add(pId);
                        }
                        soldProductQtyMap[pId] = (soldProductQtyMap[pId] || 0) + qty;
                        soldProductRevenueMap[pId] = (soldProductRevenueMap[pId] || 0) + lineRevenue;
                        soldProductProfitMap[pId] = (soldProductProfitMap[pId] || 0) + lineProfit;
                    }
                });
            } else {
                // Approximate 20% margin if itemized cost is absent
                saleProfit = amount * 0.20;
            }

            totalProfit += saleProfit;
            if (trendMapDaily[dateKey]) {
                trendMapDaily[dateKey].profit += saleProfit;
            }
            if (isSameDay(saleDate, now)) {
                todayProfit += saleProfit;
            }

            // Dues
            const status = (sale.payment_status || '').toLowerCase();
            if (['unpaid', 'overdue', 'partial'].includes(status)) {
                const due = Math.max(0, amount - amountPaid);
                outstandingAmount += due;
                if (customerId) {
                    customerDuesMap[customerId] = (customerDuesMap[customerId] || 0) + due;
                }
            }
        });

        // Process Expenses
        let todayExpenses = 0;
        let yesterdayExpenses = 0;
        const expenseCategories = {};

        allExpenses.forEach(exp => {
            const expDate = new Date(exp.date || exp.created_at);
            const amount = Number(exp.amount || 0);
            const cat = exp.category || 'Other';
            
            expenseCategories[cat] = (expenseCategories[cat] || 0) + amount;

            if (expDate >= startOfCurrentMonth) {
                currentMonthExpense += amount;
            }
            if (isSameDay(expDate, now)) {
                todayExpenses += amount;
            } else if (isSameDay(expDate, yesterday)) {
                yesterdayExpenses += amount;
            }
        });

        // Top Expenses
        const topExpenses = Object.entries(expenseCategories)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, value]) => ({ name, value }));

        // Process Payments & Inflow
        let currentMonthPaymentsCollected = 0;
        payments.forEach(pay => {
            const payDate = new Date(pay.date || pay.created_at);
            if (payDate >= startOfCurrentMonth) {
                currentMonthPaymentsCollected += Number(pay.amount || 0);
            }
        });

        // Process Purchase Orders & Outflows
        let currentMonthPurchaseSpend = 0;
        let pendingPurchaseOrdersCount = 0;
        purchaseOrders.forEach(po => {
            const poDate = new Date(po.created_at);
            const status = (po.status || '').toLowerCase();
            if (status === 'pending' || status === 'draft' || status === 'ordered') {
                pendingPurchaseOrdersCount++;
            }
            if (poDate >= startOfCurrentMonth && (status === 'received' || status === 'completed' || status === 'paid')) {
                currentMonthPurchaseSpend += Number(po.total_amount || 0);
            }
        });

        // 3. Money Flow Calculations
        const moneyIn = Math.round(currentMonthInflow + currentMonthPaymentsCollected);
        const moneyOut = Math.round(currentMonthExpense + currentMonthPurchaseSpend);
        const netCashFlow = moneyIn - moneyOut;

        // 4. Inventory Metrics & Valuation
        let totalInventoryValue = 0;
        let lowStockCount = 0;
        let outOfStockCount = 0;
        const lowStockItemsList = [];

        products.forEach(p => {
            const batchStock = (p.inventory_batches || []).reduce((s, b) => s + (b.stock || 0), 0);
            const stock = p.stock !== null && p.stock !== undefined ? Number(p.stock) : batchStock;
            const threshold = Number(p.low_stock_threshold || 10);
            const price = Number(p.cost_price || p.price || 0);

            totalInventoryValue += (price * stock);

            if (stock <= 0) {
                outOfStockCount++;
                if (lowStockItemsList.length < 5) {
                    lowStockItemsList.push({ id: p.id, name: p.name, stock: 0, threshold, status: 'Out of Stock' });
                }
            } else if (stock <= threshold) {
                lowStockCount++;
                if (lowStockItemsList.length < 5) {
                    lowStockItemsList.push({ id: p.id, name: p.name, stock, threshold, status: 'Low Stock' });
                }
            }
        });

        // Fast Moving & Dead Stock Products
        const deadStockList = products
            .filter(p => !soldProductSet30Days.has(p.id))
            .slice(0, 5)
            .map(p => p.name);

        const fastMovingProducts = Object.entries(soldProductQtyMap)
            .map(([pId, qty]) => {
                const prod = products.find(p => String(p.id) === String(pId));
                return {
                    id: pId,
                    name: prod?.name || `Product #${pId}`,
                    unitsSold: qty,
                    revenue: Math.round(soldProductRevenueMap[pId] || 0),
                    profit: Math.round(soldProductProfitMap[pId] || 0)
                };
            })
            .sort((a, b) => b.unitsSold - a.unitsSold)
            .slice(0, 5);

        // 5. Customer Metrics
        const totalCustomersCount = customers.length;
        const newCustomersThisWeek = customers.filter(c => new Date(c.created_at) >= sevenDaysAgo).length;
        const returningCustomersCount = Object.values(customerSalesCountMap).filter(count => count > 1).length;
        const activeCustomersCount = Object.keys(customerSalesCountMap).length;
        const loyaltyRatio = activeCustomersCount > 0 ? Math.round((returningCustomersCount / activeCustomersCount) * 100) : 0;
        const pendingCustomersCount = Object.keys(customerDuesMap).length;

        // Top Customers
        const topCustomersList = customers
            .map(c => {
                const totalSpent = customerSalesTotalMap[c.id] || 0;
                const totalOrders = customerSalesCountMap[c.id] || 0;
                const dues = customerDuesMap[c.id] || Number(c.outstanding_balance || 0);
                return {
                    id: c.id,
                    name: c.name,
                    phone: c.phone || '',
                    totalOrders,
                    totalSpent: Math.round(totalSpent),
                    outstanding: Math.round(dues)
                };
            })
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 5);

        // 6. Growth Comparisons
        const calculateGrowth = (curr, prev) => {
            if (!prev || prev === 0) return curr > 0 ? 100 : 0;
            return Math.round(((curr - prev) / prev) * 100);
        };

        const todaySalesGrowth = calculateGrowth(todayRevenue, yesterdayRevenue);
        const todayOrdersGrowth = calculateGrowth(todayOrders, yesterdayOrders);
        const todayAov = todayOrders > 0 ? Math.round(todayRevenue / todayOrders) : 0;
        const yesterdayAov = yesterdayOrders > 0 ? Math.round(yesterdayRevenue / yesterdayOrders) : 0;
        const aovGrowth = calculateGrowth(todayAov, yesterdayAov);

        const currentMonthAov = currentMonthOrders > 0 ? Math.round(currentMonthRevenue / currentMonthOrders) : 0;
        const revenueGrowth = calculateGrowth(currentMonthRevenue, lastMonthRevenue);
        const orderGrowth = calculateGrowth(currentMonthOrders, lastMonthOrders);
        const profitMarginPercent = currentMonthRevenue > 0 ? Math.round((totalProfit / currentMonthRevenue) * 100) : 0;

        // 7. Multi-Period Trend Construction
        // 7 Days Trend
        const trend7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
            const key = d.toISOString().split('T')[0];
            const label = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
            const dayData = trendMapDaily[key] || { revenue: 0, orders: 0, profit: 0 };
            trend7Days.push({
                date: key,
                name: label,
                revenue: dayData.revenue,
                orders: dayData.orders,
                profit: Math.round(dayData.profit)
            });
        }

        // 30 Days Trend
        const trend30Days = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
            const key = d.toISOString().split('T')[0];
            const label = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
            const dayData = trendMapDaily[key] || { revenue: 0, orders: 0, profit: 0 };
            trend30Days.push({
                date: key,
                name: label,
                revenue: dayData.revenue,
                orders: dayData.orders,
                profit: Math.round(dayData.profit)
            });
        }

        // 12 Months Trend
        const trend12Months = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
            const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
            const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

            let mRev = 0;
            let mOrd = 0;
            let mProf = 0;

            sales.forEach(s => {
                const sDate = new Date(s.date || s.created_at);
                if (sDate >= mStart && sDate <= mEnd) {
                    mRev += Number(s.total ?? s.amount ?? 0);
                    mOrd += 1;
                }
            });

            trend12Months.push({
                name: monthName,
                revenue: Math.round(mRev),
                orders: mOrd,
                profit: Math.round(mRev * 0.22)
            });
        }

        // 8. Needs Your Attention Priority Alerts
        const needsAttention = [];

        if (outOfStockCount > 0 || lowStockCount > 0) {
            const count = outOfStockCount + lowStockCount;
            needsAttention.push({
                id: 'alert_low_stock',
                title: 'Low Stock Alert',
                description: `${count} ${count === 1 ? 'product is' : 'products are'} below reorder level (${outOfStockCount} out of stock).`,
                priority: outOfStockCount > 0 ? 'critical' : 'high',
                actionLabel: 'Review Inventory →',
                actionLink: '/inventory',
                type: 'inventory'
            });
        }

        if (outstandingAmount > 0) {
            needsAttention.push({
                id: 'alert_outstanding_dues',
                title: 'Outstanding Receivables',
                description: `₹${Number(outstandingAmount).toLocaleString('en-IN')} is pending from ${pendingCustomersCount} ${pendingCustomersCount === 1 ? 'customer' : 'customers'}.`,
                priority: outstandingAmount > 20000 ? 'critical' : 'high',
                actionLabel: 'View Receivables →',
                actionLink: '/customers',
                type: 'collection'
            });
        }

        if (pendingPurchaseOrdersCount > 0) {
            needsAttention.push({
                id: 'alert_pending_pos',
                title: 'Pending Purchase Orders',
                description: `${pendingPurchaseOrdersCount} purchase ${pendingPurchaseOrdersCount === 1 ? 'order requires' : 'orders require'} your confirmation.`,
                priority: 'medium',
                actionLabel: 'Review Purchases →',
                actionLink: '/suppliers',
                type: 'purchase'
            });
        }

        if (currentMonthExpense > currentMonthRevenue * 0.6 && currentMonthRevenue > 0) {
            needsAttention.push({
                id: 'alert_high_expenses',
                title: 'Elevated Expense Warning',
                description: `Operating expenses account for ${Math.round((currentMonthExpense / currentMonthRevenue) * 100)}% of revenue this month.`,
                priority: 'medium',
                actionLabel: 'Review Expenses →',
                actionLink: '/expenses',
                type: 'expense'
            });
        }

        // 9. Universal Recent Business Activity Stream
        const activityEvents = [];

        // Add recent sales
        sales.slice(0, 10).forEach(s => {
            const d = new Date(s.date || s.created_at);
            const total = Number(s.total || s.amount || 0);
            activityEvents.push({
                id: `sale_${s.id}`,
                type: 'sale',
                title: `Sale #${s.invoice_no || s.id}`,
                subtitle: s.customers?.name ? `Customer: ${s.customers.name}` : 'Cash Customer',
                amount: `+₹${total.toLocaleString('en-IN')}`,
                amountType: 'positive',
                date: d,
                status: s.payment_status || 'Completed',
                link: '/invoice-history'
            });
        });

        // Add recent payments
        payments.slice(0, 8).forEach(p => {
            const d = new Date(p.date || p.created_at);
            const amt = Number(p.amount || 0);
            activityEvents.push({
                id: `payment_${p.id}`,
                type: 'payment',
                title: `Payment Received`,
                subtitle: p.customers?.name ? `From ${p.customers.name}` : `Mode: ${p.payment_mode || 'Cash'}`,
                amount: `+₹${amt.toLocaleString('en-IN')}`,
                amountType: 'positive',
                date: d,
                status: 'Received',
                link: '/payments'
            });
        });

        // Add recent purchase orders
        purchaseOrders.slice(0, 5).forEach(po => {
            const d = new Date(po.created_at);
            const amt = Number(po.total_amount || 0);
            activityEvents.push({
                id: `po_${po.id}`,
                type: 'purchase',
                title: `PO #${po.order_no || po.id}`,
                subtitle: po.suppliers?.name ? `Supplier: ${po.suppliers.name}` : 'Supplier Order',
                amount: `-₹${amt.toLocaleString('en-IN')}`,
                amountType: 'negative',
                date: d,
                status: po.status || 'Ordered',
                link: '/suppliers'
            });
        });

        // Add recent expenses
        allExpenses.slice(0, 6).forEach(exp => {
            const d = new Date(exp.date || exp.created_at);
            const amt = Number(exp.amount || 0);
            activityEvents.push({
                id: `exp_${exp.id}`,
                type: 'expense',
                title: `Expense: ${exp.category || 'General'}`,
                subtitle: exp.description || (exp.suppliers?.name ? `Paid to ${exp.suppliers.name}` : 'Operational'),
                amount: `-₹${amt.toLocaleString('en-IN')}`,
                amountType: 'negative',
                date: d,
                status: 'Recorded',
                link: '/expenses'
            });
        });

        // Sort all activity events by date descending
        const recentActivity = activityEvents
            .sort((a, b) => b.date - a.date)
            .slice(0, 8)
            .map(item => {
                // Compute humanized relative time
                const diffMs = now - item.date;
                const diffMins = Math.max(1, Math.round(diffMs / (60 * 1000)));
                const diffHours = Math.round(diffMs / (60 * 60 * 1000));
                const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));

                let timeAgo = `${diffMins} mins ago`;
                if (diffMins < 2) timeAgo = 'Just now';
                else if (diffMins >= 60 && diffHours < 24) timeAgo = `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
                else if (diffHours >= 24) timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

                return {
                    ...item,
                    date: item.date.toISOString(),
                    timeAgo
                };
            });

        // 10. Dynamic Business Insight
        let dynamicInsight = {
            title: "Business Performance Insight",
            summary: "Operations are running stably. Keep tracking daily sales and following up on pending dues.",
            actionText: "Open Billing",
            actionLink: "/billing"
        };

        if (todaySalesGrowth > 0 && outstandingAmount > 5000) {
            dynamicInsight = {
                title: "Accelerate Cash Flow",
                summary: `Sales are up +${todaySalesGrowth}% today, but you have ₹${Number(outstandingAmount).toLocaleString('en-IN')} in customer receivables. Following up with pending accounts will maximize liquid cash flow.`,
                actionText: "View Customer Khata",
                actionLink: "/customers"
            };
        } else if (lowStockCount > 0) {
            dynamicInsight = {
                title: "Restock Key Inventory",
                summary: `${lowStockCount} items are running below reorder threshold. Placing timely purchase orders will protect against lost sales over peak hours.`,
                actionText: "Restock Inventory",
                actionLink: "/inventory"
            };
        } else if (netCashFlow > 0) {
            dynamicInsight = {
                title: "Positive Cash Generation",
                summary: `Your business generated net positive cash flow of ₹${Number(netCashFlow).toLocaleString('en-IN')} this month with a gross margin of ${profitMarginPercent}%.`,
                actionText: "View Financials",
                actionLink: "/pnl"
            };
        }

        // 11. Assemble Master Payload
        const dashboardPayload = {
            // Snapshot KPIs
            snapshot: {
                todaySales: Math.round(todayRevenue),
                todaySalesGrowth,
                yesterdaySales: Math.round(yesterdayRevenue),
                
                todayOrders,
                todayOrdersGrowth,
                yesterdayOrders,

                todayAov,
                aovGrowth,
                
                grossProfit: Math.round(todayProfit || (todayRevenue * 0.25)),
                profitMarginPercent,
                monthlyProfit: Math.round(totalProfit),

                todayExpenses: Math.round(todayExpenses),
                monthlyExpenses: Math.round(currentMonthExpense),
                expenseGrowth: calculateGrowth(todayExpenses, yesterdayExpenses),

                netCashFlow,
                isCashFlowPositive: netCashFlow >= 0,

                outstandingReceivables: Math.round(outstandingAmount),
                pendingCustomersCount,

                inventoryValue: Math.round(totalInventoryValue),
                inventoryValueFormatted: totalInventoryValue >= 100000 
                    ? `₹${(totalInventoryValue / 100000).toFixed(2)}L` 
                    : `₹${Math.round(totalInventoryValue).toLocaleString('en-IN')}`,
                totalProductsCount: products.length
            },

            // Business Health
            health: healthScoreData || {
                score: Math.min(100, 75 + (todaySalesGrowth > 0 ? 10 : 0) + (lowStockCount === 0 ? 10 : 0) + (outstandingAmount < 5000 ? 5 : 0)),
                riskLevel: "Healthy",
                components: {
                    sales: { score: 85, status: "Strong" },
                    cashFlow: { score: 80, status: "Good" },
                    inventory: { score: lowStockCount > 5 ? 65 : 85, status: lowStockCount > 5 ? "Needs Attention" : "Healthy" },
                    collection: { score: outstandingAmount > 10000 ? 60 : 85, status: outstandingAmount > 10000 ? "Needs Attention" : "Healthy" },
                    profile: { score: 90, status: "Complete" }
                }
            },

            // Multi-Period Sales Performance
            salesPerformance: {
                todayRevenue: Math.round(todayRevenue),
                todayOrders,
                todayAov,
                todayProfit: Math.round(todayProfit),
                
                trendToday: hourMapToday,
                trend7Days,
                trend30Days,
                trend12Months
            },

            // Financial Money Flow
            moneyFlow: {
                moneyIn,
                moneyOut,
                net: netCashFlow,
                breakdown: {
                    salesCollections: Math.round(currentMonthInflow),
                    customerPayments: Math.round(currentMonthPaymentsCollected),
                    expenses: Math.round(currentMonthExpense),
                    supplierPurchases: Math.round(currentMonthPurchaseSpend)
                }
            },

            // Inventory Health
            inventoryHealth: {
                totalProducts: products.length,
                stockValue: Math.round(totalInventoryValue),
                lowStockCount,
                outOfStockCount,
                fastMoving: fastMovingProducts,
                deadStock: deadStockList,
                lowStockItems: lowStockItemsList
            },

            // Customer Activity
            customerActivity: {
                totalCustomers: totalCustomersCount,
                newThisWeek: newCustomersThisWeek,
                returningCustomers: returningCustomersCount,
                loyaltyRatio,
                outstanding: Math.round(outstandingAmount),
                topCustomers: topCustomersList
            },

            // Actionable Alerts
            needsAttention,

            // Live Stream
            recentActivity,

            // Top Performers
            topPerformers: {
                products: fastMovingProducts,
                customers: topCustomersList
            },

            // AI Insight
            businessInsight: dynamicInsight,

            // Legacy backward-compatibility mapping
            metrics: {
                revenue: currentMonthRevenue,
                revenueGrowth,
                orders: currentMonthOrders,
                orderGrowth,
                aov: currentMonthAov,
                aovGrowth,
                profit: Math.round(totalProfit),
                todayRevenue: Math.round(todayRevenue),
                outstanding: Math.round(outstandingAmount),
                loyaltyRatio,
                dailyTargetProgress: Math.min(Math.round((todayRevenue / 10000) * 100), 100),
                invoicesCount: todayOrders
            },
            charts: {
                trend: trend7Days.map(t => ({ name: t.name, sales: t.revenue })),
                expenses: topExpenses,
                peakHours: hourMapToday.map(h => ({ hour: h.hour, count: h.orders })),
                forecast: Math.round((currentMonthRevenue / (now.getDate() || 1)) * 7)
            },
            inventory: {
                deadStock: deadStockList,
                lowStockCount,
                totalItems: products.length
            },
            recentSales: sales.slice(0, 6).map(s => ({
                id: s.id,
                no: s.invoice_no,
                customer: s.customers?.name || "Cash Sale",
                total: s.total,
                status: s.payment_status
            }))
        };

        // Cache for 3 minutes
        await FinancialCacheService.set(cacheKey, dashboardPayload, 180);
        return dashboardPayload;
    }
};
