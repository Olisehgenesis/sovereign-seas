// src/utils/api.ts
// Improved API fetch utilities with retry logic and better error handling

interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

// Default fetch options
const DEFAULT_OPTIONS: FetchOptions = {
  method: 'GET',
  timeout: 15000, // 15 seconds
  retries: 3,
  retryDelay: 1000, // 1 second
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
};

// Improved fetch function with retry logic and better error handling
export async function fetchWithRetry<T = any>(
  url: string, 
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.retries!; attempt++) {
    try {
      console.log(`API Request attempt ${attempt + 1}/${config.retries! + 1} to: ${url}`);
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);

      // Prepare fetch options
      const fetchOptions: RequestInit = {
        method: config.method,
        headers: config.headers,
        signal: controller.signal,
        mode: 'cors', // Explicitly set CORS mode
        credentials: 'omit', // Don't send credentials for cross-origin requests
      };

      // Add body for non-GET requests
      if (config.method !== 'GET' && config.body) {
        fetchOptions.body = typeof config.body === 'string' 
          ? config.body 
          : JSON.stringify(config.body);
      }

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      // Check if response is ok
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }

      // Parse response
      const data = await response.json();
      
      console.log(`API Request successful on attempt ${attempt + 1}:`, data);
      
      return {
        success: true,
        data,
        status: response.status
      };

    } catch (error) {
      lastError = error as Error;
      console.error(`API Request attempt ${attempt + 1} failed:`, error);

      // Don't retry on certain errors
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error('Request timeout');
        } else if (error.message.includes('HTTP error! status: 4')) {
          console.error('Client error - not retrying');
          break; // Don't retry 4xx errors
        } else if (error.message.includes('HTTP error! status: 5')) {
          console.error('Server error - will retry');
        } else {
          console.error('Network error - will retry');
        }
      }

      // If this is the last attempt, throw the error
      if (attempt === config.retries!) {
        break;
      }

      // Wait before retrying
      if (config.retryDelay! > 0) {
        console.log(`Waiting ${config.retryDelay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, config.retryDelay!));
      }
    }
  }

  // All retries failed
  const errorMessage = lastError?.message || 'Unknown error occurred';
  console.error(`All ${config.retries! + 1} API request attempts failed. Last error:`, errorMessage);
  
  return {
    success: false,
    error: errorMessage,
    status: 0
  };
}

// Specific function for verification data
export async function fetchVerificationData(walletAddress: string): Promise<ApiResponse> {
  const url = `https://selfauth.vercel.app/api/verify?wallet=${encodeURIComponent(walletAddress)}`;
  
  console.log('Fetching verification data for wallet:', walletAddress);
  
  return fetchWithRetry(url, {
    method: 'GET',
    timeout: 20000, // 20 seconds for verification data
    retries: 2,
    retryDelay: 2000, // 2 seconds between retries
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}

// Function to check if API endpoint is reachable
export async function pingApiEndpoint(): Promise<boolean> {
  try {
    const response = await fetchWithRetry('https://selfauth.vercel.app', {
      method: 'GET',
      timeout: 5000,
      retries: 1
    });
    return response.success;
  } catch (error) {
    console.error('API endpoint ping failed:', error);
    return false;
  }
}

// Function to save GoodDollar verification
export async function saveGoodDollarVerification(data: {
  wallet: string;
  userId: string;
  verificationStatus: boolean;
  root?: string | null;
}): Promise<ApiResponse> {
  const url = 'https://selfauth.vercel.app/api/verify-gooddollar';
  
  console.log('Saving GoodDollar verification:', data);
  
  return fetchWithRetry(url, {
    method: 'POST',
    timeout: 15000,
    retries: 2,
    retryDelay: 2000,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    },
    body: data
  });
} 