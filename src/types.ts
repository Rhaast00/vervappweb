// Kullanıcı API anahtarı
export interface IUserApiKey {
  id: string;
  userId: string;
  provider: string;
  apiKey: string;
  createdAt: Date;
  updatedAt: Date;
}

// AI model sağlayıcı
export interface AIModelProvider {
  id: string;
  name: string;
  key: string;
  logoUrl: string;
  description: string;
  modelsUrl?: string;
  authRequired: boolean;
  active: boolean;
}

// AI model
export interface AIModel {
  id: string;
  providerId: string;
  name: string;
  key: string;
  description: string;
  capabilities: string[];
  contextLength: number;
  active: boolean;
}

// Website analiz sonuçları
export interface WebsiteData {
  url: string;
  colors: string[];
  fonts: string[];
  layout: string;
  elements: Array<{
    type: string;
    description: string;
  }>;
}

// Yeniden tasarım talebi
export interface RedesignRequest {
  websiteData: WebsiteData;
  designStyle: DesignStyle;
}

// Tasarım stilleri
export type DesignStyle = 
  | 'minimalist'
  | 'brutalist'
  | 'glassmorphism'
  | 'neumorphism'
  | 'material'
  | 'flat'; 