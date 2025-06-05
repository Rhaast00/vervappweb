'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase-client';
import { saveUserApiKey } from '../../services/user-service';

export default function Login() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm();
  
  const handleLogin = async (data: any) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      });
      
      if (error) throw error;
      
      // Check if API key is provided and save it
      if (data.openaiApiKey) {
        await saveUserApiKey('openai', data.openaiApiKey);
      }
      
      router.push('/analyze');
    } catch (error: any) {
      setError(error.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSignUp = async (data: any) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/analyze`
        }
      });
      
      if (error) throw error;
      
      // Check if API key is provided and save it
      if (data.openaiApiKey) {
        await saveUserApiKey('openai', data.openaiApiKey);
      }
      
      router.push('/analyze');
    } catch (error: any) {
      setError(error.message || 'An error occurred during sign up');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">VervApp</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            AI-powered Website Redesign
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(handleLogin)}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                {...register('email', { required: 'Email is required' })}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                {...register('password', { required: 'Password is required' })}
              />
            </div>
          </div>
          
          <div className="flex items-center">
            <input
              id="show-api"
              name="show-api"
              type="checkbox"
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              checked={showApiKeyInput}
              onChange={() => setShowApiKeyInput(!showApiKeyInput)}
            />
            <label htmlFor="show-api" className="ml-2 block text-sm text-gray-900">
              Add OpenAI API Key
            </label>
          </div>
          
          {showApiKeyInput && (
            <div>
              <label htmlFor="openaiApiKey" className="block text-sm font-medium text-gray-700">
                OpenAI API Key
              </label>
              <div className="mt-1">
                <input
                  id="openaiApiKey"
                  type="password"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="sk-..."
                  {...register('openaiApiKey')}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Your API key is securely stored and used only for your requests
              </p>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <div className="flex space-x-2">
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70"
            >
              {isLoading ? 'Loading...' : 'Sign In'}
            </button>
            
            <button
              type="button"
              disabled={isLoading}
              onClick={handleSubmit(handleSignUp)}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70"
            >
              {isLoading ? 'Loading...' : 'Sign Up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 