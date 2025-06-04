// カスタム Service Worker for オフライン動画再生

const CACHE_NAME = 'my-video-storage-custom-v3';
const OFFLINE_URL = '/offline';

// プリキャッシュするリソース
const PRECACHE_URLS = [
  '/',
  '/offline',
  '/favicon.ico',
  '/manifest.json'
];

// インストール時
self.addEventListener('install', (event) => {
  console.log('カスタム Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(err => {
        console.log('プリキャッシュエラー:', err);
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// アクティブ化時
self.addEventListener('activate', (event) => {
  console.log('カスタム Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('古いキャッシュを削除:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// フェッチイベント
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 開発環境のHMR関連リクエストのみスキップ
  if (url.pathname.includes('_next/webpack-hmr') || 
      url.pathname.includes('_next/static/hmr')) {
    return; // 通常のフェッチを実行
  }

  // RSCリクエストは通常通り処理
  if (url.searchParams.has('_rsc')) {
    console.log('RSCリクエストを処理:', url.pathname);
    return; // 通常のフェッチを実行
  }

  // HTMLページのリクエスト（ナビゲーション）
  if (request.mode === 'navigate') {
    console.log('ナビゲーションリクエスト:', url.pathname);
    
    event.respondWith(
      fetch(request)
        .then((response) => {
          // オンライン時: レスポンスをキャッシュして返す
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
              console.log('ページをキャッシュしました:', url.pathname);
            });
          }
          return response;
        })
        .catch(() => {
          // オフライン時: キャッシュから返す
          console.log('オフライン時のキャッシュ検索:', url.pathname);
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              console.log('キャッシュからページを返します:', url.pathname);
              return cachedResponse;
            }
            // play/ページの場合は特別処理
            if (url.pathname.startsWith('/play/')) {
              console.log('オフライン時の動画ページ:', url.pathname);
              // オフライン専用のplay/ページを返す
              return fetch('/play/offline-fallback').catch(() => {
                return caches.match('/offline') || 
                       new Response('オフライン動画ページを準備中...', { 
                         status: 200, 
                         headers: { 'Content-Type': 'text/html; charset=utf-8' } 
                       });
              });
            }
            // その他の場合はオフラインページを返す
            console.log('オフラインページにリダイレクト');
            return caches.match(OFFLINE_URL) || 
                   new Response('オフラインです', { 
                     status: 200, 
                     headers: { 'Content-Type': 'text/html; charset=utf-8' } 
                   });
          });
        })
    );
    return;
  }

  // API リクエストの処理
  if (url.pathname.startsWith('/api/')) {
    console.log('API リクエスト:', url.pathname);
    
    // videos API - オフライン時はIndexedDBから取得
    if (url.pathname === '/api/videos') {
      event.respondWith(
        fetch(request).catch(() => {
          console.log('オフライン時: IndexedDBから動画リストを取得');
          // IndexedDBからオフライン動画リストを取得するレスポンスを返す
          return new Response(JSON.stringify([]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        })
      );
      return;
    }

    // 動画API - キャッシュ優先
    if (url.pathname.startsWith('/api/video/')) {
      event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
          return cache.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              console.log('動画APIキャッシュヒット:', url.pathname);
              return cachedResponse;
            }
            return fetch(request).then((response) => {
              if (response.status === 200) {
                const responseClone = response.clone();
                cache.put(request, responseClone);
                console.log('動画APIをキャッシュしました:', url.pathname);
              }
              return response;
            }).catch(() => {
              console.log('動画API オフラインエラー:', url.pathname);
              return new Response('オフラインです', { status: 503 });
            });
          });
        })
      );
      return;
    }
  }

  // 静的リソースのキャッシュ戦略
  if (url.pathname.startsWith('/favicon') ||
      url.pathname.startsWith('/icons/') ||
      url.pathname.startsWith('/manifest.json') ||
      url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        }).catch(() => {
          // 静的リソースが見つからない場合
          return new Response('リソースが見つかりません', { status: 404 });
        });
      })
    );
  }
});

console.log('カスタム Service Worker loaded');
