import { GoogleGenAI, Type } from "@google/genai";
import { AppEvent, Feedback } from '../types.ts';

// Helper to sleep for a given duration
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to get a formatted error message for AI operations
const getFormattedError = (err: unknown): string => {
    if (err instanceof Error) {
        const msg = err.message;
        if (msg.includes("CONSUMER_SUSPENDED") || msg.includes("has been suspended")) {
            return "CRITICAL: The system API key has been suspended. Please provide your own API key to continue using AI features.";
        }
        if (msg.includes("403") || msg.includes("Permission denied") || msg.includes("API_KEY_INVALID")) {
            return `Access Denied: The API key is invalid or lacks permissions. Please select a valid key.`;
        }
        if (msg.includes("429")) {
            return "Quota Limit Hit: The free tier has a strict limit on Web Grounding (Google Search).";
        }
        return msg;
    }
    return "An unexpected AI error occurred.";
};

/**
 * Wrapper to call AI with aggressive exponential backoff on 429 (Quota) errors.
 */
async function callAiWithRetry<T>(fn: () => Promise<T>, attempts = 2, delay = 3000): Promise<T> {
    // Simulate error for HAT testing if requested via global flag
    if ((window as any).__SIMULATE_AI_SUSPENSION) {
        throw new Error("CONSUMER_SUSPENDED: The system key is simulated as suspended for testing.");
    }

    try {
        return await fn();
    } catch (error: any) {
        const isQuotaError = error?.message?.includes("429") || error?.status === 429;
        if (attempts > 1 && isQuotaError) {
            console.warn(`Quota reached. Retrying in ${delay}ms...`);
            await sleep(delay);
            return callAiWithRetry(fn, attempts - 1, delay * 2);
        }
        throw error;
    }
}

const getApiKey = () => {
    // process.env.API_KEY is injected when a user selects a key via the AI Studio dialog
    // process.env.GEMINI_API_KEY is the default system key
    const key = (process.env as any).API_KEY || (process.env as any).GEMINI_API_KEY || import.meta.env.VITE_API_KEY;
    if (!key) {
        console.warn("Gemini API Key not found in environment variables.");
    }
    return key || "";
};

/**
 * Summarizes system feedback for admins.
 */
export const summarizeFeedbackAI = async (feedbacks: Feedback[]): Promise<{ summary: string; sentiment: 'Positive' | 'Mixed' | 'Negative'; priorities: string[] }> => {
    if (feedbacks.length === 0) return { summary: "No feedback to analyze.", sentiment: 'Mixed', priorities: [] };

    const ai = new GoogleGenAI({ apiKey: getApiKey() });

    return callAiWithRetry(async () => {
        const feedbackText = feedbacks.map(f => `- ${f.content}`).join('\n');
        const prompt = `Analyze Sarawak Tourism system feedback. 
        Feedback:
        ${feedbackText}`;

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                summary: { type: Type.STRING },
                sentiment: { type: Type.STRING, enum: ['Positive', 'Mixed', 'Negative'] },
                priorities: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["summary", "sentiment", "priorities"]
        };

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                thinkingConfig: { thinkingBudget: 0 }
            },
        });

        if (!response.text) throw new Error("Empty response from AI.");
        return JSON.parse(response.text);
    });
};

/**
 * Generates a marketing description for a tourism cluster.
 */
export const generateClusterDescription = async (name: string, categories: string[], vibe: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    return callAiWithRetry(async () => {
        const prompt = `Write a short, engaging description for Sarawak tourism spot: "${name}" (${categories.join(', ')}). Tone: ${vibe || 'inviting'}. 2 sentences max.`;
        const response = await ai.models.generateContent({ 
            model: 'gemini-3-flash-preview', 
            contents: prompt,
            config: { thinkingConfig: { thinkingBudget: 0 } }
        });
        return response.text?.trim() || "No description generated.";
    });
};

/**
 * Generates a comprehensive analytical summary for events using distilled data.
 */
export const generateEventAnalyticsInsight = async (distilledData: string, year: number, useSearch: boolean): Promise<{ summary: string; sources: any[]; isGrounded: boolean }> => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    
    const getInternalAnalysis = async (note = "") => {
        const fallbackPrompt = `Act as a Senior Sarawak Tourism Data Scientist.
        DATA FOR ${year}: ${distilledData}
        Write a 2-paragraph analysis focusing on quantitative distribution and strategic gaps.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: fallbackPrompt,
            config: { thinkingConfig: { thinkingBudget: 0 } }
        });

        return {
            summary: (response.text || "Analysis unavailable.") + (note ? `\n\n(${note})` : ""),
            sources: [],
            isGrounded: false
        };
    };

    if (!useSearch) return getInternalAnalysis();

    try {
        const groundedPrompt = `Act as a Sarawak Tourism Data Scientist.
        INTERNAL DATA FOR ${year}: ${distilledData}
        TASK: Use Google Search for ONE regional trend for ${year} and synthesize a 2-paragraph Strategic Insight.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: groundedPrompt,
            config: { 
                tools: [{ googleSearch: {} }],
                thinkingConfig: { thinkingBudget: 0 } 
            },
        });

        return { 
            summary: response.text || "No insights available.", 
            sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [],
            isGrounded: true
        };
    } catch (error: any) {
        if (error?.message?.includes("429") || error?.status === 429) {
            return getInternalAnalysis("Note: Web research credit was exhausted; showing internal-only analysis.");
        }
        throw new Error(getFormattedError(error));
    }
};

