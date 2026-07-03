/**
 * PromptBuilderService
 * Safely injects context into versioned prompt templates.
 * Never concatenates strings directly in the orchestration flow.
 */
class PromptBuilderService {
    
    /**
     * @param {string} template - The raw prompt string with {{placeholders}}
     * @param {Object} context - Key-value pairs to inject
     * @returns {string} The finalized prompt
     */
    build(template, context) {
        let finalPrompt = template;
        
        for (const [key, value] of Object.entries(context)) {
            // Stringify objects nicely for the LLM context
            const replacement = typeof value === 'object' ? JSON.stringify(value, null, 2) : value;
            // Replace all occurrences of {{key}}
            const regex = new RegExp(`{{${key}}}`, 'g');
            finalPrompt = finalPrompt.replace(regex, replacement || 'None provided');
        }

        return finalPrompt;
    }
}

export default new PromptBuilderService();
