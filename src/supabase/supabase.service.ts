import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Agent } from 'undici';

// Node's default connect timeout (10s) is shorter than our request timeout and
// can be exceeded by slow local DNS lookups alone, well before any real network
// issue with Supabase. Raise it so a slow lookup doesn't fail the whole request.
const dispatcher = new Agent({ connect: { timeout: 30_000 } });

const RETRYABLE_ERROR_CODES = new Set(['UND_ERR_CONNECT_TIMEOUT', 'ETIMEDOUT', 'ECONNRESET']);

async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, { ...init, signal: AbortSignal.timeout(60_000), dispatcher } as RequestInit);
  } catch (error) {
    const cause = (error as { cause?: { code?: string } })?.cause;
    if (cause?.code && RETRYABLE_ERROR_CODES.has(cause.code)) {
      return fetch(input, { ...init, signal: AbortSignal.timeout(60_000), dispatcher } as RequestInit);
    }
    throw error;
  }
}

@Injectable()
export class SupabaseService {
  private readonly client: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    const url = configService.getOrThrow<string>('SUPABASE_URL');
    const serviceKey = configService.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY');
    this.client = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: fetchWithRetry },
    });
  }

  async getUser(token: string) {
    return this.client.auth.getUser(token);
  }

  get adminAuth() {
    return this.client.auth.admin;
  }
}