/**
 * Refines and combines existing analysis text.
 * This function takes user edits and AI content and polishes it into a professional report.
 */
export const refineAnalysisAI = async (existingText: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    return callAiWithRetry(async () => {
        const prompt = `You are a professional editor for the Sarawak Tourism Board.
        
        The following text is a draft analysis consisting of data, AI research, and human notes.
        Please polish, reorganize, and synthesize it into a single, cohesive, high-quality strategic report. 
        Maintain all factual information but improve the flow and professionalism. 
        Keep it within 2-3 paragraphs.

        DRAFT TEXT:
        ${existingText}`;

        const response = await ai.models.generateContent({ 
            model: 'gemini-3-flash-preview', 
            contents: prompt,
            config: { thinkingConfig: { thinkingBudget: 0 } }
        });
        return response.text?.trim() || existingText;
    });
};

/**
 * Generates trip recommendations based on user preferences.
 * Supports Normal mode (Location + Interests) and Advanced mode (Duration + Budget + Proximity).
 */
export const generateItineraryRecommendations = async (preferences: any, items: any[], useSearch: boolean = false, isAdvanced: boolean = false): Promise<any[]> => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    return callAiWithRetry(async () => {
        const minimalItems = items.slice(0, 15).map(item => ({
            id: item.id,
            type: item.itemType || item.type,
            name: item.name || item.title,
            location: item.display_address || item.location || item.location_name,
            latitude: item.latitude,
            longitude: item.longitude,
            categories: item.category ? (Array.isArray(item.category) ? item.category : [item.category]) : [],
            products: item.products?.map((p: any) => ({ name: p.name, price: p.price_range })) || []
        }));

        const normalPrompt = `Act as a Sarawak Tourism Expert.
        USER PREFERENCES:
        - Location: ${preferences.location || 'Sarawak'}
        - Interests: ${Array.from(preferences.activities).join(', ')}

        CANDIDATE SPOTS FROM DATABASE:
        ${JSON.stringify(minimalItems)}

        TASK:
        Recommend exactly 5 spots (tourism clusters or events) that match the user's location and interests.
        Provide a brief justification for each based on why it matches their interests.
        ${useSearch ? "WEB RESEARCH: Use Google Search to find additional information if the database items are insufficient." : "DO NOT use Google Search."}`;

        const advancedPrompt = `Act as an expert Sarawak Trip Planner.
        USER PREFERENCES:
        - Duration: ${preferences.duration} days
        - Budget: RM ${preferences.budget}
        - Interests: ${Array.from(preferences.activities).join(', ')}
        - Preferred Location: ${preferences.location || 'Sarawak'}
        ${preferences.startPin ? `- Starting Point Coordinates: Lat ${preferences.startPin.lat}, Lng ${preferences.startPin.lng}` : ''}

        CANDIDATE SPOTS FROM DATABASE:
        ${JSON.stringify(minimalItems)}

        TASK:
        Recommend exactly 5 spots that form a logical itinerary based on the user's constraints. 
        
        LOGIC RULES:
        1. PROXIMITY: If the trip is short (1-3 days), prioritize spots that are geographically close to each other.
        2. BUDGET: Respect the budget of RM ${preferences.budget}. Use the provided 'products' price data if available.
        3. JUSTIFICATION: Briefly mention why it fits the budget or proximity logic.
        ${useSearch ? "4. WEB RESEARCH: Use Google Search to find additional information if the database items are insufficient." : "4. DO NOT use Google Search."}`;

        const prompt = isAdvanced ? advancedPrompt : normalPrompt;
        
        const responseSchema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    type: { type: Type.STRING },
                    name: { type: Type.STRING },
                    location: { type: Type.STRING },
                    justification: { type: Type.STRING }
                },
                required: ["id", "type", "name", "location", "justification"]
            }
        };

        const config: any = {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
            thinkingConfig: { thinkingBudget: 0 }
        };

        if (useSearch) {
            config.tools = [{ googleSearch: {} }];
        }

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: config,
        });
        
        return JSON.parse(response.text || "[]");
    });
};