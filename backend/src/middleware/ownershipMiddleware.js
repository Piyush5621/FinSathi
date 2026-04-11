/**
 * 🛡️ Ownership Redesign Middleware
 * Automatically injects the authenticated user's ID into the body of every request.
 * This makes it impossible to save data to the "global table" by accident.
 */
export const enforceOwnership = (req, res, next) => {
    if (req.user && req.user.id) {
        // Automatically inject user_id into body for ALL create/update requests
        if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
            if (Array.isArray(req.body)) {
                req.body = req.body.map(item => ({ ...item, user_id: req.user.id }));
            } else {
                req.body.user_id = req.user.id;
            }
        }
        
        // Also add a safety "scoped" query helper to the request
        req.user_scope = { user_id: req.user.id };
    }
    next();
};
