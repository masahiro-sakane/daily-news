import { Article } from '../../domain/models/Article';

/**
 * 記事データ転送オブジェクト
 */
export class ArticleDTO {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly url: string,
    public readonly description: string | undefined,
    public readonly publishedAt: Date,
    public readonly feedName: string
  ) {}

  /**
   * ドメインモデルからDTOに変換
   */
  static fromDomain(article: Article): ArticleDTO {
    return new ArticleDTO(
      article.id,
      article.title,
      article.url,
      article.description,
      article.publishedAt,
      article.feedName
    );
  }

  /**
   * 複数のドメインモデルをDTOリストに変換
   */
  static fromDomainList(articles: Article[]): ArticleDTO[] {
    return articles.map((article) => ArticleDTO.fromDomain(article));
  }

  /**
   * ドメインモデルに変換
   */
  toDomain(): Article {
    return new Article(
      this.title,
      this.url,
      this.publishedAt,
      this.feedName,
      this.description
    );
  }

  /**
   * Plain Objectに変換
   */
  toPlainObject(): {
    id: string;
    title: string;
    url: string;
    description?: string;
    publishedAt: string;
    feedName: string;
  } {
    return {
      id: this.id,
      title: this.title,
      url: this.url,
      description: this.description,
      publishedAt: this.publishedAt.toISOString(),
      feedName: this.feedName,
    };
  }

  /**
   * Plain ObjectからDTOに変換
   */
  static fromPlainObject(obj: {
    id: string;
    title: string;
    url: string;
    description?: string;
    publishedAt: string;
    feedName: string;
  }): ArticleDTO {
    return new ArticleDTO(
      obj.id,
      obj.title,
      obj.url,
      obj.description,
      new Date(obj.publishedAt),
      obj.feedName
    );
  }
}
