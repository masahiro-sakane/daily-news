import * as fs from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';
import { Feed, FeedType } from '../../domain/models/Feed';
import { ConfigurationError } from '../../shared/errors/CustomErrors';
import { logger } from '../../shared/logger/Logger';

// フィード設定のスキーマ定義
const feedConfigItemSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  type: z.enum(['rss', 'atom']),
  enabled: z.boolean().default(true),
});

const feedConfigSchema = z.object({
  feeds: z.array(feedConfigItemSchema),
  keywords: z.array(z.string().min(1)).default([]),
});

type FeedConfigData = z.infer<typeof feedConfigSchema>;

/**
 * フィード設定を管理するクラス
 */
export class FeedConfig {
  private feeds: Feed[] = [];
  private keywords: string[] = [];

  /**
   * 設定ファイルを読み込む
   */
  async load(configPath: string): Promise<void> {
    try {
      // 絶対パスに変換
      const absolutePath = path.isAbsolute(configPath)
        ? configPath
        : path.resolve(process.cwd(), configPath);

      logger.info(`Loading feed config from: ${absolutePath}`);

      // ファイルを読み込む
      const fileContent = await fs.readFile(absolutePath, 'utf-8');
      const jsonData = JSON.parse(fileContent);

      // スキーマでバリデーション
      const validatedData: FeedConfigData = feedConfigSchema.parse(jsonData);

      // Feedエンティティに変換
      this.feeds = validatedData.feeds.map((feedData) =>
        Feed.fromPlainObject({
          name: feedData.name,
          url: feedData.url,
          type: feedData.type as FeedType,
          enabled: feedData.enabled,
        })
      );

      this.keywords = validatedData.keywords;

      logger.info(
        `Feed config loaded: ${this.feeds.length} feeds, ${this.keywords.length} keywords`
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new ConfigurationError(
          `Feed configuration validation failed: ${messages}`,
          configPath
        );
      }

      if (error instanceof Error) {
        throw new ConfigurationError(
          `Failed to load feed configuration: ${error.message}`,
          configPath
        );
      }

      throw new ConfigurationError('Failed to load feed configuration', configPath);
    }
  }

  /**
   * 有効なフィードのリストを取得
   */
  getEnabledFeeds(): Feed[] {
    return this.feeds.filter((feed) => feed.isEnabled());
  }

  /**
   * すべてのフィードを取得
   */
  getAllFeeds(): Feed[] {
    return [...this.feeds];
  }

  /**
   * デフォルトキーワードを取得
   */
  getKeywords(): string[] {
    return [...this.keywords];
  }

  /**
   * 特定のフィードを名前で取得
   */
  getFeedByName(name: string): Feed | undefined {
    return this.feeds.find((feed) => feed.name === name);
  }

  /**
   * 設定が読み込まれているかチェック
   */
  isLoaded(): boolean {
    return this.feeds.length > 0;
  }
}
