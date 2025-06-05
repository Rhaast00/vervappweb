'use client';

import { WebsiteData } from '../types';
import { getOpenAIClient, createMockOpenAIResponse } from '../lib/openai-client';
import { saveWebsiteAnalysis } from './database-service';
import { getApiKey } from './api-keys-service';

// AI istemcilerini al
async function getAIClient(modelType: string) {
  try {
    // Check if user has API key for the selected model
    const apiKey = await getApiKey(modelType);
    
    if (!apiKey) {
      console.warn(`No API key available for ${modelType}, cannot create client`);
      return null;
    }
    
    switch (modelType) {
      case 'openai':
        return await getOpenAIClient(apiKey);
      case 'anthropic':
        // Import and use Anthropic client
        const { getAnthropicClient } = await import('../lib/anthropic-client');
        const anthropicClient = await getAnthropicClient(apiKey);
        if (anthropicClient) {
          return anthropicClient;
        } else {
          console.warn("Anthropic client initialization failed, falling back to OpenAI");
          // Get the OpenAI API key specifically when falling back
          const openAIApiKey = await getApiKey('openai');
          if (!openAIApiKey) {
            console.warn('No OpenAI API key available for fallback');
            return null;
          }
          return await getOpenAIClient(openAIApiKey);
        }
      case 'google':
        // Import and use Google client
        const { getGoogleClient } = await import('../lib/google-client');
        const googleClient = await getGoogleClient(apiKey);
        if (googleClient) {
          return googleClient;
        } else {
          console.warn("Google Gemini client initialization failed, falling back to OpenAI");
          // Get the OpenAI API key specifically when falling back
          const openAIApiKey = await getApiKey('openai');
          if (!openAIApiKey) {
            console.warn('No OpenAI API key available for fallback');
            return null;
          }
          return await getOpenAIClient(openAIApiKey);
        }
      default:
        console.warn(`${modelType} model not found, falling back to OpenAI`);
        // Get the OpenAI API key specifically when falling back
        const openAIApiKey = await getApiKey('openai');
        if (!openAIApiKey) {
          console.warn('No OpenAI API key available for fallback');
          return null;
        }
        return await getOpenAIClient(openAIApiKey);
    }
  } catch (error) {
    console.error(`Error getting AI client for ${modelType}:`, error);
    return null;
  }
}

