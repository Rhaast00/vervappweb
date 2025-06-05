'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useWebsite } from '../../context/WebsiteContext';
import { analyzeWebsite } from '../../services/website-analyzer';
import { getApiKey } from '../../services/api-keys-service';
import { OPENAI_MODELS } from '../../lib/openai-client';
import { ANTHROPIC_MODELS } from '../../lib/anthropic-client';
import { GOOGLE_MODELS } from '../../lib/google-client';

// Desteklenen AI model sağlayıcıları
const AI_PROVIDERS = [
  { id: 'openai', name: 'OpenAI', description: 'Advanced AI models with strong design capabilities' },
  { id: 'anthropic', name: 'Anthropic Claude', description: 'Excellent for detailed design analysis and redesign' },
  { id: 'google', name: 'Google Gemini', description: 'Google\'s advanced AI with visual understanding' },
];

export default function Analyze() {
  const router = useRouter();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { setWebsiteData, isAnalyzing, setIsAnalyzing, setSelectedModel } = useWebsite();
  const [error, setError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>('openai');
  const [selectedSpecificModel, setSelectedSpecificModel] = useState<string>('');
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState<boolean>(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm<{ url: string; aiApiKey?: string }>();
  
  // Get available models for selected provider
  const getAvailableModels = () => {
    switch (selectedProvider) {
      case 'openai':
        return OPENAI_MODELS;
      case 'anthropic':
        return ANTHROPIC_MODELS;
      case 'google':
        return GOOGLE_MODELS;
      default:
        return [];
    }
  };
  
  // Update specific model when provider changes
  useEffect(() => {
    const models = getAvailableModels();
    if (models.length > 0) {
      setSelectedSpecificModel(models[0].id);
    }
  }, [selectedProvider]);
  
  // Redirect if not authenticated (güvenlik kontrolü için)
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);
  
  // Check if the user has the API key for the selected provider
  useEffect(() => {
    const checkApiKey = async () => {
      if (selectedProvider) {
        try {
          const apiKey = await getApiKey(selectedProvider);
          setHasApiKey(!!apiKey);
          setShowApiKeyInput(!apiKey);
        } catch (error) {
          console.error('Error checking API key:', error);
          setHasApiKey(false);
          setShowApiKeyInput(true);
        }
      }
    };
    
    checkApiKey();
  }, [selectedProvider]);
  
  const onSubmit = async (data: { url: string; aiApiKey?: string }) => {
    try {
      // API anahtarı kontrolü
      if (!hasApiKey && !data.aiApiKey) {
        setError(`${selectedProvider === 'openai' ? 'OpenAI' : selectedProvider === 'anthropic' ? 'Anthropic' : 'Google'} API anahtarı gerekli. Lütfen API anahtarını girin veya hesap ayarlarınızdan ekleyin.`);
        return;
      }
      
      setError(null);
      setIsAnalyzing(true);
      
      // Seçilen modeli context'e kaydet (provider:specificModel formatında)
      setSelectedModel(`${selectedProvider}:${selectedSpecificModel}`);
      
      // Eğer yeni API anahtarı girildiyse, önce onu kaydet
      if (!hasApiKey && data.aiApiKey) {
        // API anahtarını kaydet
        try {
          const { saveApiKey } = await import('../../services/api-keys-service');
          await saveApiKey(selectedProvider, data.aiApiKey);
          console.log(`New ${selectedProvider} API key saved`);
        } catch (apiKeyError) {
          console.error('Error saving API key:', apiKeyError);
          setError(`API anahtarı kaydedilemedi: ${apiKeyError instanceof Error ? apiKeyError.message : 'Bilinmeyen hata'}`);
          setIsAnalyzing(false);
          return;
        }
      }
      
      // Seçilen model ile website analizi yap
      const websiteData = await analyzeWebsite(data.url, selectedProvider, selectedSpecificModel);
      setWebsiteData(websiteData);
      
      // Router yönlendirmesini direkt yapmak yerine state değişikliğinden sonra useEffect içinde yapacağız
      setTimeout(() => {
        router.push('/design');
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while analyzing the website.');
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  if (authLoading) {
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
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Analyze Your Website
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Enter your website URL and choose an AI model to get detailed analysis and redesign suggestions
          </p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div>
              <label htmlFor="url" className="block text-sm font-semibold text-gray-900 mb-2">
                Website URL
              </label>
              <div className="relative">
                <input
                  id="url"
                  type="text"
                  placeholder="https://www.example.com"
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  {...register("url", { 
                    required: "Website URL is required",
                    pattern: {
                      value: /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/,
                      message: "Please enter a valid URL"
                    }
                  })}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                  </svg>
                </div>
              </div>
              {errors.url && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {errors.url.message}
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="provider" className="block text-sm font-semibold text-gray-900 mb-2">
                AI Provider
              </label>
              <select
                id="provider"
                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
              >
                {AI_PROVIDERS.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-sm text-gray-600 flex items-center">
                <svg className="h-4 w-4 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {AI_PROVIDERS.find(p => p.id === selectedProvider)?.description}
              </p>
            </div>
            
            <div>
              <label htmlFor="specificModel" className="block text-sm font-semibold text-gray-900 mb-2">
                AI Model for Analysis
              </label>
              <select
                id="specificModel"
                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                value={selectedSpecificModel}
                onChange={(e) => setSelectedSpecificModel(e.target.value)}
              >
                {getAvailableModels().map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-sm text-gray-600 flex items-center">
                <svg className="h-4 w-4 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {getAvailableModels().find(m => m.id === selectedSpecificModel)?.description}
              </p>
            </div>
            
            {showApiKeyInput && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <label htmlFor="aiApiKey" className="block text-sm font-semibold text-gray-900">
                    {selectedProvider === 'openai' ? 'OpenAI' : selectedProvider === 'anthropic' ? 'Anthropic' : 'Google'} API Key
                  </label>
                  <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">Required</span>
                </div>
                <input
                  id="aiApiKey"
                  type="password"
                  placeholder={selectedProvider === 'openai' ? 'sk-...' : selectedProvider === 'anthropic' ? 'sk-ant-...' : 'AIza...'}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  {...register("aiApiKey")}
                />
                <p className="mt-2 text-xs text-gray-600 flex items-center">
                  <svg className="h-4 w-4 mr-1 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Bu API anahtarı yalnızca sizin talepleriniz için güvenli bir şekilde saklanır
                </p>
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-start">
                <svg className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}
            
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={isAnalyzing}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center"
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-3"></div>
                    Analyzing Website...
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Analyze Website
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
        
        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="h-10 w-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mb-4">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Comprehensive Analysis</h3>
            <p className="text-gray-600 text-sm">Deep analysis of design, colors, typography, and layout structure</p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mb-4">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Fast Processing</h3>
            <p className="text-gray-600 text-sm">Get results in under 60 seconds with our optimized AI models</p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="h-10 w-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center mb-4">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Multiple AI Models</h3>
            <p className="text-gray-600 text-sm">Choose from OpenAI, Anthropic, or Google for best results</p>
          </div>
        </div>
      </main>
    </div>
  );
} 