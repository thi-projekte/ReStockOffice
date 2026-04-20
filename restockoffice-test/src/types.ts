export interface Article {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  category?: string;
}

export interface CartItem {
  article: Article;
  quantity: number;
}

export type View = 'login' | 'articles' | 'cart';
