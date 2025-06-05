'use client';

import OpenAI from 'openai';
import { getApiKey } from '../services/api-keys-service';

// Available OpenAI models
export const OPENAI_MODELS = [
  { id: 'gpt-4', name: 'GPT-4', description: 'Most capable model for complex tasks' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Fast and capable model' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast model for simple tasks' },
  { id: 'gpt-4o', name: 'GPT-4o', description: 'Latest multimodal model' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Smaller version of GPT-4o' }
];

// OpenAI istemcisini oluşturma
export async function getOpenAIClient(apiKey?: string): Promise<OpenAI | null> {
  try {
    let key = apiKey;
    
    // Eğer API anahtarı parametre olarak sağlanmadıysa, kullanıcının API anahtarını al
    if (!key) {
      const userKey = await getApiKey('openai');
      key = userKey || undefined;
    }
    
    // API anahtarı yoksa null döndür
    if (!key) {
      console.warn('No OpenAI API key found for user');
      return null;
    }
    
    console.log('Creating OpenAI client with provided API key');
    
    // OpenAI istemcisini oluştur ve döndür
    return new OpenAI({
      apiKey: key,
      dangerouslyAllowBrowser: true // İstemci tarafı kullanım için gerekli
    });
  } catch (error) {
    console.error('Error creating OpenAI client:', error);
    return null;
  }
}

// Mock OpenAI yanıtı oluştur
export function createMockOpenAIResponse(prompt: string): any {
  console.log('Creating mock OpenAI response');
  
  // Gönderilen prompt'a basit bir mock yanıt oluştur
  return {
    id: 'mock-response-' + Date.now(),
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'mock-gpt-4',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: '{"html":"<div>Mock HTML response</div>","css":"body { color: blue; }","preview":"This is a mock preview"}'
        },
        finish_reason: 'stop'
      }
    ],
    usage: {
      prompt_tokens: prompt.length,
      completion_tokens: 100,
      total_tokens: prompt.length + 100
    }
  };
} 