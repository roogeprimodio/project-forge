
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {openai} from '@genkit-ai/openai'; // Ensure OpenAI plugin is imported

// Main AI instance.
// Flows will dynamically select the model (Gemini or OpenAI) and
// attempt to use user-provided API keys if available.
// The keys provided here during plugin initialization (if any) would only act
// as a last resort or for plugin initialization requirements, but the goal
// is to primarily use keys passed per-call via the 'config' object in flows.
export const ai = genkit({
  promptDir: './prompts',
  plugins: [
    googleAI({
      // No API key here; flows will pass it or it will error if user doesn't provide one.
      // The plugin might require a key for initialization in some cases,
      // if so, a placeholder like "USER_KEY_EXPECTED" could be used if it allows initialization.
      // For now, assuming it can initialize without one if keys are passed per-call.
    }),
    // Initialize OpenAI plugin so it can be selected by flows.
    // No API key here; flows will pass it or it will error if user doesn't provide one.
    openai({
      // Similar to googleAI, no default API key.
      // apiKey: "USER_KEY_EXPECTED_FOR_OPENAI" // Placeholder if needed for init
    }),
  ],
  // Default model for generic `ai.generate` if not specified in the call itself.
  // However, our flows will explicitly set the model.
  model: 'googleai/gemini-2.0-flash',
});

// Specific model references - this allows flows to easily select
// by a logical name rather than hardcoding model strings.
export const geminiModel = 'googleai/gemini-2.0-flash';
export const openAiModel = 'openai/gpt-4-turbo'; // Example OpenAI model, adjust as needed
// export const openAiModel = 'openai/gpt-3.5-turbo';

