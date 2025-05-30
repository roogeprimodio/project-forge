import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {openai} from '@genkit-ai/openai'; // Ensure OpenAI plugin is imported

// Main AI instance, defaults to Gemini but can be dynamically overridden in flows
// if a specific model or API key is provided.
export const ai = genkit({
  promptDir: './prompts',
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY, // Server's default Gemini key
    }),
    // Initialize OpenAI plugin so it can be selected by flows
    // Flows will need to handle which model (gemini or openai) to target.
    // The key provided here would be the server's default OpenAI key.
    // User-specific keys will be passed per-call if available.
    // openai({ apiKey: process.env.OPENAI_API_KEY }), // Uncomment if @genkit-ai/openai is successfully installed
  ],
  model: 'googleai/gemini-2.0-flash', // Default model for generic `ai.generate` if not specified
});

// Specific model references - this allows flows to easily select
// by a logical name rather than hardcoding model strings.
// The actual API key used will depend on what's passed to the flow.
export const geminiModel = 'googleai/gemini-2.0-flash';
export const openAiModel = 'openai/gpt-4-turbo'; // Example OpenAI model, adjust as needed
// export const openAiModel = 'openai/gpt-3.5-turbo';
