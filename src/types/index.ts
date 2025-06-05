export interface WebsiteData {
  url: string;
  colors: string[];
  fonts: string[];
  layout: string;
  elements: {
    type: string;
    description: string;
  }[];
}

export type DesignStyle = 
  | 'minimalist'
  | 'brutalist'
  | 'glassmorphism'
  | 'neumorphism'
  | 'material'
  | 'flat';

export interface RedesignRequest {
  websiteData: WebsiteData;
  designStyle: DesignStyle;
} 