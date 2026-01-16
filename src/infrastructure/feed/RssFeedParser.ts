import Parser from 'rss-parser';
import { Article } from '../../domain/models/Article';
import { Feed } from '../../domain/models/Feed';
import { FeedParseError } from '../../shared/errors/CustomErrors';
import { logger } from '../../shared/logger/Logger';

/**
 * RSSフィードをパースするクラス
 */
export class RssFeedParser {
  private parser: Parser;

  constructor() {
    this.parser = new Parser({
      timeout: 10000,
      headers: {
        'User-Agent': 'Daily-News-Bot/1.0',
      },
    });
  }

  /**
   * フィードをパースして記事リストを取得
   */
  async parse(feed: Feed): Promise<Article[]> {
    try {
      logger.info(`Parsing feed: ${feed.name} (${feed.url})`);

      const parsedFeed = await this.parser.parseURL(feed.url);
      const articles: Article[] = [];

      if (!parsedFeed.items || parsedFeed.items.length === 0) {
        logger.warn(`No items found in feed: ${feed.name}`);
        return articles;
      }

      for (const item of parsedFeed.items) {
        try {
          const article = this.itemToArticle(item, feed.name);
          if (article) {
            articles.push(article);
          }
        } catch (error) {
          logger.warn(`Failed to parse item in feed ${feed.name}:`, error);
          // 個別の記事パースエラーはスキップして続行
          continue;
        }
      }

      logger.info(`Parsed ${articles.length} articles from feed: ${feed.name}`);
      return articles;
    } catch (error) {
      if (error instanceof Error) {
        throw new FeedParseError(
          `Failed to parse feed ${feed.name}: ${error.message}`,
          feed.url
        );
      }
      throw new FeedParseError(`Failed to parse feed ${feed.name}`, feed.url);
    }
  }

  /**
   * フィードアイテムを記事エンティティに変換
   */
  private itemToArticle(item: Parser.Item, feedName: string): Article | null {
    // 必須フィールドのチェック
    if (!item.title || !item.link) {
      logger.warn(`Item missing required fields (title or link) in feed: ${feedName}`);
      return null;
    }

    // 公開日の取得（フォールバック付き）
    const publishedAt = this.parsePublishedDate(item);

    // 記事を作成
    return new Article(
      item.title,
      item.link,
      publishedAt,
      feedName,
      item.contentSnippet || item.content || undefined,
      item.content || undefined
    );
  }

  /**
   * 公開日をパース（複数のフィールドを試す）
   */
  private parsePublishedDate(item: Parser.Item): Date {
    // isoDate, pubDate, published などの一般的なフィールドを試す
    const dateString = item.isoDate || item.pubDate || (item as any).published;

    if (dateString) {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // パースできない場合は現在時刻を使用
    logger.warn(`Could not parse published date, using current time`);
    return new Date();
  }

  /**
   * 複数のフィードを並行してパース
   */
  async parseMultiple(feeds: Feed[]): Promise<Map<string, Article[]>> {
    const results = new Map<string, Article[]>();

    // 並行処理でパース
    const parsePromises = feeds.map(async (feed) => {
      try {
        const articles = await this.parse(feed);
        return { feedName: feed.name, articles };
      } catch (error) {
        logger.error(`Failed to parse feed ${feed.name}:`, error);
        return { feedName: feed.name, articles: [] };
      }
    });

    const parsedResults = await Promise.all(parsePromises);

    // 結果をMapに格納
    for (const result of parsedResults) {
      results.set(result.feedName, result.articles);
    }

    return results;
  }
}
