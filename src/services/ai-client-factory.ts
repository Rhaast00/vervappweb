'use client';

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { getApiKey } from './api-keys-service';

// Desteklenen AI Provider'ları
export type AIProvider = 'openai' | 'anthropic' | 'google';

// AI istemcilerini saklayacağımız cache
const clientCache: Record<string, any> = {};

// OpenAI istemcisi oluştur
async function createOpenAIClient(): Promise<OpenAI | null> {
  const apiKey = await getApiKey('openai');
  if (!apiKey) return null;
  
  try {
    return new OpenAI({ apiKey });
  } catch (error) {
    console.error('Error creating OpenAI client:', error);
    return null;
  }
}

// Anthropic istemcisi oluştur
async function createAnthropicClient(): Promise<Anthropic | null> {
  const apiKey = await getApiKey('anthropic');
  if (!apiKey) return null;
  
  try {
    return new Anthropic({ apiKey });
  } catch (error) {
    console.error('Error creating Anthropic client:', error);
    return null;
  }
}

// Google AI istemcisi oluştur (uygulamanıza göre değişebilir)
async function createGoogleAIClient(): Promise<any | null> {
  const apiKey = await getApiKey('google');
  if (!apiKey) return null;
  
  try {
    // Google AI API için uygun bir istemci kütüphanesi kullanılmalı
    // Burada sadece örnek olarak boş bir nesne döndürülüyor
    return { apiKey };
  } catch (error) {
    console.error('Error creating Google AI client:', error);
    return null;
  }
}

// AI istemcisi oluşturmak için fabrika fonksiyonu
export async function getAIClient(provider: AIProvider): Promise<any | null> {
  // Cache'den kontrol et
  if (clientCache[provider]) {
    return clientCache[provider];
  }
  
  // Provider'a göre istemci oluştur
  let client = null;
  
  switch (provider) {
    case 'openai':
      client = await createOpenAIClient();
      break;
    case 'anthropic':
      client = await createAnthropicClient();
      break;
    case 'google':
      client = await createGoogleAIClient();
      break;
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
  
  // Cache'e ekle
  if (client) {
    clientCache[provider] = client;
  }
  
  return client;
}

// Tüm cache'i temizle
export function clearAIClientCache(): void {
  Object.keys(clientCache).forEach(key => {
    delete clientCache[key];
  });
}

// Belirli bir provider için cache'i temizle
export function clearAIClientCacheFor(provider: AIProvider): void {
  if (clientCache[provider]) {
    delete clientCache[provider];
  }
} 