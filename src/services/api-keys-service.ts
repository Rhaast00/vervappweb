'use client';

import { supabase } from '../lib/supabase-client';
import CryptoJS from 'crypto-js';

// API anahtarını şifrelemek için basit bir fonksiyon
const encryptApiKey = (apiKey: string): string => {
  // Normalde daha güvenli bir şifreleme kullanılmalıdır
  // Bu örnekte basit bir şifreleme kullanıyoruz
  const secretPassphrase = 'vervapp-secret-key';
  return CryptoJS.AES.encrypt(apiKey, secretPassphrase).toString();
};

// API anahtarının şifresini çözmek için fonksiyon
const decryptApiKey = (encryptedApiKey: string): string => {
  const secretPassphrase = 'vervapp-secret-key';
  const bytes = CryptoJS.AES.decrypt(encryptedApiKey, secretPassphrase);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// Kullanıcının API anahtarlarını getir
export async function getUserApiKeys() {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('user_api_keys')
    .select(`
      id,
      key_type,
      is_valid,
      created_at,
      updated_at,
      api_key_types (
        name,
        description
      )
    `)
    .eq('user_id', user.id);

  if (error) throw error;
  return data || [];
}

// API anahtarını kaydet
export async function saveApiKey(keyType: string, apiKey: string) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('User not authenticated');

  // Anahtarı şifrele
  const encryptedKey = encryptApiKey(apiKey);
  
  // Önce mevcut anahtarı kontrol et
  const { data: existingKey } = await supabase
    .from('user_api_keys')
    .select()
    .eq('user_id', user.id)
    .eq('key_type', keyType)
    .maybeSingle();
  
  if (existingKey) {
    // Mevcut anahtarı güncelle
    const { data, error } = await supabase
      .from('user_api_keys')
      .update({
        encrypted_key: encryptedKey,
        is_valid: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingKey.id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } else {
    // Yeni anahtar ekle
    const { data, error } = await supabase
      .from('user_api_keys')
      .insert({
        user_id: user.id,
        key_type: keyType,
        encrypted_key: encryptedKey
      })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }
}

// API anahtarını sil
export async function deleteApiKey(keyId: string) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('user_api_keys')
    .delete()
    .eq('id', keyId)
    .eq('user_id', user.id);

  if (error) throw error;
  return true;
}

// Kullanıcının belirli bir provider için API anahtarı olup olmadığını kontrol et
export async function hasValidApiKey(keyType: string): Promise<boolean> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return false;

  const { data, error } = await supabase
    .from('user_api_keys')
    .select()
    .eq('user_id', user.id)
    .eq('key_type', keyType)
    .eq('is_valid', true)
    .maybeSingle();

  if (error || !data) return false;
  return true;
}

// API anahtarını al
export async function getApiKey(keyType: string): Promise<string | null> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_api_keys')
    .select('encrypted_key')
    .eq('user_id', user.id)
    .eq('key_type', keyType)
    .eq('is_valid', true)
    .maybeSingle();

  if (error || !data) return null;
  
  // Anahtarın şifresini çöz
  try {
    return decryptApiKey(data.encrypted_key);
  } catch (e) {
    console.error('API key decryption error:', e);
    return null;
  }
} 