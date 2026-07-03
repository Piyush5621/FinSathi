/**
 * ResponseFormatter
 * Ensures the final JSON object matches frontend expectations and strips any markdown/markdown-json blocks if the LLM returned raw text.
 */
class ResponseFormatter {
    
    format(rawOutput) {
        // Just passes it through if it's already a clean object
        if (typeof rawOutput === 'object') {
            return rawOutput;
        }

        try {
            // If the provider returned a string for some reason, parse it
            const cleaned = rawOutput.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleaned);
        } catch (e) {
            console.error('[ResponseFormatter] Failed to parse AI output', e);
            throw new Error('Invalid AI Response Format');
        }
    }
}

export default new ResponseFormatter();
