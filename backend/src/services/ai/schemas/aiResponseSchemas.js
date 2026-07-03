import { z } from 'zod';

/**
 * Schemas to enforce structured JSON output from the AI models.
 */

export const AdvisorResponseSchema = z.object({
    summary: z.string().describe("A concise summary of the situation or explanation."),
    reasoning: z.string().describe("The logical steps the AI took to arrive at the conclusion, based strictly on the provided context."),
    recommendations: z.array(
        z.object({
            title: z.string(),
            description: z.string(),
            priority: z.enum(['HIGH', 'MEDIUM', 'LOW'])
        })
    ).describe("Specific, actionable recommendations for the business."),
    confidence: z.number().min(0).max(100).describe("Confidence score of the AI's assessment."),
    follow_up_actions: z.array(z.string()).describe("Suggested follow-up questions or actions the user can take in the app.")
});
