'use client';

import { DesignStyle, RedesignRequest, WebsiteData } from '../types';
import { getOpenAIClient, createMockOpenAIResponse } from '../lib/openai-client';
import { saveWebsiteRedesign } from './database-service';
import { v4 as uuidv4 } from 'uuid';

export async function redesignWebsite(request: RedesignRequest): Promise<{
  id?: string;
  html: string;
  css: string;
  preview: string;
}> {
  try {
    const { websiteData, designStyle } = request;
    
    // Create a prompt for the AI to generate a redesign
    const prompt = createRedesignPrompt(websiteData, designStyle);
    
    // OpenAI client'ını al
    const openai = await getOpenAIClient();
    let result;
    
    if (openai) {
      // Generate the redesign using OpenAI
      const response = await openai.chat.completions.create({
        model: "gpt-4",
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
      // API anahtarı yoksa mock data kullan
      console.warn('No OpenAI API key available, using mock data for redesign');
      const mockResponse = createMockOpenAIResponse(prompt);
      // Mock redesign içeriği
      result = {
        html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redesigned Website</title>
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
      <h1>Welcome to the Redesigned Website</h1>
      <p>This is a sample redesign in ${designStyle} style</p>
      <button>Get Started</button>
    </section>
    <section class="features">
      <div class="feature">
        <h2>Feature 1</h2>
        <p>Description of feature 1</p>
      </div>
      <div class="feature">
        <h2>Feature 2</h2>
        <p>Description of feature 2</p>
      </div>
      <div class="feature">
        <h2>Feature 3</h2>
        <p>Description of feature 3</p>
      </div>
    </section>
  </main>
  <footer>
    <p>&copy; 2024 Redesigned Website. All rights reserved.</p>
  </footer>
</body>
</html>`,
        css: `/* ${designStyle} style */
body {
  font-family: ${websiteData.fonts[0] || 'Arial'}, sans-serif;
  margin: 0;
  padding: 0;
  color: ${websiteData.colors[0] || '#333'};
  background-color: ${websiteData.colors[1] || '#fff'};
}

header {
  background-color: ${websiteData.colors[2] || '#f8f8f8'};
  padding: 1rem;
}

nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  font-weight: bold;
  font-size: 1.5rem;
}

ul {
  display: flex;
  list-style: none;
  gap: 1rem;
}

a {
  text-decoration: none;
  color: ${websiteData.colors[0] || '#333'};
}

.hero {
  padding: 4rem 2rem;
  text-align: center;
  background-color: ${websiteData.colors[3] || '#f2f2f2'};
}

button {
  background-color: ${websiteData.colors[2] || '#007bff'};
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.features {
  display: flex;
  justify-content: space-around;
  padding: 2rem;
  gap: 2rem;
}

.feature {
  flex: 1;
  padding: 1rem;
  text-align: center;
}

footer {
  background-color: ${websiteData.colors[0] || '#333'};
  color: white;
  text-align: center;
  padding: 1rem;
}`,
        preview: `This ${designStyle} design features a clean and modern layout with the following elements:
- Sleek navigation bar at the top
- Hero section with headline and call-to-action button
- Three-column feature section
- Simple footer with copyright information
        
The color palette uses colors from the original site, predominantly ${websiteData.colors[0] || 'dark'} and ${websiteData.colors[1] || 'light'} tones, with accents of ${websiteData.colors[2] || 'highlight color'}.

The design follows ${designStyle} principles with ${designStyle === 'minimalist' ? 'clean lines and minimal clutter' : 
  designStyle === 'brutalist' ? 'raw and bold elements' : 
  designStyle === 'glassmorphism' ? 'transparent glass-like elements with blur effects' : 
  designStyle === 'neumorphism' ? 'soft UI with subtle shadows' : 
  designStyle === 'material' ? 'material design cards and shadows' : 
  'flat design elements without shadows'}.`
      };
    }
    
    const redesignResult = {
      html: result.html || '<div>Error generating HTML</div>',
      css: result.css || 'body { font-family: sans-serif; }',
      preview: result.preview || 'No preview available'
    };
    
    // Save to database
    try {
      // Generate a temporary ID since we may not have a real analysis ID from the database
      const tempAnalysisId = uuidv4();
      
      const savedRedesign = await saveWebsiteRedesign(
        tempAnalysisId,
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

function createRedesignPrompt(websiteData: WebsiteData, designStyle: DesignStyle): string {
  const styleDescriptions = {
    minimalist: 'Clean, simple design with minimal elements, lots of whitespace, and focus on essential content.',
    brutalist: 'Raw, bold design with high contrast, monospaced fonts, and visible borders/elements.',
    glassmorphism: 'Frosted glass effect with transparency, blur effects, and subtle borders.',
    neumorphism: 'Soft UI with subtle shadows creating a pressed/extruded effect on elements.',
    material: 'Material Design principles with cards, shadows, and bold colors.',
    flat: 'Flat design with no shadows, simple colors, and 2D illustrations.'
  };

  return `
    Redesign the following website using ${designStyle} style.
    
    Original website information:
    - URL: ${websiteData.url}
    - Colors: ${websiteData.colors.join(', ')}
    - Fonts: ${websiteData.fonts.join(', ')}
    - Layout: ${websiteData.layout}
    - Elements: ${JSON.stringify(websiteData.elements)}
    
    Style description: ${styleDescriptions[designStyle]}
    
    Create a responsive redesign that maintains the original website's purpose but applies the ${designStyle} style principles.
    
    Return a JSON object with:
    1. "html": The HTML code for the redesigned website (include a complete HTML document)
    2. "css": The CSS code for styling (include all necessary styles)
    3. "preview": A text description of how the redesign looks
  `;
} 