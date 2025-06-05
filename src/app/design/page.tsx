'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useWebsite } from '../../context/WebsiteContext';
import { DesignStyle } from '../../types';

const designStyles: { id: DesignStyle; name: string; description: string; preview?: string }[] = [
  {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Clean design with minimal elements, lots of whitespace, and focus on essential content.',
    preview: '✨'
  },
  {
    id: 'brutalist',
    name: 'Brutalist',
    description: 'Raw, bold design with high contrast, monospaced fonts, and visible borders/elements.',
    preview: '⚡'
  },
  {
    id: 'glassmorphism',
    name: 'Glassmorphism',
    description: 'Frosted glass effect with transparency, blur effects, and subtle borders.',
    preview: '🔮'
  },
  {
    id: 'neumorphism',
    name: 'Neumorphism',
    description: 'Soft UI with subtle shadows creating a pressed/extruded effect on elements.',
    preview: '🎯'
  },
  {
    id: 'material',
    name: 'Material Design',
    description: 'Material Design principles with cards, shadows, and bold colors.',
    preview: '🎨'
  },
  {
    id: 'flat',
    name: 'Flat Design',
    description: 'Flat design with no shadows, simple colors, and 2D illustrations.',
    preview: '📐'
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
  
  const handleBackToAnalyze = () => {
    router.push('/analyze');
  };
  
  if (authLoading || !websiteData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => router.push('/analyze')}>
              <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">VervApp</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user?.email}</span>
              <button
                onClick={() => signOut()}
                className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Design Style
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Select a design style for your website redesign. Each style offers a unique aesthetic approach.
          </p>
        </div>
        
        {/* Website Analysis Results */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Analysis Results</h2>
            <button
              onClick={handleBackToAnalyze}
              className="flex items-center text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
            >
              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Analyze
            </button>
          </div>
          
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-gray-700 font-medium">
              <span className="text-gray-500">URL:</span> {websiteData.url}
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <div className="h-8 w-8 bg-purple-500 rounded-lg flex items-center justify-center mr-3">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                  </svg>
                </div>
                Colors
              </h3>
              <div className="flex flex-wrap gap-3">
                {websiteData.colors.map((color, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <div 
                      className="w-12 h-12 rounded-xl border-2 border-white shadow-lg" 
                      style={{ backgroundColor: color }}
                      title={color}
                    ></div>
                    <span className="text-xs text-gray-600 mt-1 font-mono">{color}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <div className="h-8 w-8 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                Typography
              </h3>
              <div className="space-y-2">
                {websiteData.fonts.map((font, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 shadow-sm">
                    <span className="text-sm font-medium text-gray-900">
                      {typeof font === 'string' 
                        ? font 
                        : (font as { name: string; purpose?: string }).name + 
                          ((font as { name: string; purpose?: string }).purpose ? 
                            ' (' + (font as { name: string; purpose?: string }).purpose + ')' : '')
                      }
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <div className="h-8 w-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                Layout
              </h3>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-sm text-gray-700">
                  {typeof websiteData.layout === 'string' 
                    ? websiteData.layout 
                    : typeof websiteData.layout === 'object' && websiteData.layout !== null
                      ? (
                          <div className="space-y-2">
                            {Object.entries(websiteData.layout as Record<string, any>).map(([key, value]) => (
                              <div key={key} className="border-l-2 border-blue-300 pl-3">
                                <span className="font-medium capitalize text-gray-900">{key}:</span>{' '}
                                <span className="text-gray-600">{typeof value === 'string' ? value : JSON.stringify(value)}</span>
                              </div>
                            ))}
                          </div>
                        )
                      : 'No layout information available'
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Design Style Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {designStyles.map((style) => (
            <div
              key={style.id}
              className="bg-white rounded-2xl border border-gray-200 p-8 cursor-pointer hover:border-blue-500 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group"
              onClick={() => handleSelectStyle(style.id)}
            >
              <div className="text-center mb-6">
                <div className="text-4xl mb-4">{style.preview}</div>
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                  {style.name}
                </h3>
              </div>
              <p className="text-gray-600 text-center leading-relaxed">
                {style.description}
              </p>
              <div className="mt-6 flex justify-center">
                <div className="bg-gray-100 group-hover:bg-blue-100 text-gray-600 group-hover:text-blue-600 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200">
                  Select Style
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* CTA Section */}
        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-3xl p-8 text-white">
            <h2 className="text-2xl font-bold mb-4">
              Ready to See Your Redesign?
            </h2>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              Choose a design style above to generate your website&apos;s new look with AI-powered design suggestions.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {designStyles.slice(0, 3).map((style) => (
                <button
                  key={style.id}
                  onClick={() => handleSelectStyle(style.id)}
                  className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 backdrop-blur-sm"
                >
                  Try {style.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 