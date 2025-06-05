'use client';

import axios from 'axios';
import * as cheerio from 'cheerio';
import { WebsiteData } from '../types';
import { getOpenAIClient, createMockOpenAIResponse } from '../lib/openai-client';
import { saveWebsiteAnalysis } from './database-service';

export async function analyzeWebsite(url: string): Promise<WebsiteData> {
  try {
    // Add http if not present
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    
    // Fetch website content
    const response = await axios.get(url);
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Extract basic information
    const title = $('title').text();
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    
    // Get all CSS to analyze
    const cssLinks = $('link[rel="stylesheet"]')
      .map((_, el) => $(el).attr('href'))
      .get()
      .filter(Boolean);
    
    // Get all inline styles
    const inlineStyles = $('style')
      .map((_, el) => $(el).html())
      .get()
      .join('\n');
    
    // Get all elements for structure analysis
    const bodyContent = $('body').html() || '';
    
    // Use AI to analyze the website design
    const aiAnalysis = await analyzeWithAI({
      title,
      metaDescription,
      cssLinks,
      inlineStyles,
      bodyContent,
      url
    });
    
    // Create the website data object
    const websiteData = {
      url,
      ...aiAnalysis
    };
    
    // Save to database
    try {
      await saveWebsiteAnalysis(websiteData);
    } catch (dbError) {
      console.error('Error saving website analysis to database:', dbError);
      // Continue even if saving to database fails
    }
    
    return websiteData;
  } catch (error) {
    console.error('Error analyzing website:', error);
    throw new Error('Failed to analyze website. Please check the URL and try again.');
  }
}

async function analyzeWithAI(data: {
  title: string;
  metaDescription: string;
  cssLinks: string[];
  inlineStyles: string;
  bodyContent: string;
  url: string;
}): Promise<Omit<WebsiteData, 'url'>> {
  try {
    const prompt = `
      Analyze this website data and extract the following information:
      
      1. Color palette (main colors used)
      2. Fonts used
      3. Overall layout structure
      4. Key UI elements and components
      
      Website: ${data.url}
      Title: ${data.title}
      Description: ${data.metaDescription}
      
      CSS Sample: ${data.inlineStyles.substring(0, 500)}...
      
      HTML Sample: ${data.bodyContent.substring(0, 500)}...
      
      Return the analysis in JSON format with these keys:
      - colors (array of hex codes)
      - fonts (array of font names)
      - layout (string description)
      - elements (array of objects with type and description)
    `;
    
    // OpenAI client'ını al
    const openai = await getOpenAIClient();
    let response;
    
    if (openai) {
      // OpenAI API ile analiz yap
      response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are a web design analyzer that extracts design information from websites." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      });
    } else {
      // API anahtarı yoksa mock data kullan
      console.warn('No OpenAI API key available, using mock data');
      response = createMockOpenAIResponse(prompt);
    }
    
    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      colors: result.colors || [],
      fonts: result.fonts || [],
      layout: result.layout || 'Unknown layout',
      elements: result.elements || []
    };
  } catch (error) {
    console.error('Error analyzing with AI:', error);
    return {
      colors: ['#000000', '#ffffff'],
      fonts: ['Unknown'],
      layout: 'Could not analyze layout',
      elements: []
    };
  }
} 