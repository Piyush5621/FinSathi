/**
 * 🛡️ Ownership Redesign Middleware
 * Automatically injects the authenticated user's ID into the body of every request.
 * This makes it impossible to save data to the "global table" by accident.
 * 
 * For staff users (staff_id set, user_id null), we only inject organization_id
 * via tenant_id, not user_id, to avoid corrupting ownership scope.
 */
export const enforceOwnership = (req, res, next) => {
    const userId = req.user?.user_id || req.user?.id || req.user?.sub;
    const staffId = req.user?.staff_id;
    const tenantId = req.user?.tenant_id;

    if (req.user) {
        // Only normalize user ID fields if this is an owner (not staff-only)
        if (userId) {
            req.user.id = userId;
            req.user.user_id = userId;
        }

        // Inject ownership context into mutation request bodies
        if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
            if (Array.isArray(req.body)) {
                req.body = req.body.map(item => ({
                    ...item,
                    ...(userId ? { user_id: userId } : {}),
                    ...(tenantId && !item.organization_id ? { organization_id: tenantId } : {})
                }));
            } else {
                // Only inject user_id if it's a valid owner userId (not null/undefined for staff)
                if (userId) req.body.user_id = userId;
                // Inject organization_id from tenant context if not already set
                if (tenantId && !req.body.organization_id) req.body.organization_id = tenantId;
            }
        }

        // Provide a scoped query helper for controllers
        req.user_scope = {
            ...(userId ? { user_id: userId } : {}),
            ...(staffId ? { staff_id: staffId } : {}),
            ...(tenantId ? { organization_id: tenantId } : {})
        };
    }
    next();
};
