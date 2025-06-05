'use client';

import React, { createContext, useContext, useState } from 'react';
import { DesignStyle, WebsiteData } from '../types';

interface WebsiteContextType {
  websiteData: WebsiteData | null;
  setWebsiteData: (data: WebsiteData) => void;
  selectedDesignStyle: DesignStyle | null;
  setSelectedDesignStyle: (style: DesignStyle) => void;
  redesignResult: {
    html: string;
    css: string;
    preview: string;
  } | null;
  setRedesignResult: (result: { html: string; css: string; preview: string } | null) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (value: boolean) => void;
  isRedesigning: boolean;
  setIsRedesigning: (value: boolean) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
}

const WebsiteContext = createContext<WebsiteContextType | undefined>(undefined);

export function WebsiteProvider({ children }: { children: React.ReactNode }) {
  const [websiteData, setWebsiteData] = useState<WebsiteData | null>(null);
  const [selectedDesignStyle, setSelectedDesignStyle] = useState<DesignStyle | null>(null);
  const [redesignResult, setRedesignResult] = useState<{
    html: string;
    css: string;
    preview: string;
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRedesigning, setIsRedesigning] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('openai');

  const value = {
    websiteData,
    setWebsiteData,
    selectedDesignStyle,
    setSelectedDesignStyle,
    redesignResult,
    setRedesignResult,
    isAnalyzing,
    setIsAnalyzing,
    isRedesigning,
    setIsRedesigning,
    selectedModel,
    setSelectedModel,
  };

  return (
    <WebsiteContext.Provider value={value}>
      {children}
    </WebsiteContext.Provider>
  );
}

export function useWebsite() {
  const context = useContext(WebsiteContext);
  if (context === undefined) {
    throw new Error('useWebsite must be used within a WebsiteProvider');
  }
  return context;
} 