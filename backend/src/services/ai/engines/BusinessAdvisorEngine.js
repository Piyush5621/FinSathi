import AIOrchestrator from '../AIOrchestrator.js';
import { BUSINESS_ADVISOR_PROMPT } from '../prompts/businessAdvisor.js';

/**
 * BusinessAdvisorEngine
 * Specific Engine that exposes the 'Ask Business Copilot' capability.
 */
class BusinessAdvisorEngine {
    
    async askCopilot(userId, storeId, query) {
        // Trigger the orchestrator pipeline with the specific business advisor prompt
        const response = await AIOrchestrator.processRequest(userId, storeId, query, BUSINESS_ADVISOR_PROMPT);
        
        return response;
    }
}

export default new BusinessAdvisorEngine();
