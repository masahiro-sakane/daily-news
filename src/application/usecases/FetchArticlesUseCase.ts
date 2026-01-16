import { Article } from '../../domain/models/Article';
import { ArticleFilter } from '../../domain/models/ArticleFilter';
import { Feed } from '../../domain/models/Feed';
import { IArticleRepository } from '../../domain/repositories/IArticleRepository';
import { ArticleFilterService } from '../../domain/services/ArticleFilterService';
import { FeedClient } from '../../infrastructure/feed/FeedClient';
import { ArticleDTO } from '../dto/ArticleDTO';
import { logger } from '../../shared/logger/Logger';

/**
 * 記事取得ユースケースの入力
 */
export interface FetchArticlesInput {
  feeds: Feed[];
  keywords: string[];
  maxArticles?: number;
}

/**
 * 記事取得ユースケースの出力
 */
export interface FetchArticlesOutput {
  articles: ArticleDTO[];
  totalFetched: number;
  totalFiltered: number;
  newArticles: number;
}

/**
 * 記事取得ユースケース
 *
 * 責任:
 * - フィードから記事を取得
 * - キーワードでフィルタリング
 * - 既読記事を除外
 * - 新着記事のみを返す
 */
export class FetchArticlesUseCase {
  constructor(
    private readonly feedClient: FeedClient,
    private readonly articleRepository: IArticleRepository,
    private readonly filterService: ArticleFilterService
  ) {}

  /**
   * 記事を取得して処理
   */
  async execute(input: FetchArticlesInput): Promise<FetchArticlesOutput> {
    logger.info('Starting FetchArticlesUseCase');

    // 1. フィードから記事を取得
    const fetchedArticles = await this.fetchArticlesFromFeeds(input.feeds);
    logger.info(`Fetched ${fetchedArticles.length} articles from feeds`);

    // 2. キーワードでフィルタリング
    const filteredArticles = this.filterByKeywords(fetchedArticles, input.keywords);
    logger.info(`Filtered to ${filteredArticles.length} articles by keywords`);

    // 3. 既読記事を除外
    const newArticles = await this.excludeReadArticles(filteredArticles);
    logger.info(`Found ${newArticles.length} new articles`);

    // 4. 公開日時で降順ソート
    const sortedArticles = this.filterService.sortByPublishedDate(newArticles);

    // 5. 最大件数に制限（オプション）
    const limitedArticles = input.maxArticles
      ? this.filterService.limitArticles(sortedArticles, input.maxArticles)
      : sortedArticles;

    // 6. DTOに変換
    const articleDTOs = ArticleDTO.fromDomainList(limitedArticles);

    logger.info('FetchArticlesUseCase completed successfully');

    return {
      articles: articleDTOs,
      totalFetched: fetchedArticles.length,
      totalFiltered: filteredArticles.length,
      newArticles: newArticles.length,
    };
  }

  /**
   * フィードから記事を取得
   */
  private async fetchArticlesFromFeeds(feeds: Feed[]): Promise<Article[]> {
    const enabledFeeds = feeds.filter((feed) => feed.isEnabled());
    logger.info(`Fetching articles from ${enabledFeeds.length} enabled feeds`);

    if (enabledFeeds.length === 0) {
      logger.warn('No enabled feeds found');
      return [];
    }

    return await this.feedClient.fetchEnabledFeeds(feeds);
  }

  /**
   * キーワードでフィルタリング
   */
  private filterByKeywords(articles: Article[], keywords: string[]): Article[] {
    if (keywords.length === 0) {
      logger.info('No keywords specified, returning all articles');
      return articles;
    }

    // フィルターを作成（OR戦略、大文字小文字区別なし）
    const filter = new ArticleFilter(keywords, {
      matchStrategy: 'OR',
      caseSensitive: false,
      searchInTitle: true,
      searchInDescription: true,
      searchInContent: false,
    });

    return this.filterService.filterArticles(articles, filter);
  }

  /**
   * 既読記事を除外
   */
  private async excludeReadArticles(articles: Article[]): Promise<Article[]> {
    const readArticleIds = await this.articleRepository.findReadArticleIds();
    const readIdsSet = new Set(readArticleIds);

    logger.info(`Excluding ${readIdsSet.size} read articles`);

    return this.filterService.excludeReadArticles(articles, readIdsSet);
  }
}
