'use client';

import Anthropic from '@anthropic-ai/sdk';
import { getApiKey } from '../services/api-keys-service';

// Available Anthropic Claude models
export const ANTHROPIC_MODELS = [
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most powerful model for complex tasks' },
  { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanced performance and cost' },
  { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fastest model for simple tasks' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Latest improved model' }
];

// Anthropic Claude API client creation
export async function getAnthropicClient(apiKey?: string): Promise<Anthropic | null> {
  try {
    let key = apiKey;
    
    // If API key not provided as parameter, get user's API key
    if (!key) {
      const userKey = await getApiKey('anthropic');
      if (userKey) {
        key = userKey;
      } else {
        console.warn('No Anthropic API key found for user');
        return null;
      }
    }
    
    console.log('Creating Anthropic Claude client with provided API key');
    
    // Create and return Anthropic client
    return new Anthropic({
      apiKey: key
    });
  } catch (error) {
    console.error('Error creating Anthropic client:', error);
    return null;
  }
}

// Mock Anthropic Claude response
export function createMockAnthropicResponse(prompt: string): any {
  console.log('Creating mock Anthropic Claude response');
  
  // Create a simple mock response based on the prompt
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          html: "<div>Mock Anthropic Claude HTML response</div>",
          css: "body { color: purple; }",
          preview: "This is a mock Anthropic Claude preview"
        })
      }
    ]
  };
}

// Generate completions with Anthropic Claude
export async function generateAnthropicCompletion(client: Anthropic, messages: any[], modelId?: string): Promise<any> {
  try {
    // Convert OpenAI format messages to Anthropic format
    const systemMessage = messages.find(msg => msg.role === 'system')?.content || '';
    const userMessage = messages.find(msg => msg.role === 'user')?.content || '';
    
    // Use specified model or default
    const selectedModel = modelId || 'claude-3-opus-20240229';
    console.log(`Using Anthropic model: ${selectedModel}`);
    
    // Generate message with Claude
    const response = await client.messages.create({
      model: selectedModel,
      max_tokens: 4000,
      system: systemMessage,
      messages: [
        { role: 'user', content: userMessage }
      ]
    });
    
    // Return in a format that can be used like OpenAI's response
    return {
      choices: [
        {
          message: {
            content: response.content[0].type === 'text' ? response.content[0].text : JSON.stringify(response.content)
          }
        }
      ]
    };
  } catch (error) {
    console.error(`Error generating Anthropic completion with model ${modelId}:`, error);
    throw error;
  }
} 