// Helper function to extract JSON from markdown code blocks
function extractJsonFromMarkdown(text: string): string {
  // Try to extract JSON from markdown code blocks
  const jsonBlockRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?```/i;
  const match = text.match(jsonBlockRegex);
  
  if (match && match[1]) {
    return match[1].trim();
  }
  
  // If no code block found, return the original text
  return text.trim();
}

export async function analyzeWebsite(url: string, modelType: string = 'openai', specificModel?: string): Promise<WebsiteData> {
  try {
    // Add http if not present
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    
    console.log(`Analyzing website: ${url} with model: ${modelType}${specificModel ? ` (${specificModel})` : ''}`);
    
    // API anahtarı kontrolü
    const apiKey = await getApiKey(modelType);
    if (!apiKey) {
      throw new Error(`${modelType} API anahtarı bulunamadı. Analiz yapılamıyor.`);
    }

    // In an ideal implementation, we would use a proxy service to:
    // 1. Fetch the website content (HTML, CSS)
    // 2. Screenshot the website
    // 3. Extract visible text and metadata
    // 4. Pass all this data to the AI model
    
    // For now, we use a mock approach that would be replaced with actual web scraping
    const mockWebsiteData: WebsiteData = {
      url,
      colors: ['#1a1a1a', '#ffffff', '#e74c3c', '#3498db', '#2ecc71'],
      fonts: ['Arial', 'Helvetica', 'Sans-serif'],
      layout: 'Standard responsive layout with header, content sections, and footer',
      elements: [
        { type: 'header', description: 'Navigation bar with logo and menu' },
        { type: 'hero', description: 'Hero section with banner image' },
        { type: 'content', description: 'Multiple content sections with images and text' },
        { type: 'footer', description: 'Footer with links and copyright information' }
      ],
      images: [
        { src: 'hero-image.jpg', alt: 'Hero Banner', type: 'banner' },
        { src: 'section-image-1.jpg', alt: 'Product Display', type: 'content' }
      ],
      contentStructure: {
        hierarchy: 'Three-level hierarchy with main navigation, section headings, and content',
        mainSections: ['Home', 'About', 'Services', 'Contact'],
        contentDensity: 'Medium',
      }
    };
    
    // Use AI to enhance the analysis if API key is available
    try {
      const aiAnalysis = await analyzeWithAI(url, mockWebsiteData, modelType, specificModel);
      const enhancedData = {
        ...mockWebsiteData,
        ...aiAnalysis
      };
      
      // Save to database
      try {
        await saveWebsiteAnalysis(enhancedData);
      } catch (dbError) {
        console.error('Error saving website analysis to database:', dbError);
        // Continue even if saving to database fails
      }
      
      return enhancedData;
    } catch (aiError) {
      console.warn('AI analysis failed, using basic analysis:', aiError);
      
      // Save basic analysis to database if AI fails
      try {
        await saveWebsiteAnalysis(mockWebsiteData);
      } catch (dbError) {
        console.error('Error saving website analysis to database:', dbError);
      }
      
      return mockWebsiteData;
    }
  } catch (error) {
    console.error('Error analyzing website:', error);
    throw new Error('Failed to analyze website. Please check the URL and try again.');
  }
}

async function analyzeWithAI(url: string, basicData: WebsiteData, modelType: string, specificModel?: string): Promise<Partial<WebsiteData>> {
  try {
    console.log(`Starting AI analysis with model: ${modelType}${specificModel ? ` (${specificModel})` : ''}`);
    
    // A more comprehensive prompt that includes instructions for image analysis and content structure
    const prompt = `
      Perform a comprehensive analysis of this website: ${url}
      
      Conduct a full visual and structural analysis of every aspect of the website, including:
      
      I already have some basic information:
      - Colors: ${basicData.colors.join(', ')}
      - Fonts: ${basicData.fonts.join(', ')}
      - Layout: ${basicData.layout}
      
      Please analyze the website in extreme detail, focusing on:
      
      1. Visual Design
         - Complete color palette (all main and accent colors with hex codes)
         - Typography (all font families used and their purposes)
         - Spacing patterns and visual rhythm
         - Use of imagery and iconography
      
      2. Layout and Structure
         - Overall layout structure and grid system
         - Header, footer, and main navigation patterns
         - Content hierarchy and organization
         - Responsive design approach if detectable
      
      3. UI Components
         - All major UI elements (buttons, forms, cards, etc.)
         - Interactive elements and their states
         - Unique design patterns or custom components
      
      4. Images
         - Types of images used (photos, illustrations, icons)
         - Image placement and purpose
         - Image styling (borders, shadows, effects)
      
      5. Content Structure
         - Information architecture
         - Content grouping and categorization
         - Content density and distribution
      
      Return the analysis in JSON format with these keys:
      - colors (array of hex codes)
      - fonts (array of font names with descriptions)
      - layout (detailed description of layout system)
      - elements (array of objects with type and description of all UI components)
      - images (array of objects describing key images with type and purpose)
      - contentStructure (object with hierarchy, mainSections, and contentDensity)
      
      Be as comprehensive as possible in your analysis. Return ONLY valid JSON without any markdown formatting or code blocks.
    `;
    
    let result;
    
    try {
      // Handle different model types
      if (modelType === 'openai') {
        // For OpenAI
        const apiKey = await getApiKey('openai');
        if (!apiKey) {
          throw new Error("No OpenAI API key available");
        }
        
        const openAIClient = await getOpenAIClient(apiKey);
        if (!openAIClient) {
          throw new Error("Failed to initialize OpenAI client");
        }
        
        // Use specific model if provided, default to gpt-4
        const modelToUse = specificModel || 'gpt-4';
        console.log(`Using OpenAI model: ${modelToUse}`);
        
        const response = await openAIClient.chat.completions.create({
          model: modelToUse,
          messages: [
            { role: "system", content: "You are an expert web design analyzer with visual understanding capabilities. You extract detailed design information from websites." },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" }
        });
        
        result = JSON.parse(response.choices[0].message.content || '{}');
      } else if (modelType === 'anthropic') {
        // For Anthropic Claude
        const { getAnthropicClient, generateAnthropicCompletion } = await import('../lib/anthropic-client');
        
        const apiKey = await getApiKey('anthropic');
        if (!apiKey) {
          throw new Error("No Anthropic API key available");
        }
        
        const anthropicClient = await getAnthropicClient(apiKey);
        if (!anthropicClient) {
          throw new Error("Failed to initialize Anthropic client");
        }
        
        // Use specific model if provided, default to claude-3-opus-20240229
        const modelToUse = specificModel || 'claude-3-opus-20240229';
        console.log(`Using Anthropic model: ${modelToUse}`);
        
        const anthropicResponse = await generateAnthropicCompletion(anthropicClient, [
          { role: "system", content: "You are an expert web design analyzer with visual understanding capabilities. You extract detailed design information from websites." },
          { role: "user", content: prompt }
        ], modelToUse);
        
        const responseText = extractJsonFromMarkdown(anthropicResponse.choices[0].message.content || '{}');
        result = JSON.parse(responseText);
      } else if (modelType === 'google') {
        // For Google Gemini
        const { getGoogleClient, generateGoogleCompletion } = await import('../lib/google-client');
        
        const apiKey = await getApiKey('google');
        if (!apiKey) {
          throw new Error("No Google API key available");
        }
        
        const googleClient = await getGoogleClient(apiKey);
        if (!googleClient) {
          throw new Error("Failed to initialize Google client");
        }
        
        // Use specific model if provided, default to gemini-2.0-flash
        const modelToUse = specificModel || 'gemini-2.0-flash';
        console.log(`Using Google model: ${modelToUse}`);
        
        const googleResponse = await generateGoogleCompletion(googleClient, [
          { role: "system", content: "You are an expert web design analyzer with visual understanding capabilities. You extract detailed design information from websites." },
          { role: "user", content: prompt }
        ], modelToUse);
        
        // Extract JSON from potential markdown formatting
        const responseText = extractJsonFromMarkdown(googleResponse.choices[0].message.content || '{}');
        console.log("Extracted response text:", responseText.substring(0, 200) + "...");
        result = JSON.parse(responseText);
      } else {
        throw new Error(`Unsupported model type: ${modelType}`);
      }
      
      return {
        colors: result.colors || basicData.colors,
        fonts: result.fonts || basicData.fonts,
        layout: result.layout || basicData.layout,
        elements: result.elements || basicData.elements,
        images: result.images || basicData.images,
        contentStructure: result.contentStructure || basicData.contentStructure
      };
    } catch (aiError) {
      console.error(`Error analyzing with ${modelType}:`, aiError);
      throw new Error(`${modelType} API client could not be initialized or failed during analysis`);
    }
  } catch (error) {
    console.error('Error analyzing with AI:', error);
    return {};
  }
} 