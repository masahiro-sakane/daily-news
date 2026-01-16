import { z } from 'zod';
import * as dotenv from 'dotenv';
import { ConfigurationError } from '../../shared/errors/CustomErrors';

// 環境変数のスキーマ定義
const envSchema = z.object({
  DISCORD_WEBHOOK_URL: z.string().url('DISCORD_WEBHOOK_URL must be a valid URL'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FEED_CONFIG_PATH: z.string().default('config/feeds.json'),
  STORAGE_PATH: z.string().default('data/read-articles.json'),
  RETENTION_DAYS: z.string().default('30').transform((val) => parseInt(val, 10)),
  MAX_RETRIES: z.string().default('3').transform((val) => parseInt(val, 10)),
  RETRY_DELAY_MS: z.string().default('1000').transform((val) => parseInt(val, 10)),
  FETCH_TIMEOUT_MS: z.string().default('10000').transform((val) => parseInt(val, 10)),
});

type EnvConfig = z.infer<typeof envSchema>;

/**
 * アプリケーション設定を管理するクラス
 */
export class Config {
  private static instance: Config | null = null;
  private readonly config: EnvConfig;

  private constructor() {
    // .envファイルを読み込む
    dotenv.config();

    try {
      // 環境変数をバリデーション
      this.config = envSchema.parse({
        DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL,
        NODE_ENV: process.env.NODE_ENV,
        FEED_CONFIG_PATH: process.env.FEED_CONFIG_PATH,
        STORAGE_PATH: process.env.STORAGE_PATH,
        RETENTION_DAYS: process.env.RETENTION_DAYS,
        MAX_RETRIES: process.env.MAX_RETRIES,
        RETRY_DELAY_MS: process.env.RETRY_DELAY_MS,
        FETCH_TIMEOUT_MS: process.env.FETCH_TIMEOUT_MS,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new ConfigurationError(`Environment variable validation failed: ${messages}`);
      }
      throw error;
    }
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  /**
   * テスト用にインスタンスをリセット
   */
  static resetInstance(): void {
    Config.instance = null;
  }

  // Getters
  get discordWebhookUrl(): string {
    return this.config.DISCORD_WEBHOOK_URL;
  }

  get nodeEnv(): 'development' | 'production' | 'test' {
    return this.config.NODE_ENV;
  }

  get feedConfigPath(): string {
    return this.config.FEED_CONFIG_PATH;
  }

  get storagePath(): string {
    return this.config.STORAGE_PATH;
  }

  get retentionDays(): number {
    return this.config.RETENTION_DAYS;
  }

  get maxRetries(): number {
    return this.config.MAX_RETRIES;
  }

  get retryDelayMs(): number {
    return this.config.RETRY_DELAY_MS;
  }

  get fetchTimeoutMs(): number {
    return this.config.FETCH_TIMEOUT_MS;
  }

  /**
   * 本番環境かチェック
   */
  isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  /**
   * 開発環境かチェック
   */
  isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development';
  }

  /**
   * テスト環境かチェック
   */
  isTest(): boolean {
    return this.config.NODE_ENV === 'test';
  }
}
