import OpenAI from "openai";

/**
 * Returns the configured OpenAI client.
 * If GEMINI_API_KEY is present, it configures the client to point to the Google Gemini API endpoint.
 * Otherwise, it uses the standard OpenAI API.
 */
export function getLlmClient(): OpenAI {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  if (geminiKey) {
    return new OpenAI({
      apiKey: geminiKey,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
  }

  return new OpenAI({
    apiKey: openAiKey || "dummy-key",
  });
}

/**
 * Returns the model name to use.
 * Defaults to "gemini-3.1-flash-lite" (or "gemini-3-flash" for PDF) if GEMINI_API_KEY is present,
 * or "gpt-4o-mini" (or "gpt-4o" for PDF) if using OpenAI. Can be overridden via environment variables.
 */
export function getLlmModel(isPdf = false): string {
  if (process.env.GEMINI_API_KEY) {
    if (isPdf) {
      return process.env.GEMINI_PDF_MODEL || "gemini-3-flash";
    }
    return process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
  }
  if (isPdf) {
    return process.env.OPENAI_PDF_MODEL || "gpt-4o";
  }
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

/**
 * Helper to call the LLM and expect a JSON response.
 * Handles setting up system prompts, user prompts, and parsing the output.
 */
export async function generateStructuredJson<T>(
  systemPrompt: string,
  userPrompt: string,
  isPdf = false
): Promise<T> {
  const client = getLlmClient();
  const model = getLlmModel(isPdf);

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from LLM");
    }

    // Parse clean JSON (sometimes LLMs enclose it in markdown blocks, let's strip those just in case)
    const cleanContent = content.trim().replace(/^```json\s*|```$/g, "");
    return JSON.parse(cleanContent) as T;
  } catch (error) {
    console.error("LLM Generation Error:", error);
    throw error;
  }
}
