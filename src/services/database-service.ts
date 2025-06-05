'use client';

import { DesignStyle, WebsiteData } from '../types';
import { supabase } from '../lib/supabase-client';

// Website analiz sonuçlarını veritabanına kaydet
export async function saveWebsiteAnalysis(websiteData: WebsiteData) {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await supabase
      .from('website_analyses')
      .insert({
        user_id: user.id,
        url: websiteData.url,
        colors: websiteData.colors,
        fonts: websiteData.fonts,
        layout: websiteData.layout,
        elements: websiteData.elements
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error saving website analysis:', error);
    throw error;
  }
}

// Yeniden tasarımı veritabanına kaydet
export async function saveWebsiteRedesign(
  analysisId: string,
  designStyle: DesignStyle,
  html: string,
  css: string,
  preview: string
) {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await supabase
      .from('website_redesigns')
      .insert({
        user_id: user.id,
        analysis_id: analysisId,
        design_style: designStyle,
        html: html,
        css: css,
        preview: preview
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error saving website redesign:', error);
    throw error;
  }
}

// Kullanıcının tüm analizlerini getir
export async function getUserAnalyses() {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('website_analyses')
    .select()
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Kullanıcının tüm redesign'larını getir
export async function getUserRedesigns() {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('website_redesigns')
    .select(`
      *,
      website_analyses (*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Belirli bir analiz ID için tüm yeniden tasarımları getir
export async function getRedesignsForAnalysis(analysisId: string) {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await supabase
      .from('website_redesigns')
      .select('*')
      .eq('analysis_id', analysisId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error retrieving redesigns:', error);
    throw error;
  }
}

// Kullanıcının tüm website analizlerini getir
export async function getUserWebsiteAnalyses() {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await supabase
      .from('website_analyses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error retrieving website analyses:', error);
    throw error;
  }
}

// Belirli bir analiz ID için detayları getir
export async function getWebsiteAnalysis(analysisId: string) {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await supabase
      .from('website_analyses')
      .select('*')
      .eq('id', analysisId)
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error retrieving website analysis:', error);
    throw error;
  }
}

// Belirli bir redesign ID için detayları getir
export async function getWebsiteRedesign(redesignId: string) {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await supabase
      .from('website_redesigns')
      .select('*')
      .eq('id', redesignId)
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error retrieving website redesign:', error);
    throw error;
  }
} 