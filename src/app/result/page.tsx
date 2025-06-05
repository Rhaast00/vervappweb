'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useWebsite } from '../../context/WebsiteContext';
import { redesignWebsite } from '../../services/website-redesigner';

interface HistoryItem {
  id: string;
  url: string;
  style: string;
  model: string;
  timestamp: Date;
  html: string;
  css: string;
  preview: string;
}

export default function Result() {
  const router = useRouter();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { 
    websiteData, 
    selectedDesignStyle,
    selectedModel,
    redesignResult,
    setRedesignResult,
    isRedesigning,
    setIsRedesigning
  } = useWebsite();
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'html' | 'css'>('preview');
  const [isLoading, setIsLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Load history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('redesign-history');
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory);
        setHistory(parsedHistory.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        })));
      } catch (error) {
        console.error('Error loading history:', error);
      }
    }
  }, []);
  
  // Save to history when a new redesign is completed
  const saveToHistory = (result: any) => {
    if (!websiteData || !selectedDesignStyle || !selectedModel) return;
    
    const historyItem: HistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url: websiteData.url,
      style: selectedDesignStyle,
      model: selectedModel,
      timestamp: new Date(),
      html: result.html,
      css: result.css,
      preview: result.preview
    };
    
    const updatedHistory = [historyItem, ...history.slice(0, 9)]; // Keep only last 10 items
    setHistory(updatedHistory);
    localStorage.setItem('redesign-history', JSON.stringify(updatedHistory));
  };
  
  // Load a design from history
  const loadFromHistory = (item: HistoryItem) => {
    setRedesignResult({
      html: item.html,
      css: item.css,
      preview: item.preview
    });
    setShowHistory(false);
  };
  
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
  
  // Reset hasGenerated when design style or model changes
  useEffect(() => {
    setHasGenerated(false);
    setRedesignResult(null);
    setError(null);
  }, [selectedDesignStyle, selectedModel, setRedesignResult]);
  
  // Generate redesign when component mounts or when style/model changes
  useEffect(() => {
    const generateRedesign = async () => {
      // Don't generate if we already have a result or already generated once
      if (hasGenerated || redesignResult || !websiteData || !selectedDesignStyle || !selectedModel) {
        return;
      }

      try {
        setIsLoading(true);
        setIsRedesigning(true);
        setError(null);
        setHasGenerated(true); // Prevent future generations
        
        // Parse selectedModel format (provider:specificModel)
        const [modelProvider, specificModel] = selectedModel.includes(':') 
          ? selectedModel.split(':') 
          : [selectedModel, undefined];
        
        console.log('Generating redesign with model: ' + modelProvider + (specificModel ? ' (' + specificModel + ')' : '') + ' and style: ' + selectedDesignStyle);
        
        const result = await redesignWebsite(
          {
            websiteData,
            designStyle: selectedDesignStyle
          }, 
          modelProvider,
          specificModel
        );
        
        setRedesignResult(result);
        saveToHistory(result); // Save to history
      } catch (err) {
        console.error('Error generating redesign:', err);
        setError(err instanceof Error ? err.message : 'Failed to generate redesign');
        setHasGenerated(false); // Allow retry on error
      } finally {
        setIsLoading(false);
        setIsRedesigning(false);
      }
    };
    
    generateRedesign();
  }, [selectedDesignStyle, selectedModel]);
  
  // Manual regenerate function
  const regenerateDesign = async () => {
    if (!websiteData || !selectedDesignStyle || !selectedModel) return;
    
    try {
      setIsLoading(true);
      setIsRedesigning(true);
      setError(null);
      
      const [modelProvider, specificModel] = selectedModel.includes(':') 
        ? selectedModel.split(':') 
        : [selectedModel, undefined];
      
      console.log('Regenerating redesign with model: ' + modelProvider + (specificModel ? ' (' + specificModel + ')' : '') + ' and style: ' + selectedDesignStyle);
      
      const result = await redesignWebsite(
        {
          websiteData,
          designStyle: selectedDesignStyle
        }, 
        modelProvider,
        specificModel
      );
      
      setRedesignResult(result);
      saveToHistory(result);
    } catch (err) {
      console.error('Error regenerating redesign:', err);
      setError(err instanceof Error ? err.message : 'Failed to regenerate redesign');
    } finally {
      setIsLoading(false);
      setIsRedesigning(false);
    }
  };
  
  // Dosya indirme fonksiyonları
  const downloadHTML = () => {
    if (!redesignResult) return;
    
    const element = document.createElement('a');
    const file = new Blob([redesignResult.html], {type: 'text/html'});
    element.href = URL.createObjectURL(file);
    element.download = `${websiteData?.url.replace(/[^a-zA-Z0-9]/g, '-')}-${selectedDesignStyle}-redesign.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  const downloadCSS = () => {
    if (!redesignResult) return;
    
    const element = document.createElement('a');
    const file = new Blob([redesignResult.css], {type: 'text/css'});
    element.href = URL.createObjectURL(file);
    element.download = `${websiteData?.url.replace(/[^a-zA-Z0-9]/g, '-')}-${selectedDesignStyle}-style.css`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  const downloadFullPackage = () => {
    if (!redesignResult) return;
    
    // HTML dosyasını CSS ile entegre ederek indir
    const fullHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${websiteData?.url} - ${selectedDesignStyle} Redesign</title>
  <style>
${redesignResult.css}
  </style>
</head>
<body>
${redesignResult.html}
</body>
</html>
    `;
    
    const element = document.createElement('a');
    const file = new Blob([fullHTML], {type: 'text/html'});
    element.href = URL.createObjectURL(file);
    element.download = `${websiteData?.url.replace(/[^a-zA-Z0-9]/g, '-')}-${selectedDesignStyle}-complete.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  const getModelDisplayName = () => {
    switch (selectedModel) {
      case 'openai':
        return 'OpenAI GPT-4';
      case 'anthropic':
        return 'Anthropic Claude';
      case 'google':
        return 'Google Gemini';
      default:
        return 'AI Model';
    }
  };
  
  if (authLoading || !websiteData || !selectedDesignStyle) {
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
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center text-purple-600 hover:text-purple-700 font-medium transition-colors duration-200"
              >
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                History ({history.length})
              </button>
              <button
                onClick={() => router.push('/design')}
                className="flex items-center text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
              >
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Styles
              </button>
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
      
      {/* History Panel */}
      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden mx-4">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Design History</h2>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors duration-200"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-blue-100 mt-2">View and reload your previous website designs</p>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {history.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="h-16 w-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No design history yet</h3>
                  <p className="text-gray-600">Your generated designs will appear here for easy access.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-all duration-200 cursor-pointer border border-gray-200"
                      onClick={() => loadFromHistory(item)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1 truncate">
                            {item.url}
                          </h3>
                          <p className="text-sm text-gray-600 capitalize">
                            {item.style} Style • {item.model}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="flex-shrink-0 ml-4">
                          <div className="w-16 h-12 bg-white rounded border border-gray-300 overflow-hidden">
                            <iframe
                              srcDoc={`<style>${item.css}</style>${item.html}`}
                              className="w-full h-full transform scale-25 origin-top-left"
                              style={{ width: '400%', height: '400%' }}
                              title="Design Preview"
                              sandbox="allow-same-origin"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            loadFromHistory(item);
                          }}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                        >
                          Load Design
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newHistory = history.filter(h => h.id !== item.id);
                            setHistory(newHistory);
                            localStorage.setItem('redesign-history', JSON.stringify(newHistory));
                          }}
                          className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors duration-200"
                          title="Delete this design"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Your Redesigned Website
          </h1>
          <div className="flex items-center justify-center space-x-2 text-lg text-gray-600">
            <span>Powered by</span>
            <span className="font-semibold text-blue-600">{getModelDisplayName()}</span>
            <span>•</span>
            <span className="font-semibold text-indigo-600 capitalize">{selectedDesignStyle} Style</span>
          </div>
        </div>
        
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
          {/* Header with tabs and download buttons */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-8 py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Redesign Complete</h2>
                  <p className="text-sm text-gray-600">
                    Generated from: {websiteData.url}
                  </p>
                </div>
              </div>
              
              {redesignResult && (
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                  <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <button
                      className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
                        activeTab === 'preview' 
                          ? 'bg-blue-500 text-white shadow-sm' 
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => setActiveTab('preview')}
                    >
                      <svg className="h-4 w-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Preview
                    </button>
                    <button
                      className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
                        activeTab === 'html' 
                          ? 'bg-blue-500 text-white shadow-sm' 
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => setActiveTab('html')}
                    >
                      <svg className="h-4 w-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      HTML
                    </button>
                    <button
                      className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
                        activeTab === 'css' 
                          ? 'bg-blue-500 text-white shadow-sm' 
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => setActiveTab('css')}
                    >
                      <svg className="h-4 w-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                      </svg>
                      CSS
                    </button>
                  </div>
                  
                  <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <button
                      onClick={downloadHTML}
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                      title="Download HTML"
                    >
                      <svg className="h-4 w-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      HTML
                    </button>
                    <button
                      onClick={downloadCSS}
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                      title="Download CSS"
                    >
                      <svg className="h-4 w-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      CSS
                    </button>
                    <button
                      onClick={downloadFullPackage}
                      className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 transition-all duration-200"
                      title="Download Complete Package"
                    >
                      <svg className="h-4 w-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      </svg>
                      Package
                    </button>
                  </div>
                  
                  <button
                    onClick={regenerateDesign}
                    disabled={isRedesigning}
                    className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl text-sm font-medium hover:from-purple-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    title="Generate new design"
                  >
                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {(isRedesigning || isLoading) ? 'Site Oluşturuluyor...' : 'Yeniden Oluştur'}
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="p-8">
            {(isRedesigning || isLoading) && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="relative">
                  <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-200"></div>
                  <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-500 border-t-transparent absolute top-0"></div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mt-6 mb-2">🚀 Site Oluşturuluyor</h3>
                <p className="text-gray-600 text-center max-w-md mb-4">
                  AI teknolojisi ile {selectedDesignStyle} stilinde yeni web siteniz oluşturuluyor. 
                  Bu işlem birkaç dakika sürebilir, lütfen bekleyiniz.
                </p>
                <div className="bg-gray-100 rounded-full p-3 mb-4">
                  <div className="text-sm text-gray-700 font-medium">
                    ✨ Tasarım analiz ediliyor
                  </div>
                  <div className="text-sm text-gray-700 font-medium mt-1">
                    🎨 {selectedDesignStyle} stili uygulanıyor
                  </div>
                  <div className="text-sm text-gray-700 font-medium mt-1">
                    🔧 HTML ve CSS kodu üretiliyor
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-3 w-3 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="h-3 w-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="h-3 w-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-start">
                <svg className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="font-medium mb-1">Redesign Error</h4>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}
            
            {redesignResult && !isLoading && !isRedesigning && (
              <div className="space-y-6">
                {activeTab === 'preview' && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                    <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="h-3 w-3 bg-red-400 rounded-full"></div>
                        <div className="h-3 w-3 bg-yellow-400 rounded-full"></div>
                        <div className="h-3 w-3 bg-green-400 rounded-full"></div>
                      </div>
                      <div className="flex-1 text-center text-sm text-gray-600 font-medium">
                        {websiteData.url} - {selectedDesignStyle} Preview
                      </div>
                    </div>
                    <div className="h-96 lg:h-[600px] overflow-auto">
                      <iframe
                        srcDoc={`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <style>
    /* Reset potential conflicts */
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
    img { max-width: 100%; height: auto; }
    
    /* Custom styles */
    ${redesignResult.css}
  </style>
</head>
<body>
  ${redesignResult.html}
</body>
</html>`}
                        className="w-full h-full"
                        title="Website Preview"
                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                      />
                    </div>
                  </div>
                )}
                
                {activeTab === 'html' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">HTML Code</h3>
                      <button
                        onClick={downloadHTML}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
                      >
                        <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download HTML
                      </button>
                    </div>
                    <div className="bg-gray-900 rounded-xl p-6 overflow-x-auto">
                      <pre className="text-green-400 text-sm">
                        <code>{redesignResult.html}</code>
                      </pre>
                    </div>
                  </div>
                )}
                
                {activeTab === 'css' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">CSS Code</h3>
                      <button
                        onClick={downloadCSS}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
                      >
                        <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download CSS
                      </button>
                    </div>
                    <div className="bg-gray-900 rounded-xl p-6 overflow-x-auto">
                      <pre className="text-blue-400 text-sm">
                        <code>{redesignResult.css}</code>
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Next Steps Section */}
        {redesignResult && (
          <div className="mt-16 text-center">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-3xl p-8 text-white">
              <h2 className="text-2xl font-bold mb-4">
                🎉 Your Website Redesign is Ready!
              </h2>
              <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
                Download your files and implement the new design, or try a different style for more options.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={downloadFullPackage}
                  className="bg-white text-blue-600 px-8 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  Download Complete Package
                </button>
                <button
                  onClick={() => router.push('/design')}
                  className="bg-white/20 hover:bg-white/30 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 backdrop-blur-sm"
                >
                  Try Different Style
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 