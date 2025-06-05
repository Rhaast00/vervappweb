'use client';

import { DesignStyle, RedesignRequest, WebsiteData } from '../types';
import { getOpenAIClient, createMockOpenAIResponse } from '../lib/openai-client';
import { getApiKey } from './api-keys-service';
import { saveWebsiteRedesign, saveWebsiteAnalysis } from './database-service';

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

// Retrieve appropriate AI client based on model type
async function getAIClient(modelType: string = 'openai') {
  try {
    // Check if user has API key for the selected model
    const apiKey = await getApiKey(modelType);
    
    if (!apiKey) {
      console.warn(`No API key available for ${modelType}, cannot create client`);
      return null;
    }
    
    // Handle different AI model types
    if (modelType === 'openai') {
      return await getOpenAIClient(apiKey);
    } else if (modelType === 'anthropic') {
      const { getAnthropicClient } = await import('../lib/anthropic-client');
      return await getAnthropicClient(apiKey);
    } else if (modelType === 'google') {
      const { getGoogleClient } = await import('../lib/google-client');
      return await getGoogleClient(apiKey);
    } else {
      console.warn(`Model type ${modelType} is not supported`);
      return null;
    }
  } catch (error) {
    console.error(`Error getting AI client for ${modelType}:`, error);
    return null;
  }
}

export async function redesignWebsite(request: RedesignRequest, modelType: string = 'openai', specificModel?: string): Promise<{
  id?: string;
  html: string;
  css: string;
  preview: string;
}> {
  try {
    const { websiteData, designStyle } = request;
    
    // Create a prompt for the AI to generate a redesign
    const prompt = createRedesignPrompt(websiteData, designStyle);
    
    // Get the appropriate AI client
    const aiClient = await getAIClient(modelType);
    let result;
    
    if (aiClient) {
      // Generate the redesign using AI model
      console.log(`Generating redesign using ${modelType} model${specificModel ? ` (${specificModel})` : ''}...`);
      
      try {
        // Handle different AI model types
        if (modelType === 'openai') {
          // For OpenAI
          // Check if it's an OpenAI client by checking for OpenAI-specific properties
          if ('chat' in aiClient && 'completions' in aiClient.chat) {
            const response = await aiClient.chat.completions.create({
              model: specificModel || "gpt-4",
              messages: [
                { 
                  role: "system", 
                  content: "You are a professional web designer specialized in creating modern, responsive websites. You generate clean HTML and CSS code based on design requirements."
                },
                { role: "user", content: prompt }
              ],
              response_format: { type: "json_object" }
            });
            
            result = JSON.parse(response.choices[0].message.content || '{}');
          } else {
            throw new Error("Invalid OpenAI client");
          }
        } else if (modelType === 'anthropic') {
          // For Anthropic Claude
          const { getAnthropicClient, generateAnthropicCompletion } = await import('../lib/anthropic-client');
          
          // Get a new Anthropic client instead of using the one from getAIClient
          const apiKey = await getApiKey('anthropic');
          if (!apiKey) {
            throw new Error("No Anthropic API key available");
          }
          
          const anthropicClient = await getAnthropicClient(apiKey);
          if (!anthropicClient) {
            throw new Error("Failed to initialize Anthropic client");
          }
          
          // Use the proper client with specific model if provided
          const anthropicResponse = await generateAnthropicCompletion(anthropicClient, [
            { 
              role: "system", 
              content: "You are a professional web designer specialized in creating modern, responsive websites. You generate clean HTML and CSS code based on design requirements."
            },
            { role: "user", content: prompt }
          ], specificModel);
          
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
          
          // Use only the specified model (no more testing multiple models)
          const selectedModel = specificModel || 'gemini-2.0-flash';
          console.log(`Using Google model: ${selectedModel}`);
          
          const googleResponse = await generateGoogleCompletion(googleClient, [
            { 
              role: "system", 
              content: "You are a professional web designer specialized in creating modern, responsive websites. You generate clean HTML and CSS code based on design requirements."
            },
            { role: "user", content: prompt }
          ], selectedModel);
          
          const responseText = extractJsonFromMarkdown(googleResponse.choices[0].message.content || '{}');
          result = JSON.parse(responseText);
        } else {
          throw new Error(`Unsupported model type: ${modelType}`);
        }
      } catch (aiError) {
        console.error(`Error generating with ${modelType}${specificModel ? ` (${specificModel})` : ''}:`, aiError);
        // Fall back to mock data if AI generation fails
        result = generateMockResult(websiteData, designStyle, modelType, prompt);
      }
    } else {
      // API anahtarı yoksa mock data kullan
      console.warn(`No ${modelType} API key available, using mock data for redesign`);
      result = generateMockResult(websiteData, designStyle, modelType, prompt);
    }
    
    const redesignResult = {
      html: result.html || '<div>Error generating HTML</div>',
      css: result.css || 'body { font-family: sans-serif; }',
      preview: result.preview || 'No preview available'
    };
    
    // Save to database
    try {
      // First save the website analysis if it doesn't exist
      const savedAnalysis = await saveWebsiteAnalysis(websiteData);
      
      const savedRedesign = await saveWebsiteRedesign(
        savedAnalysis.id,
        designStyle,
        redesignResult.html,
        redesignResult.css,
        redesignResult.preview
      );
      
      return {
        id: savedRedesign.id,
        ...redesignResult
      };
    } catch (dbError) {
      console.error('Error saving website redesign to database:', dbError);
      // Continue even if saving to database fails
    }
    
    return redesignResult;
  } catch (error) {
    console.error('Error redesigning website:', error);
    throw new Error('Failed to redesign website. Please try again later.');
  }
}

