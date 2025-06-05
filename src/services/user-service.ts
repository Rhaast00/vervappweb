'use client';

import { supabase } from '../lib/supabase-client';
import { getApiKey, saveApiKey } from './api-keys-service';

// Kullanıcıya ait API anahtarını getir
export async function getUserApiKey(provider: string): Promise<{apiKey: string} | null> {
  try {
    // Oturum açmış kullanıcı bilgisini al
    const { data: { user } } = await supabase.auth.getUser();
    
    // Kullanıcı oturum açmadıysa null döndür
    if (!user) {
      console.warn('No authenticated user found');
      return null;
    }

    console.log(`Getting API key for provider: ${provider}`);
    
    // api-keys-service kullanarak API anahtarını al
    const apiKey = await getApiKey(provider);
    
    if (!apiKey) {
      console.warn(`No API key found for provider: ${provider}`);
      return null;
    }

    console.log(`API key found for provider: ${provider}`);
    
    // Basitleştirilmiş format döndür
    return { apiKey };
  } catch (error) {
    console.error('Error getting user API key:', error);
    return null;
  }
}

// Kullanıcının API anahtarını kaydet (api-keys-service kullanarak)
export async function saveUserApiKey(provider: string, apiKey: string): Promise<boolean> {
  try {
    console.log(`Attempting to save API key for provider: ${provider}`);
    
    // API anahtarını api-keys-service kullanarak kaydet
    await saveApiKey(provider, apiKey);
    console.log(`API key saved successfully for provider: ${provider}`);
    
    return true;
  } catch (error) {
    console.error('Error saving user API key:', error);
    return false;
  }
}

// Kullanıcının API anahtarını sil
export async function deleteUserApiKey(provider: string): Promise<boolean> {
  try {
    // Oturum açmış kullanıcı bilgisini al
    const { data: { user } } = await supabase.auth.getUser();
    
    // Kullanıcı oturum açmadıysa false döndür
    if (!user) {
      throw new Error('No authenticated user found');
    }
    
    // API anahtarını sil
    const { error } = await supabase
      .from('user_api_keys')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', provider);
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting user API key:', error);
    return false;
  }
}

// Kullanıcının tüm API anahtarlarını getir
export async function getUserApiKeys(): Promise<{apiKey: string}[] | null> {
  try {
    // Oturum açmış kullanıcı bilgisini al
    const { data: { user } } = await supabase.auth.getUser();
    
    // Kullanıcı oturum açmadıysa boş array döndür
    if (!user) {
      console.warn('No authenticated user found');
      return null;
    }
    
    // Kullanıcının API anahtarlarını veritabanından al
    const { data, error } = await supabase
      .from('user_api_keys')
      .select('*')
      .eq('user_id', user.id);
    
    if (error || !data) {
      console.warn('No API keys found');
      return null;
    }
    
    return data.map(item => ({
      apiKey: item.api_key
    }));
  } catch (error) {
    console.error('Error getting user API keys:', error);
    return null;
  }
} 