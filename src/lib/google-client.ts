'use client';

import { GoogleGenAI } from '@google/genai';
import { getApiKey } from '../services/api-keys-service';

// Available Google Gemini models
export const GOOGLE_MODELS = [
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Latest model with fast performance' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Fast model for quick responses' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Advanced model for complex tasks' },
  { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash 8B', description: 'Lightweight model for basic tasks' }
];

// Google Gemini API client creation
export async function getGoogleClient(apiKey?: string): Promise<GoogleGenAI | null> {
  try {
    let key = apiKey;
    
    // If API key not provided as parameter, get user's API key
    if (!key) {
      const userKey = await getApiKey('google');
      if (userKey) {
        key = userKey;
      } else {
        console.warn('No Google API key found for user');
        return null;
      }
    }
    
    console.log('Creating Google Gemini client with provided API key');
    
    // Create and return Google client using the new SDK structure
    return new GoogleGenAI({ apiKey: key });
  } catch (error) {
    console.error('Error creating Google client:', error);
    return null;
  }
}

// Mock Google API response
export function createMockGoogleResponse(prompt: string): any {
  console.log('Creating mock Google Gemini response');
  
  return {
    response: {
      text: JSON.stringify({
        html: "<div>Mock Google Gemini HTML response</div>",
        css: "body { color: green; }",
        preview: "This is a mock Google Gemini preview"
      })
    }
  };
}

// Generate completion using specific Google model
export async function generateGoogleCompletion(client: GoogleGenAI, messages: any[], modelId: string = 'gemini-2.0-flash'): Promise<any> {
  try {
    // Extract the user message content
    const userMessage = messages.find(msg => msg.role === 'user')?.content || '';
    
    console.log(`Using Google model: ${modelId}`);
    
    // Use the specified model
    const response = await client.models.generateContent({
      model: modelId,
      contents: userMessage
    });
    
    // Return in OpenAI-compatible format
    return {
      choices: [
        {
          message: {
            content: response.text
          }
        }
      ]
    };
  } catch (error) {
    console.error(`Error generating Google completion with model ${modelId}:`, error);
    throw error;
  }
}

// Test if a specific model is available
export async function testGoogleModel(client: GoogleGenAI, modelId: string): Promise<boolean> {
  try {
    console.log(`Testing Google model: ${modelId}`);
    
    const response = await client.models.generateContent({
      model: modelId,
      contents: 'test'
    });
    
    return !!response;
  } catch (error) {
    console.log(`Model ${modelId} is not available: ${(error as Error).message}`);
    return false;
  }
} 