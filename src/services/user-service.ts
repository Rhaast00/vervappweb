'use client';

import { supabase } from '../lib/supabase-client';
import { IUserApiKey } from '../types';
import { getApiKey } from './api-keys-service';

// Kullanıcıya ait API anahtarını getir
export async function getUserApiKey(provider: string): Promise<IUserApiKey | null> {
  try {
    // Oturum açmış kullanıcı bilgisini al
    const { data: { user } } = await supabase.auth.getUser();
    
    // Kullanıcı oturum açmadıysa null döndür
    if (!user) {
      console.warn('No authenticated user found');
      return null;
    }

    // api-keys-service kullanarak API anahtarını al
    const apiKey = await getApiKey(provider);
    
    if (!apiKey) {
      console.warn(`No API key found for provider: ${provider}`);
      return null;
    }
    
    // IUserApiKey format'ında döndür
    return {
      id: 'generated-' + Math.random().toString(36).substring(2, 9),
      userId: user.id,
      provider: provider,
      apiKey: apiKey,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    console.error('Error getting user API key:', error);
    return null;
  }
}

// Kullanıcının API anahtarını kaydet
export async function saveUserApiKey(provider: string, apiKey: string): Promise<IUserApiKey | null> {
  try {
    // Oturum açmış kullanıcı bilgisini al
    const { data: { user } } = await supabase.auth.getUser();
    
    // Kullanıcı oturum açmadıysa null döndür
    if (!user) {
      throw new Error('No authenticated user found');
    }
    
    // Önce mevcut anahtarı kontrol et
    const existingKey = await getUserApiKey(provider);
    
    if (existingKey) {
      // Mevcut anahtarı güncelle
      const { data, error } = await supabase
        .from('user_api_keys')
        .update({
          api_key: apiKey,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingKey.id)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return {
        id: data.id,
        userId: data.user_id,
        provider: data.provider,
        apiKey: data.api_key,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } else {
      // Yeni anahtar oluştur
      const { data, error } = await supabase
        .from('user_api_keys')
        .insert({
          user_id: user.id,
          provider: provider,
          api_key: apiKey,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return {
        id: data.id,
        userId: data.user_id,
        provider: data.provider,
        apiKey: data.api_key,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    }
  } catch (error) {
    console.error('Error saving user API key:', error);
    return null;
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
export async function getUserApiKeys(): Promise<IUserApiKey[]> {
  try {
    // Oturum açmış kullanıcı bilgisini al
    const { data: { user } } = await supabase.auth.getUser();
    
    // Kullanıcı oturum açmadıysa boş array döndür
    if (!user) {
      console.warn('No authenticated user found');
      return [];
    }
    
    // Kullanıcının API anahtarlarını veritabanından al
    const { data, error } = await supabase
      .from('user_api_keys')
      .select('*')
      .eq('user_id', user.id);
    
    if (error || !data) {
      console.warn('No API keys found');
      return [];
    }
    
    return data.map(item => ({
      id: item.id,
      userId: item.user_id,
      provider: item.provider,
      apiKey: item.api_key,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at)
    }));
  } catch (error) {
    console.error('Error getting user API keys:', error);
    return [];
  }
} 