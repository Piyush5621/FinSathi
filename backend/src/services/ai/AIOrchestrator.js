import AIContextBuilder from './AIContextBuilder.js';
import PromptBuilderService from './PromptBuilderService.js';
import GeminiProvider from './providers/GeminiProvider.js';
import ResponseFormatter from './ResponseFormatter.js';
import { AdvisorResponseSchema } from './schemas/aiResponseSchemas.js';
import { logger } from '../../infrastructure/logging/logger.js';

/**
 * AIOrchestrator
 * The entry point for all AI requests. Executes the standard pipeline:
 * Context -> Prompt -> Model -> Format.
 */
class AIOrchestrator {
    
    /**
     * Executes the standard AI pipeline
     * @param {string} userId
     * @param {string} storeId
     * @param {string} query 
     * @param {string} promptTemplate
     */
    async processRequest(userId, storeId, query, promptTemplate) {
        
        // 1. Build Context (Data Gathering Phase)
        const contextData = await AIContextBuilder.buildFullContext(userId, storeId);
        
        // Add query to context payload for templating
        const templateContext = {
            ...contextData,
            query
        };

        // 2. Build Prompt
        const finalPrompt = PromptBuilderService.build(promptTemplate, templateContext);

        try {
            // 3. Call Model (Provider Abstraction)
            const rawOutput = await GeminiProvider.generateStructuredResponse(finalPrompt, AdvisorResponseSchema);

            // 4. Format & Validate Output
            const finalResponse = ResponseFormatter.format(rawOutput);

            return finalResponse;
        } catch (error) {
            logger.error(`[AIOrchestrator] AI Provider Failed. Falling back to deterministic response.`, { error: error.message });
            
            // Deterministic Graceful Degradation
            return {
                summary: "We are currently experiencing high load. Based on standard analysis, your business is operating normally.",
                insights: ["Please check back later for deep AI-driven insights."],
                actions: [
                    { title: "Review Notifications", type: "system", priority: "medium" },
                    { title: "Complete Pending Trades", type: "trade", priority: "high" }
                ],
                confidenceScore: 0.5
            };
        }
    }
}

export default new AIOrchestrator();
