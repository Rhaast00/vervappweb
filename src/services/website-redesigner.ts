import { DesignStyle, RedesignRequest, WebsiteData } from '../types';
import { openai } from '../lib/openai-client';

export async function redesignWebsite(request: RedesignRequest): Promise<{
  html: string;
  css: string;
  preview: string;
}> {
  try {
    const { websiteData, designStyle } = request;
    
    // Create a prompt for the AI to generate a redesign
    const prompt = createRedesignPrompt(websiteData, designStyle);
    
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
    
    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      html: result.html || '<div>Error generating HTML</div>',
      css: result.css || 'body { font-family: sans-serif; }',
      preview: result.preview || 'No preview available'
    };
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