// Helper function to generate mock results
function generateMockResult(websiteData: WebsiteData, designStyle: DesignStyle, modelType: string, prompt: string): any {
  let mockResponse;
  
  // Use the appropriate mock response based on model type
  if (modelType === 'google') {
    const { createMockGoogleResponse } = require('../lib/google-client');
    mockResponse = createMockGoogleResponse(prompt);
  } else if (modelType === 'anthropic') {
    const { createMockAnthropicResponse } = require('../lib/anthropic-client');
    mockResponse = createMockAnthropicResponse(prompt);
  } else {
    mockResponse = createMockOpenAIResponse(prompt);
  }

  // Style-specific templates
  const styleTemplates = {
    minimalist: {
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Minimalist Redesign</title>
</head>
<body>
  <div class="minimal-container">
    <nav class="minimal-nav">
      <div class="minimal-logo">Clean</div>
      <div class="minimal-menu">
        <a href="#home" class="minimal-link">Home</a>
        <a href="#about" class="minimal-link">About</a>
        <a href="#contact" class="minimal-link">Contact</a>
      </div>
    </nav>
    
    <main class="minimal-main">
      <section class="minimal-hero">
        <h1>Minimal Design</h1>
        <p>Less is more. Focus on what matters.</p>
        <button class="minimal-button">Explore</button>
      </section>
      
      <section class="minimal-content">
        <div class="minimal-card">
          <h3>Simplicity</h3>
          <p>Clean and uncluttered design</p>
        </div>
        <div class="minimal-card">
          <h3>Focus</h3>
          <p>Direct attention to important elements</p>
        </div>
        <div class="minimal-card">
          <h3>Clarity</h3>
          <p>Clear communication through design</p>
        </div>
      </section>
    </main>
    
    <footer class="minimal-footer">
      <p>© 2024 Minimal Design</p>
    </footer>
  </div>
</body>
</html>`,
      css: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  line-height: 1.6;
  color: #333;
  background: #fff;
}

.minimal-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.minimal-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem 5%;
  border-bottom: 1px solid #eee;
}

.minimal-logo {
  font-size: 1.5rem;
  font-weight: 600;
  color: #000;
}

.minimal-menu {
  display: flex;
  gap: 2rem;
}

.minimal-link {
  color: #666;
  text-decoration: none;
  transition: color 0.3s ease;
}

.minimal-link:hover {
  color: #000;
}

.minimal-main {
  flex: 1;
  padding: 5% 5%;
}

.minimal-hero {
  text-align: center;
  padding: 5rem 0;
}

.minimal-hero h1 {
  font-size: 3rem;
  font-weight: 300;
  margin-bottom: 1rem;
  color: #000;
}

.minimal-hero p {
  font-size: 1.2rem;
  color: #666;
  margin-bottom: 2rem;
}

.minimal-button {
  background: #000;
  color: #fff;
  border: none;
  padding: 1rem 2rem;
  font-size: 1rem;
  cursor: pointer;
  transition: opacity 0.3s ease;
}

.minimal-button:hover {
  opacity: 0.8;
}

.minimal-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 3rem;
  margin-top: 5rem;
}

.minimal-card {
  text-align: center;
  padding: 2rem;
}

.minimal-card h3 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #000;
}

.minimal-card p {
  color: #666;
}

.minimal-footer {
  text-align: center;
  padding: 2rem;
  border-top: 1px solid #eee;
  color: #666;
}`
    },
    
    brutalist: {
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BRUTALIST REDESIGN</title>
</head>
<body>
  <header class="brutal-header">
    <nav class="brutal-nav">
      <div class="brutal-logo">LOGO</div>
      <div class="brutal-menu">
        <div class="brutal-link">HOME</div>
        <div class="brutal-link">ABOUT</div>
        <div class="brutal-link">SERVICES</div>
        <div class="brutal-link">CONTACT</div>
      </div>
    </nav>
  </header>
  
  <main class="brutal-main">
    <section class="brutal-hero">
      <h1 class="brutal-title">RAW. BOLD. UNCOMPROMISING.</h1>
      <p class="brutal-subtitle">BRUTALIST DESIGN STRIPS AWAY THE UNNECESSARY</p>
      <button class="brutal-button">ENTER</button>
    </section>
    
    <section class="brutal-grid">
      <div class="brutal-block">
        <h2>FUNCTION</h2>
        <p>Form follows function in its purest state</p>
      </div>
      <div class="brutal-block">
        <h2>CONTRAST</h2>
        <p>High contrast creates visual hierarchy</p>
      </div>
      <div class="brutal-block">
        <h2>HONESTY</h2>
        <p>No hiding behind decorative elements</p>
      </div>
    </section>
  </main>
  
  <footer class="brutal-footer">
    <div class="brutal-footer-text">© 2024 BRUTAL DESIGN</div>
  </footer>
</body>
</html>`,
      css: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Courier New', 'Monaco', monospace;
  background: #000;
  color: #fff;
  line-height: 1.2;
}

.brutal-header {
  background: #fff;
  color: #000;
  border-bottom: 5px solid #000;
}

.brutal-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: #fff;
}

.brutal-logo {
  font-size: 2rem;
  font-weight: bold;
  color: #000;
  border: 3px solid #000;
  padding: 0.5rem 1rem;
}

.brutal-menu {
  display: flex;
  gap: 0;
}

.brutal-link {
  background: #000;
  color: #fff;
  padding: 1rem 1.5rem;
  border: 3px solid #fff;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.1s ease;
}

.brutal-link:hover {
  background: #fff;
  color: #000;
  border-color: #000;
}

.brutal-hero {
  text-align: center;
  padding: 4rem 2rem;
  background: #ff0000;
  color: #000;
  border-bottom: 8px solid #000;
}

.brutal-title {
  font-size: 4rem;
  font-weight: bold;
  margin-bottom: 1rem;
  text-transform: uppercase;
  letter-spacing: 3px;
}

.brutal-subtitle {
  font-size: 1.2rem;
  margin-bottom: 2rem;
  font-weight: bold;
}

.brutal-button {
  background: #000;
  color: #fff;
  border: 4px solid #000;
  padding: 1rem 3rem;
  font-size: 1.5rem;
  font-weight: bold;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.1s ease;
}

.brutal-button:hover {
  background: #fff;
  color: #000;
}

.brutal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 0;
  margin: 0;
}

.brutal-block {
  background: #fff;
  color: #000;
  padding: 3rem 2rem;
  border: 5px solid #000;
  text-align: center;
}

.brutal-block:nth-child(2) {
  background: #00ff00;
}

.brutal-block:nth-child(3) {
  background: #0000ff;
  color: #fff;
}

.brutal-block h2 {
  font-size: 2rem;
  margin-bottom: 1rem;
  font-weight: bold;
}

.brutal-footer {
  background: #fff;
  color: #000;
  text-align: center;
  padding: 2rem;
  border-top: 5px solid #000;
  font-weight: bold;
}`
    },
    
    glassmorphism: {
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Glassmorphism Redesign</title>
</head>
<body>
  <div class="glass-background">
    <nav class="glass-nav">
      <div class="glass-logo">Logo</div>
      <div class="glass-menu">
        <a href="#" class="glass-link">Home</a>
        <a href="#" class="glass-link">About</a>
        <a href="#" class="glass-link">Services</a>
        <a href="#" class="glass-link">Contact</a>
      </div>
    </nav>
    
    <main class="glass-main">
      <section class="glass-hero">
        <div class="glass-hero-content">
          <h1>Transparent Beauty</h1>
          <p>Experience the elegance of glassmorphism design</p>
          <button class="glass-button">Discover</button>
        </div>
      </section>
      
      <section class="glass-cards">
        <div class="glass-card">
          <h3>Transparency</h3>
          <p>See through the layers of design</p>
        </div>
        <div class="glass-card">
          <h3>Depth</h3>
          <p>Multiple layers create visual depth</p>
        </div>
        <div class="glass-card">
          <h3>Elegance</h3>
          <p>Sophisticated and modern aesthetic</p>
        </div>
      </section>
    </main>
    
    <footer class="glass-footer">
      <p>© 2024 Glass Design</p>
    </footer>
  </div>
</body>
</html>`,
      css: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'SF Pro Display', -apple-system, sans-serif;
  overflow-x: hidden;
}

.glass-background {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
}

.glass-background::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="20" cy="20" r="2" fill="rgba(255,255,255,0.1)"/><circle cx="80" cy="80" r="3" fill="rgba(255,255,255,0.05)"/></svg>');
  pointer-events: none;
}

.glass-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 3rem;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.glass-logo {
  font-size: 1.5rem;
  font-weight: 600;
  color: white;
}

.glass-menu {
  display: flex;
  gap: 2rem;
}

.glass-link {
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 25px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.glass-link:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.glass-hero {
  text-align: center;
  padding: 6rem 2rem;
  position: relative;
}

.glass-hero-content {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(15px);
  border-radius: 30px;
  padding: 4rem 3rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  max-width: 600px;
  margin: 0 auto;
}

.glass-hero h1 {
  font-size: 3rem;
  color: white;
  margin-bottom: 1rem;
  font-weight: 300;
}

.glass-hero p {
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 2rem;
}

.glass-button {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 1rem 2.5rem;
  border-radius: 25px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.glass-button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-3px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.glass-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  padding: 3rem;
  max-width: 1200px;
  margin: 0 auto;
}

.glass-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 2.5rem 2rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  text-align: center;
  transition: all 0.3s ease;
}

.glass-card:hover {
  transform: translateY(-5px);
  background: rgba(255, 255, 255, 0.15);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
}

.glass-card h3 {
  color: white;
  font-size: 1.5rem;
  margin-bottom: 1rem;
  font-weight: 500;
}

.glass-card p {
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.6;
}

.glass-footer {
  text-align: center;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(5px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
}`
    },
    
    neumorphism: {
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Neumorphism Redesign</title>
</head>
<body>
  <div class="neu-container">
    <nav class="neu-nav">
      <div class="neu-logo">Logo</div>
      <div class="neu-menu">
        <a href="#" class="neu-link">Home</a>
        <a href="#" class="neu-link">About</a>
        <a href="#" class="neu-link">Services</a>
        <a href="#" class="neu-link">Contact</a>
      </div>
    </nav>
    
    <main class="neu-main">
      <section class="neu-hero">
        <div class="neu-hero-card">
          <h1>Soft UI Design</h1>
          <p>Experience the subtle depth of neumorphism</p>
          <button class="neu-button">Explore</button>
        </div>
      </section>
      
      <section class="neu-cards">
        <div class="neu-card">
          <div class="neu-icon"></div>
          <h3>Tactile</h3>
          <p>Elements appear touchable and interactive</p>
        </div>
        <div class="neu-card">
          <div class="neu-icon"></div>
          <h3>Subtle</h3>
          <p>Gentle shadows create elegant depth</p>
        </div>
        <div class="neu-card">
          <div class="neu-icon"></div>
          <h3>Modern</h3>
          <p>Contemporary approach to skeuomorphism</p>
        </div>
      </section>
    </main>
    
    <footer class="neu-footer">
      <div class="neu-footer-card">
        <p>© 2024 Neumorphic Design</p>
      </div>
    </footer>
  </div>
</body>
</html>`,
      css: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Poppins', -apple-system, sans-serif;
  background: #e0e5ec;
  color: #5a6c7d;
  line-height: 1.6;
}

.neu-container {
  min-height: 100vh;
  background: #e0e5ec;
}

.neu-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem 3rem;
  background: #e0e5ec;
  box-shadow: 
    9px 9px 16px #a3b1c6,
    -9px -9px 16px #ffffff;
  border-radius: 20px;
  margin: 1rem;
}

.neu-logo {
  font-size: 1.5rem;
  font-weight: 600;
  color: #5a6c7d;
  background: #e0e5ec;
  padding: 0.8rem 1.5rem;
  border-radius: 15px;
  box-shadow: 
    inset 5px 5px 10px #a3b1c6,
    inset -5px -5px 10px #ffffff;
}

.neu-menu {
  display: flex;
  gap: 1rem;
}

.neu-link {
  color: #5a6c7d;
  text-decoration: none;
  padding: 0.8rem 1.5rem;
  border-radius: 15px;
  background: #e0e5ec;
  box-shadow: 
    5px 5px 10px #a3b1c6,
    -5px -5px 10px #ffffff;
  transition: all 0.3s ease;
  font-weight: 500;
}

.neu-link:hover {
  box-shadow: 
    inset 5px 5px 10px #a3b1c6,
    inset -5px -5px 10px #ffffff;
}

.neu-hero {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4rem 2rem;
}

.neu-hero-card {
  background: #e0e5ec;
  padding: 4rem 3rem;
  border-radius: 30px;
  box-shadow: 
    20px 20px 40px #a3b1c6,
    -20px -20px 40px #ffffff;
  text-align: center;
  max-width: 600px;
}

.neu-hero h1 {
  font-size: 3rem;
  color: #5a6c7d;
  margin-bottom: 1rem;
  font-weight: 300;
}

.neu-hero p {
  font-size: 1.2rem;
  margin-bottom: 2rem;
  color: #7a8a9d;
}

.neu-button {
  background: #e0e5ec;
  color: #5a6c7d;
  border: none;
  padding: 1rem 3rem;
  border-radius: 20px;
  font-size: 1rem;
  cursor: pointer;
  box-shadow: 
    10px 10px 20px #a3b1c6,
    -10px -10px 20px #ffffff;
  transition: all 0.3s ease;
  font-weight: 600;
}

.neu-button:hover {
  box-shadow: 
    inset 10px 10px 20px #a3b1c6,
    inset -10px -10px 20px #ffffff;
}

.neu-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 3rem;
  padding: 3rem;
  max-width: 1200px;
  margin: 0 auto;
}

.neu-card {
  background: #e0e5ec;
  padding: 3rem 2rem;
  border-radius: 25px;
  box-shadow: 
    15px 15px 30px #a3b1c6,
    -15px -15px 30px #ffffff;
  text-align: center;
  transition: all 0.3s ease;
}

.neu-card:hover {
  transform: translateY(-5px);
}

.neu-icon {
  width: 60px;
  height: 60px;
  background: #e0e5ec;
  border-radius: 50%;
  margin: 0 auto 1.5rem;
  box-shadow: 
    inset 8px 8px 16px #a3b1c6,
    inset -8px -8px 16px #ffffff;
}

.neu-card h3 {
  color: #5a6c7d;
  font-size: 1.5rem;
  margin-bottom: 1rem;
  font-weight: 500;
}

.neu-card p {
  color: #7a8a9d;
  line-height: 1.6;
}

.neu-footer {
  text-align: center;
  padding: 3rem;
}

.neu-footer-card {
  background: #e0e5ec;
  padding: 2rem;
  border-radius: 20px;
  box-shadow: 
    10px 10px 20px #a3b1c6,
    -10px -10px 20px #ffffff;
  display: inline-block;
  color: #7a8a9d;
}`
    },
    
    material: {
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Material Design Redesign</title>
</head>
<body>
  <div class="material-container">
    <header class="material-header">
      <nav class="material-nav">
        <div class="material-logo">
          <div class="material-logo-icon"></div>
          <span>MaterialApp</span>
        </div>
        <div class="material-menu">
          <a href="#" class="material-link">Home</a>
          <a href="#" class="material-link">Products</a>
          <a href="#" class="material-link">About</a>
          <a href="#" class="material-link">Contact</a>
        </div>
      </nav>
    </header>
    
    <main class="material-main">
      <section class="material-hero">
        <div class="material-hero-content">
          <h1>Material Design</h1>
          <p>Bold, graphic, and intentional design system by Google</p>
          <button class="material-fab">
            <svg class="material-fab-icon" viewBox="0 0 24 24">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
          </button>
          <button class="material-button">Get Started</button>
        </div>
      </section>
      
      <section class="material-cards">
        <div class="material-card">
          <div class="material-card-media"></div>
          <div class="material-card-content">
            <h3>Innovation</h3>
            <p>Create beautiful and functional user interfaces with Material Design principles</p>
            <div class="material-card-actions">
              <button class="material-text-button">Learn More</button>
              <button class="material-text-button">Share</button>
            </div>
          </div>
        </div>
        
        <div class="material-card">
          <div class="material-card-media material-card-media-2"></div>
          <div class="material-card-content">
            <h3>Consistency</h3>
            <p>Unified design language that combines classic principles of good design with innovation</p>
            <div class="material-card-actions">
              <button class="material-text-button">Learn More</button>
              <button class="material-text-button">Share</button>
            </div>
          </div>
        </div>
        
        <div class="material-card">
          <div class="material-card-media material-card-media-3"></div>
          <div class="material-card-content">
            <h3>Accessibility</h3>
            <p>Design for everyone with inclusive and accessible user interface components</p>
            <div class="material-card-actions">
              <button class="material-text-button">Learn More</button>
              <button class="material-text-button">Share</button>
            </div>
          </div>
        </div>
      </section>
    </main>
    
    <footer class="material-footer">
      <div class="material-footer-content">
        <p>© 2024 Material Design Application</p>
      </div>
    </footer>
  </div>
</body>
</html>`,
      css: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Roboto', -apple-system, sans-serif;
  background: #fafafa;
  color: rgba(0, 0, 0, 0.87);
  line-height: 1.5;
}

.material-container {
  min-height: 100vh;
}

.material-header {
  background: #2196F3;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 10;
}

.material-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.material-logo {
  display: flex;
  align-items: center;
  color: white;
  font-size: 1.5rem;
  font-weight: 500;
}

.material-logo-icon {
  width: 32px;
  height: 32px;
  background: #FF5722;
  border-radius: 50%;
  margin-right: 0.5rem;
}

.material-menu {
  display: flex;
  gap: 0;
}

.material-link {
  color: white;
  text-decoration: none;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  transition: background 0.2s ease;
  font-weight: 500;
}

.material-link:hover {
  background: rgba(255, 255, 255, 0.1);
}

.material-hero {
  background: linear-gradient(135deg, #2196F3 0%, #21CBF3 100%);
  padding: 6rem 2rem;
  text-align: center;
  color: white;
  position: relative;
}

.material-hero-content {
  max-width: 800px;
  margin: 0 auto;
}

.material-hero h1 {
  font-size: 3.5rem;
  font-weight: 300;
  margin-bottom: 1rem;
}

.material-hero p {
  font-size: 1.25rem;
  margin-bottom: 3rem;
  opacity: 0.9;
}

.material-fab {
  position: absolute;
  bottom: -28px;
  right: 2rem;
  width: 56px;
  height: 56px;
  background: #FF5722;
  border: none;
  border-radius: 50%;
  box-shadow: 0 6px 10px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.material-fab:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.3);
}

.material-fab-icon {
  width: 24px;
  height: 24px;
  fill: white;
}

.material-button {
  background: #FF5722;
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.material-button:hover {
  background: #E64A19;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.material-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 2rem;
  padding: 4rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.material-card {
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: all 0.3s ease;
}

.material-card:hover {
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.material-card-media {
  height: 200px;
  background: linear-gradient(45deg, #2196F3, #21CBF3);
}

.material-card-media-2 {
  background: linear-gradient(45deg, #4CAF50, #8BC34A);
}

.material-card-media-3 {
  background: linear-gradient(45deg, #FF9800, #FFC107);
}

.material-card-content {
  padding: 1.5rem;
}

.material-card h3 {
  font-size: 1.5rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: rgba(0, 0, 0, 0.87);
}

.material-card p {
  color: rgba(0, 0, 0, 0.6);
  margin-bottom: 1rem;
  line-height: 1.6;
}

.material-card-actions {
  display: flex;
  gap: 0.5rem;
}

.material-text-button {
  background: none;
  border: none;
  color: #2196F3;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: background 0.2s ease;
}

.material-text-button:hover {
  background: rgba(33, 150, 243, 0.1);
}

.material-footer {
  background: #424242;
  color: white;
  padding: 2rem;
  text-align: center;
  margin-top: 4rem;
}

.material-footer-content {
  max-width: 1200px;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .material-menu {
    display: none;
  }
  
  .material-hero h1 {
    font-size: 2.5rem;
  }
  
  .material-fab {
    right: 1rem;
  }
}`
    },
    
    flat: {
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flat Design Redesign</title>
</head>
<body>
  <div class="flat-container">
    <header class="flat-header">
      <nav class="flat-nav">
        <div class="flat-logo">FlatApp</div>
        <div class="flat-menu">
          <a href="#" class="flat-link">Home</a>
          <a href="#" class="flat-link">Services</a>
          <a href="#" class="flat-link">Portfolio</a>
          <a href="#" class="flat-link">Contact</a>
        </div>
      </nav>
    </header>
    
    <main class="flat-main">
      <section class="flat-hero">
        <div class="flat-hero-content">
          <h1>Flat Design</h1>
          <p>Clean, simple, and focused on usability</p>
          <div class="flat-buttons">
            <button class="flat-button flat-button-primary">Get Started</button>
            <button class="flat-button flat-button-secondary">Learn More</button>
          </div>
        </div>
        <div class="flat-hero-visual">
          <div class="flat-shape flat-shape-1"></div>
          <div class="flat-shape flat-shape-2"></div>
          <div class="flat-shape flat-shape-3"></div>
        </div>
      </section>
      
      <section class="flat-features">
        <div class="flat-feature">
          <div class="flat-icon flat-icon-design"></div>
          <h3>Simple Design</h3>
          <p>Clean interfaces with no unnecessary decorative elements</p>
        </div>
        
        <div class="flat-feature">
          <div class="flat-icon flat-icon-colors"></div>
          <h3>Bold Colors</h3>
          <p>Vibrant color palette that creates visual hierarchy</p>
        </div>
        
        <div class="flat-feature">
          <div class="flat-icon flat-icon-typography"></div>
          <h3>Clear Typography</h3>
          <p>Readable fonts that enhance user experience</p>
        </div>
        
        <div class="flat-feature">
          <div class="flat-icon flat-icon-performance"></div>
          <h3>Fast Loading</h3>
          <p>Optimized design for better performance</p>
        </div>
      </section>
      
      <section class="flat-cta">
        <div class="flat-cta-content">
          <h2>Ready to Go Flat?</h2>
          <p>Join the flat design revolution</p>
          <button class="flat-button flat-button-accent">Start Your Project</button>
        </div>
      </section>
    </main>
    
    <footer class="flat-footer">
      <div class="flat-footer-content">
        <p>© 2024 Flat Design Co.</p>
      </div>
    </footer>
  </div>
</body>
</html>`,
      css: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Lato', -apple-system, sans-serif;
  background: #ecf0f1;
  color: #2c3e50;
  line-height: 1.6;
}

.flat-container {
  min-height: 100vh;
}

.flat-header {
  background: #3498db;
}

.flat-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.flat-logo {
  color: white;
  font-size: 1.8rem;
  font-weight: bold;
}

.flat-menu {
  display: flex;
  gap: 0;
}

.flat-link {
  color: white;
  text-decoration: none;
  padding: 0.75rem 1.5rem;
  transition: background 0.2s ease;
  font-weight: 500;
}

.flat-link:hover {
  background: rgba(255, 255, 255, 0.1);
}

.flat-hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  padding: 4rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
  align-items: center;
}

.flat-hero-content h1 {
  font-size: 3.5rem;
  font-weight: 300;
  color: #2c3e50;
  margin-bottom: 1rem;
}

.flat-hero-content p {
  font-size: 1.3rem;
  color: #7f8c8d;
  margin-bottom: 2rem;
}

.flat-buttons {
  display: flex;
  gap: 1rem;
}

.flat-button {
  padding: 1rem 2rem;
  border: none;
  border-radius: 0;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.flat-button-primary {
  background: #e74c3c;
  color: white;
}

.flat-button-primary:hover {
  background: #c0392b;
}

.flat-button-secondary {
  background: #95a5a6;
  color: white;
}

.flat-button-secondary:hover {
  background: #7f8c8d;
}

.flat-button-accent {
  background: #f39c12;
  color: white;
}

.flat-button-accent:hover {
  background: #e67e22;
}

.flat-hero-visual {
  position: relative;
  height: 300px;
}

.flat-shape {
  position: absolute;
  border-radius: 0;
}

.flat-shape-1 {
  width: 120px;
  height: 120px;
  background: #e74c3c;
  top: 0;
  left: 0;
}

.flat-shape-2 {
  width: 80px;
  height: 80px;
  background: #f39c12;
  top: 50px;
  right: 80px;
}

.flat-shape-3 {
  width: 100px;
  height: 100px;
  background: #27ae60;
  bottom: 0;
  right: 0;
}

.flat-features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 3rem;
  padding: 4rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.flat-feature {
  text-align: center;
  background: white;
  padding: 2.5rem 2rem;
}

.flat-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 1.5rem;
}

.flat-icon-design {
  background: #9b59b6;
}

.flat-icon-colors {
  background: #e74c3c;
}

.flat-icon-typography {
  background: #3498db;
}

.flat-icon-performance {
  background: #27ae60;
}

.flat-feature h3 {
  font-size: 1.5rem;
  color: #2c3e50;
  margin-bottom: 1rem;
  font-weight: 600;
}

.flat-feature p {
  color: #7f8c8d;
  line-height: 1.7;
}

.flat-cta {
  background: #34495e;
  padding: 4rem 2rem;
  text-align: center;
  color: white;
}

.flat-cta-content {
  max-width: 600px;
  margin: 0 auto;
}

.flat-cta h2 {
  font-size: 2.5rem;
  font-weight: 300;
  margin-bottom: 1rem;
}

.flat-cta p {
  font-size: 1.2rem;
  margin-bottom: 2rem;
  opacity: 0.9;
}

.flat-footer {
  background: #2c3e50;
  color: white;
  padding: 2rem;
  text-align: center;
}

.flat-footer-content {
  max-width: 1200px;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .flat-hero {
    grid-template-columns: 1fr;
    text-align: center;
  }
  
  .flat-hero-content h1 {
    font-size: 2.5rem;
  }
  
  .flat-buttons {
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .flat-menu {
    display: none;
  }
}`
    }
  };

  // Get the style-specific template or fall back to a generic one
  const template = styleTemplates[designStyle as keyof typeof styleTemplates] || {
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${designStyle} Redesign</title>
</head>
<body>
  <header>
    <nav>
      <div class="logo">Logo</div>
      <ul>
        <li><a href="#">Home</a></li>
        <li><a href="#">About</a></li>
        <li><a href="#">Services</a></li>
        <li><a href="#">Contact</a></li>
      </ul>
    </nav>
  </header>
  <main>
    <section class="hero">
      <h1>Redesigned with ${designStyle} Style</h1>
      <p>This website has been completely redesigned using ${designStyle} principles</p>
      <button>Explore</button>
    </section>
  </main>
  <footer>
    <p>&copy; 2024 ${designStyle} Design</p>
  </footer>
</body>
</html>`,
    css: `body { font-family: ${websiteData.fonts[0] || 'Arial'}, sans-serif; margin: 0; padding: 0; }`
  };

  return {
    html: template.html,
    css: template.css,
    preview: `This ${designStyle} redesign completely transforms the original website with ${designStyle}-specific design principles:

${designStyle === 'minimalist' ? 
  '- Clean, spacious layout with plenty of whitespace\n- Minimal color palette focused on typography\n- Simple navigation and clear content hierarchy\n- No unnecessary visual elements or decorations' :
designStyle === 'brutalist' ? 
  '- Bold, high-contrast design with raw aesthetic\n- Monospaced typography and geometric shapes\n- Thick borders and anti-beauty design principles\n- Strong visual impact with primary colors' :
designStyle === 'glassmorphism' ? 
  '- Transparent glass-like elements with blur effects\n- Layered depth with soft shadows\n- Modern gradient backgrounds\n- Elegant, sophisticated appearance' :
designStyle === 'neumorphism' ? 
  '- Soft shadows creating embossed/pressed effects\n- Monochromatic color scheme with subtle variations\n- Rounded corners and tactile appearance\n- Low contrast, gentle visual hierarchy' :
designStyle === 'material' ? 
  '- Card-based layout with elevation shadows\n- Bold, vibrant Material Design colors\n- Grid system with consistent spacing\n- Modern interactive elements' :
  '- Flat design with no shadows or gradients\n- Bold, solid colors and simple shapes\n- Clean typography and minimal visual hierarchy\n- 2D aesthetic with sharp, defined edges'
}

The redesign maintains the original content structure while completely transforming the visual presentation to embody ${designStyle} design philosophy. Every element has been carefully crafted to create a cohesive ${designStyle} experience.`
  };
}

function createRedesignPrompt(websiteData: WebsiteData, designStyle: DesignStyle): string {
  const currentYear = new Date().getFullYear();
  
  const styleDescriptions = {
    minimalist: {
      description: 'Ultra-clean, sophisticated design with maximum impact through simplicity. Think Apple, Google, or Stripe.',
      modernTechniques: [
        'Use CSS Grid and Flexbox for perfect layouts',
        'Implement micro-animations with CSS transitions (0.3s ease)',
        'Apply subtle hover effects (transform: translateY(-2px))',
        'Use custom CSS properties (--primary-color) for consistency',
        'Add smooth scrolling behavior',
        'Implement focus-visible for accessibility',
        'Use system fonts stack for performance'
      ],
      colorPalette: 'Monochromatic scheme: #ffffff, #f8f9fa, #e9ecef, #6c757d, #212529, with one vibrant accent #007bff or #28a745',
      typography: 'System font stack: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif. Use 16px base, 1.5 line-height, font weights 400, 500, 600',
      spacing: 'Use 8px grid system: 8px, 16px, 24px, 32px, 48px, 64px, 96px',
      layout: 'Centered max-width containers (1200px), generous whitespace (min 64px sections), single-column focus'
    },
    brutalist: {
      description: 'Bold, rebellious design that breaks conventional rules. Raw power meets digital aesthetics.',
      modernTechniques: [
        'Use CSS transforms for dynamic layouts',
        'Implement bold typography mixing (serif + monospace)',
        'Add glitch effects with CSS animations',
        'Use CSS clip-path for geometric shapes',
        'Implement scroll-triggered animations',
        'Add intentional "broken" layouts that still work',
        'Use high contrast for maximum impact'
      ],
      colorPalette: 'High contrast: #000000, #ffffff, #ff0000, #00ff00, #0000ff, #ffff00, #ff00ff',
      typography: 'Mix of monospace (Courier New, Monaco) and bold sans-serif. Use aggressive font weights: 700, 900',
      spacing: 'Irregular spacing, overlapping elements, asymmetrical layouts',
      layout: 'Grid-based chaos, overlapping sections, bold geometric shapes'
    },
    glassmorphism: {
      description: 'Ethereal, floating design with depth and transparency. Modern sophistication meets visual innovation.',
      modernTechniques: [
        'backdrop-filter: blur(20px) saturation(180%)',
        'Use CSS custom properties for glass effects',
        'Implement layered z-index hierarchy',
        'Add subtle animations with will-change property',
        'Use CSS masks for complex shapes',
        'Implement progressive blur effects',
        'Add hover state transformations'
      ],
      colorPalette: 'Gradients and transparency: rgba(255,255,255,0.1), linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      typography: 'Light, airy fonts: Inter, SF Pro Display, with font-weight 300-600',
      spacing: 'Floating elements with generous padding (32px+), overlapping cards',
      layout: 'Layered cards, floating navigation, depth through transparency'
    },
    neumorphism: {
      description: 'Soft, tactile design that feels touchable. Digital interfaces that mimic physical materials.',
      modernTechniques: [
        'Multiple box-shadows for depth (inset and outset)',
        'Use CSS custom properties for consistent shadows',
        'Implement hover state micro-interactions',
        'Add subtle gradient backgrounds',
        'Use border-radius consistently (12px-24px)',
        'Implement pressed states for buttons',
        'Add ambient lighting effects'
      ],
      colorPalette: 'Soft neutrals: #e0e5ec, #f0f2f5, #d1d9e6, #bec8d1, with subtle colored accents',
      typography: 'Soft, rounded fonts: Poppins, Nunito, with medium weights 400-600',
      spacing: 'Consistent padding (24px), soft margins, flowing layouts',
      layout: 'Soft cards, gentle curves, tactile button styles'
    },
    material: {
      description: 'Google Material Design 3.0 principles. Bold, intentional, and delightfully interactive.',
      modernTechniques: [
        'Use Material Design elevation system (0-24dp)',
        'Implement ripple effects with CSS animations',
        'Add floating action buttons with proper shadows',
        'Use Material Design color system',
        'Implement proper motion curves (cubic-bezier)',
        'Add state layers for interactions',
        'Use shaped containers and dynamic colors'
      ],
      colorPalette: 'Material You colors: #6750a4 (primary), #e8def8 (surface), #1d1b20 (on-surface), with dynamic theming',
      typography: 'Roboto or system fonts, Material type scale: 12sp, 14sp, 16sp, 22sp, 28sp',
      spacing: 'Material Design 8dp grid system: 8dp, 16dp, 24dp, 32dp, 40dp',
      layout: 'Card-based, FAB positioning, app bar structure, systematic elevation'
    },
    flat: {
      description: 'Clean, direct design with bold colors and sharp edges. Maximum clarity and usability.',
      modernTechniques: [
        'Use bold, saturated colors effectively',
        'Implement clean button states without shadows',
        'Add subtle hover animations (scale, color changes)',
        'Use CSS Grid for precise layouts',
        'Implement icon fonts or SVG icons',
        'Add clean form styling',
        'Use geometric patterns and shapes'
      ],
      colorPalette: 'Bright, saturated: #3498db, #e74c3c, #2ecc71, #f39c12, #9b59b6, #34495e, #ecf0f1',
      typography: 'Clean sans-serif: Open Sans, Helvetica Neue, weights 400, 600, 700',
      spacing: 'Consistent grid (16px base), clean margins, precise alignment',
      layout: 'Sharp edges, grid-based, clear sections, bold contrast'
    }
  };

  const selectedStyle = styleDescriptions[designStyle];

  return `
You are an EXPERT UI/UX designer and frontend developer specializing in creating stunning, modern websites. Your task is to COMPLETELY REDESIGN this website using cutting-edge ${designStyle} design principles and the latest web technologies.

**ORIGINAL WEBSITE ANALYSIS:**
URL: ${websiteData.url}
Current Colors: ${websiteData.colors.join(', ')}
Current Fonts: ${websiteData.fonts.join(', ')}
Layout Structure: ${JSON.stringify(websiteData.layout)}
Key Elements: ${JSON.stringify(websiteData.elements)}
Content Structure: ${JSON.stringify(websiteData.contentStructure || 'Not provided')}

**TARGET DESIGN STYLE: ${designStyle.toUpperCase()} (${currentYear})**
${selectedStyle.description}

**ADVANCED CSS TECHNIQUES TO IMPLEMENT:**
${selectedStyle.modernTechniques.map(technique => `• ${technique}`).join('\n')}

**COLOR PALETTE SPECIFICATIONS:**
${selectedStyle.colorPalette}

**TYPOGRAPHY SYSTEM:**
${selectedStyle.typography}

**SPACING & LAYOUT SYSTEM:**
${selectedStyle.spacing}
${selectedStyle.layout}

**CRITICAL DESIGN REQUIREMENTS:**

1. **VISUAL TRANSFORMATION** (Must achieve 100% visual difference from original):
   - Completely redesign the visual hierarchy
   - Transform all UI elements (buttons, forms, navigation, cards)
   - Apply ${designStyle}-specific styling to every element
   - Create a cohesive design system throughout

2. **MODERN WEB STANDARDS** (${currentYear} best practices):
   - Use CSS Grid and Flexbox for layouts
   - Implement CSS custom properties (variables)
   - Add smooth transitions and micro-animations
   - Ensure responsive design (mobile-first approach)
   - Use semantic HTML5 elements
   - Implement proper accessibility (ARIA labels, focus management)

3. **RESPONSIVE DESIGN** (Mobile-first, Progressive Enhancement):
   - Mobile: 375px+ (stack elements, larger touch targets)
   - Tablet: 768px+ (adjust layouts, optimize spacing)
   - Desktop: 1024px+ (full layout, hover effects)
   - Large: 1440px+ (max-width containers, preserve readability)

4. **PERFORMANCE OPTIMIZATION**:
   - Minimize CSS complexity while maintaining visual richness
   - Use efficient selectors and avoid deep nesting
   - Implement critical CSS patterns
   - Optimize for fast rendering
   - NEVER use external URLs for images, fonts, or resources
   - Use only CSS gradients, colors, and shapes for visual elements
   - Avoid placeholder.com, unsplash.com, or any external image URLs

5. **INTERACTION DESIGN**:
   - Add hover states for all interactive elements
   - Implement focus states for accessibility
   - Include loading states and feedback
   - Add smooth page transitions

**SPECIFIC ${designStyle.toUpperCase()} IMPLEMENTATION GUIDE:**

NAVIGATION:
- Redesign the navigation to perfectly embody ${designStyle} principles
- Apply appropriate styling: colors, typography, spacing, effects
- Include mobile-responsive menu with ${designStyle}-appropriate animations

HERO SECTION:
- Create an impactful hero that showcases ${designStyle} design
- Use appropriate visual hierarchy and call-to-action styling
- Implement background treatments specific to ${designStyle}

CONTENT SECTIONS:
- Redesign all content blocks with ${designStyle} styling
- Apply consistent spacing and typography system
- Add appropriate visual elements (cards, dividers, etc.)

FORMS & INPUTS:
- Style form elements according to ${designStyle} principles
- Add proper validation states and feedback
- Implement accessible form design

BUTTONS & ACTIONS:
- Design primary, secondary, and tertiary button styles
- Add appropriate hover, focus, and active states
- Implement ${designStyle}-specific interaction patterns

FOOTER:
- Create a comprehensive footer with ${designStyle} styling
- Include social links, navigation, and contact information

**OUTPUT FORMAT:**
Return a properly formatted JSON object with these exact keys:

{
  "html": "<!DOCTYPE html><html lang='en'>...</html> - Complete, semantic HTML5 document with all content restructured and organized. Include meta tags, structured data, and accessibility features.",
  
  "css": "Complete CSS stylesheet with: 1) CSS Reset/Normalize, 2) CSS Custom Properties, 3) Base styles, 4) Layout components, 5) UI components, 6) Utilities, 7) Responsive breakpoints, 8) Animations. Must be production-ready and follow ${designStyle} principles completely.",
  
  "preview": "Detailed description of the visual transformation, highlighting key ${designStyle} features, color choices, typography decisions, and overall user experience improvements. Explain how this design elevates the original content."
}

**FINAL REQUIREMENTS:**
- The result must look like a completely different, professional website
- Every element must follow ${designStyle} design principles religiously  
- The design should be so good it could win design awards
- Ensure it's accessible, responsive, and performant
- Make it look like it was designed by a top-tier design agency in ${currentYear}

CREATE SOMETHING ABSOLUTELY STUNNING THAT PERFECTLY EMBODIES ${designStyle.toUpperCase()} DESIGN!
`;
} 