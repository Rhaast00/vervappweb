'use client';

import OpenAI from 'openai';
import { getApiKey } from '../services/api-keys-service';

// OpenAI istemcisini oluşturma
export async function getOpenAIClient(): Promise<OpenAI | null> {
  try {
    // Kullanıcının API anahtarını al
    const apiKey = await getApiKey('openai');
    
    // API anahtarı yoksa null döndür
    if (!apiKey) {
      console.warn('No OpenAI API key found for user');
      return null;
    }
    
    // OpenAI istemcisini oluştur ve döndür
    return new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true // İstemci tarafı kullanım için gerekli
    });
  } catch (error) {
    console.error('Error creating OpenAI client:', error);
    return null;
  }
}

// Mock OpenAI yanıtı oluştur
export function createMockOpenAIResponse(prompt: string): any {
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