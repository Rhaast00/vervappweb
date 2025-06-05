'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useWebsite } from '../../context/WebsiteContext';
import { redesignWebsite } from '../../services/website-redesigner';

export default function Result() {
  const router = useRouter();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { 
    websiteData, 
    selectedDesignStyle,
    redesignResult,
    setRedesignResult,
    isRedesigning,
    setIsRedesigning
  } = useWebsite();
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'html' | 'css'>('preview');
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);
  
  // Redirect if no website data or design style
  useEffect(() => {
    if (!authLoading && (!websiteData || !selectedDesignStyle)) {
      router.push('/analyze');
    }
  }, [authLoading, websiteData, selectedDesignStyle, router]);
  
  // Generate redesign if not already done
  useEffect(() => {
    const generateRedesign = async () => {
      if (websiteData && selectedDesignStyle && !redesignResult && !isRedesigning) {
        try {
          setError(null);
          setIsRedesigning(true);
          
          const result = await redesignWebsite({
            websiteData,
            designStyle: selectedDesignStyle
          });
          
          setRedesignResult(result);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'An error occurred while redesigning the website.');
        } finally {
          setIsRedesigning(false);
        }
      }
    };
    
    generateRedesign();
  }, [websiteData, selectedDesignStyle, redesignResult, isRedesigning, setRedesignResult, setIsRedesigning]);
  
  if (authLoading || !websiteData || !selectedDesignStyle) {
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
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/design')}
              className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              Back to Styles
            </button>
            <button
              onClick={() => signOut()}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white shadow rounded-lg p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Your Redesigned Website</h2>
              
              {redesignResult && (
                <div className="flex border rounded overflow-hidden">
                  <button
                    className={`px-4 py-2 text-sm font-medium ${activeTab === 'preview' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}
                    onClick={() => setActiveTab('preview')}
                  >
                    Preview
                  </button>
                  <button
                    className={`px-4 py-2 text-sm font-medium ${activeTab === 'html' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}
                    onClick={() => setActiveTab('html')}
                  >
                    HTML
                  </button>
                  <button
                    className={`px-4 py-2 text-sm font-medium ${activeTab === 'css' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}
                    onClick={() => setActiveTab('css')}
                  >
                    CSS
                  </button>
                </div>
              )}
            </div>
            
            {isRedesigning && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-600">Redesigning your website...</p>
                <p className="text-sm text-gray-500 mt-2">This may take a minute or two</p>
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}
            
            {redesignResult && (
              <div>
                {activeTab === 'preview' && (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Preview Description</h3>
                    <p className="text-gray-600 whitespace-pre-line">{redesignResult.preview}</p>
                    
                    <div className="mt-6 border-t pt-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Live Preview</h3>
                      <div className="border rounded-lg overflow-hidden">
                        <iframe
                          srcDoc={`
                            <html>
                              <head>
                                <style>${redesignResult.css}</style>
                              </head>
                              <body>
                                ${redesignResult.html}
                              </body>
                            </html>
                          `}
                          className="w-full h-[600px]"
                          title="Website Preview"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {activeTab === 'html' && (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">HTML Code</h3>
                    <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-auto max-h-[600px] text-sm">
                      <code>{redesignResult.html}</code>
                    </pre>
                  </div>
                )}
                
                {activeTab === 'css' && (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">CSS Code</h3>
                    <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-auto max-h-[600px] text-sm">
                      <code>{redesignResult.css}</code>
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 