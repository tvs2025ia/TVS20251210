import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG, validateSupabaseConfig, logConnectionError } from './supabase.config';

// Validar configuración al inicio (no lanzar para evitar crash si faltan vars)
const configIsValid = validateSupabaseConfig();
if (!configIsValid) {
  logConnectionError(new Error('Supabase configuration is missing or invalid. Continuing in offline mode.'), 'Config Validation');
}

// Crear cliente de Supabase con configuración mejorada
export const supabase = createClient(
  SUPABASE_CONFIG.url || '',
  SUPABASE_CONFIG.anonKey || '',
  {
    auth: {
      persistSession: true,
      storageKey: 'pos-auth-token',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'X-Client-Info': 'pos-system'
      }
    },
    // Configuración de reintentos automáticos
    realtime: {
      params: {
        eventsPerSecond: 2
      }
    }
  }
);

// Helper para verificar la salud de la conexión
export async function checkSupabaseHealth(): Promise<{
  isHealthy: boolean;
  latency?: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    // Intentar una consulta simple que siempre debería funcionar
    const { error } = await supabase.from('products').select('id').limit(1);
    
    if (error && !error.message.includes('relation "products" does not exist')) {
      throw error;
    }
    
    const latency = Date.now() - startTime;
    return {
      isHealthy: true,
      latency
    };
  } catch (error) {
    logConnectionError(error, 'Health Check');
    return {
      isHealthy: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Helper para reintentar operaciones
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = SUPABASE_CONFIG.retries,
  delay: number = SUPABASE_CONFIG.retryDelay
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (i === maxRetries) {
        throw lastError;
      }
      
      // Esperar antes del siguiente intento (exponential backoff)
      const waitTime = delay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError!;
}
