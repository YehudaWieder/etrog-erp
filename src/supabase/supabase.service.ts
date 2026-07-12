import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly client: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    const url = configService.getOrThrow<string>('SUPABASE_URL');
    const serviceKey = configService.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY');
    this.client = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        fetch: (input, init) =>
          fetch(input, { ...init, signal: AbortSignal.timeout(60_000) }),
      },
    });
  }

  async getUser(token: string) {
    return this.client.auth.getUser(token);
  }

  get adminAuth() {
    return this.client.auth.admin;
  }
}
