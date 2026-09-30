/**
 * 🛡️ Ownership Redesign Middleware
 * Automatically injects the authenticated user's ID into the body of every request.
 * This makes it impossible to save data to the "global table" by accident.
 * 
 * For staff users (staff_id set, user_id null), we only inject organization_id
 * via tenant_id, not user_id, to avoid corrupting ownership scope.
 */
export const enforceOwnership = (req, res, next) => {
    const userId = req.user?.user_id || req.user?.id;
    const staffId = req.user?.staff_id;
    const tenantId = req.user?.tenant_id || req.user?.organization_id;
    const storeId = req.headers['x-store-id'] || req.user?.store_id;

    if (req.user) {
        if (userId) {
            req.user.id = userId;
            req.user.user_id = userId;
        }

        // Inject ownership context into mutation request bodies
        if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
            if (Array.isArray(req.body)) {
                req.body = req.body.map(item => ({
                    ...item,
                    ...(userId && !item.user_id ? { user_id: userId } : {}),
                    ...(staffId && !item.staff_id ? { staff_id: staffId } : {}),
                    ...(storeId && !item.store_id ? { store_id: storeId } : {}),
                    ...(tenantId && !item.organization_id ? { organization_id: tenantId } : {})
                }));
            } else {
                if (userId && !req.body.user_id) req.body.user_id = userId;
                if (staffId && !req.body.staff_id) req.body.staff_id = staffId;
                if (storeId && !req.body.store_id) req.body.store_id = storeId;
                if (tenantId && !req.body.organization_id) req.body.organization_id = tenantId;
            }
        }

        // Provide a scoped query helper for controllers
        req.user_scope = {
            ...(userId ? { user_id: userId } : {}),
            ...(staffId ? { staff_id: staffId } : {}),
            ...(storeId ? { store_id: storeId } : {}),
            ...(tenantId ? { organization_id: tenantId } : {})
        };
    }
    next();
};
