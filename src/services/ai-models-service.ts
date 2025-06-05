'use client';

import { supabase } from '../lib/supabase-client';
import { hasValidApiKey } from './api-keys-service';

export interface AiModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  required_api_key_type: string;
  is_active: boolean;
  is_available?: boolean; // Kullanıcının bu modeli kullanabilip kullanamayacağı
  is_preferred?: boolean; // Kullanıcının tercih ettiği model mi
}

// Tüm AI modellerini getir
export async function getAllAiModels(): Promise<AiModel[]> {
  const { data: models, error } = await supabase
    .from('ai_models')
    .select('*')
    .eq('is_active', true)
    .order('provider', { ascending: true });

  if (error) {
    console.error('Error fetching AI models:', error);
    return [];
  }

  // Kullanıcının tercihlerini ve erişilebilirliğini kontrol et
  const modelsWithAvailability = await Promise.all(
    models.map(async (model) => {
      // Kullanıcının bu model için API anahtarı var mı?
      const hasKey = await hasValidApiKey(model.required_api_key_type);
      
      // Kullanıcı tercihi var mı?
      const { data: preference } = await supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (!session) return { data: null };
        
        return supabase
          .from('user_model_preferences')
          .select('is_preferred')
          .eq('user_id', session.user.id)
          .eq('model_id', model.id)
          .maybeSingle();
      });

      return {
        ...model,
        is_available: hasKey,
        is_preferred: preference?.is_preferred || false
      };
    })
  );

  return modelsWithAvailability;
}

// Kullanıcının kullanabileceği modelleri getir
export async function getAvailableAiModels(): Promise<AiModel[]> {
  const allModels = await getAllAiModels();
  return allModels.filter(model => model.is_available);
}

// Kullanıcının tercih ettiği modelleri getir
export async function getPreferredAiModels(): Promise<AiModel[]> {
  const allModels = await getAllAiModels();
  return allModels.filter(model => model.is_preferred);
}

// Model tercihini güncelle
export async function updateModelPreference(modelId: string, isPreferred: boolean) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('User not authenticated');

  // Önce mevcut tercihi kontrol et
  const { data: existingPreference } = await supabase
    .from('user_model_preferences')
    .select()
    .eq('user_id', user.id)
    .eq('model_id', modelId)
    .maybeSingle();

  if (existingPreference) {
    // Mevcut tercihi güncelle
    const { error } = await supabase
      .from('user_model_preferences')
      .update({
        is_preferred: isPreferred,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingPreference.id);

    if (error) throw error;
  } else {
    // Yeni tercih ekle
    const { error } = await supabase
      .from('user_model_preferences')
      .insert({
        user_id: user.id,
        model_id: modelId,
        is_preferred: isPreferred
      });

    if (error) throw error;
  }

  return true;
} 