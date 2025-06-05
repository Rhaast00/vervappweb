'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useWebsite } from '../../context/WebsiteContext';
import { DesignStyle } from '../../types';

const designStyles: { id: DesignStyle; name: string; description: string }[] = [
  {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Clean design with minimal elements, lots of whitespace, and focus on essential content.'
  },
  {
    id: 'brutalist',
    name: 'Brutalist',
    description: 'Raw, bold design with high contrast, monospaced fonts, and visible borders/elements.'
  },
  {
    id: 'glassmorphism',
    name: 'Glassmorphism',
    description: 'Frosted glass effect with transparency, blur effects, and subtle borders.'
  },
  {
    id: 'neumorphism',
    name: 'Neumorphism',
    description: 'Soft UI with subtle shadows creating a pressed/extruded effect on elements.'
  },
  {
    id: 'material',
    name: 'Material Design',
    description: 'Material Design principles with cards, shadows, and bold colors.'
  },
  {
    id: 'flat',
    name: 'Flat Design',
    description: 'Flat design with no shadows, simple colors, and 2D illustrations.'
  }
];

export default function Design() {
  const router = useRouter();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { 
    websiteData, 
    setSelectedDesignStyle, 
    selectedDesignStyle 
  } = useWebsite();
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);
  
  // Redirect if no website data
  useEffect(() => {
    if (!authLoading && !websiteData) {
      router.push('/analyze');
    }
  }, [authLoading, websiteData, router]);
  
  const handleSelectStyle = (style: DesignStyle) => {
    setSelectedDesignStyle(style);
    router.push('/result');
  };
  
  if (authLoading || !websiteData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">VervApp</h1>
          <button
            onClick={() => signOut()}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Sign Out
          </button>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white shadow rounded-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Website Analysis Results</h2>
            <p className="text-gray-600 mb-4">URL: {websiteData.url}</p>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <h3 className="font-medium text-gray-900">Colors</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  {websiteData.colors.map((color, index) => (
                    <div 
                      key={index} 
                      className="w-8 h-8 rounded-full border border-gray-200" 
                      style={{ backgroundColor: color }}
                      title={color}
                    ></div>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900">Fonts</h3>
                <ul className="mt-2 text-sm text-gray-600">
                  {websiteData.fonts.map((font, index) => (
                    <li key={index}>{font}</li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900">Layout</h3>
              <p className="mt-2 text-sm text-gray-600">{websiteData.layout}</p>
            </div>
          </div>
          
          <div className="bg-white shadow rounded-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Choose a Design Style</h2>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {designStyles.map((style) => (
                <div
                  key={style.id}
                  className="border rounded-lg p-6 cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all"
                  onClick={() => handleSelectStyle(style.id)}
                >
                  <h3 className="text-lg font-medium text-gray-900">{style.name}</h3>
                  <p className="mt-2 text-sm text-gray-600">{style.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 