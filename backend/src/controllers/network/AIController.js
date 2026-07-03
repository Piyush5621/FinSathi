import BusinessAdvisorEngine from '../../services/ai/engines/BusinessAdvisorEngine.js';
import { successResponse, errorResponse } from '../../utils/responseHelper.js';

/**
 * AIController
 * HTTP Layer for AI capabilities.
 */
class AIController {
    
    async askCopilot(req, res) {
        try {
            const userId = req.user.id;
            const storeId = req.user.storeId;
            const { query } = req.body;
            
            if (!query) {
                return errorResponse(res, 400, 'Query is required');
            }

            const aiResponse = await BusinessAdvisorEngine.askCopilot(userId, storeId, query);
            
            return successResponse(res, aiResponse, 'AI Analysis generated successfully');
        } catch (error) {
            console.error('[AIController] askCopilot error:', error);
            return errorResponse(res, 500, 'Failed to generate AI analysis');
        }
    }
}

export default new AIController();
