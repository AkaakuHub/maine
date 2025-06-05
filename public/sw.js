// カスタム Service Worker for My Video Storage PWA with advanced caching

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

const CACHE_NAME = 'my-video-storage-custom-v4';
const OFFLINE_URL = '/offline';

// Workboxプリキャッシュのセットアップ
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// プリキャッシュするリソース（フォールバック用）
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
          if (cacheName !== CACHE_NAME && 
              !cacheName.startsWith('workbox-') &&
              !cacheName.includes('play-pages-v1') &&
              !cacheName.includes('api-cache-v1') &&
              !cacheName.includes('static-assets-v1') &&
              !cacheName.includes('video-cache-v1')) {
            console.log('古いキャッシュを削除:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Workbox戦略的キャッシュルートの設定

// 動画再生ページの戦略的キャッシュ
registerRoute(
  ({ request, url }) => {
    return url.pathname.startsWith('/play/');
  },
  new StaleWhileRevalidate({
    cacheName: 'play-pages-v1',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
      }),
    ],
  })
);

// API キャッシュ戦略
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache-v1',
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60, // 1 hour
      }),
    ],
  })
);

// 静的アセットのキャッシュ
registerRoute(
  ({ request }) => 
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image',
  new CacheFirst({
    cacheName: 'static-assets-v1',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
    ],
  })
);

// 動画ファイルの専用キャッシュ戦略
registerRoute(
  ({ request, url }) => {
    return url.pathname.startsWith('/api/video/') || 
           request.destination === 'video';
  },
  new CacheFirst({
    cacheName: 'video-cache-v1',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        purgeOnQuotaError: true, // ストレージ不足時に古いファイルを削除
      }),
    ],
  })
);

// フォールバック用のフェッチイベント（Workboxでカバーされない場合）
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

  // Workboxルートにマッチしないナビゲーションのフォールバック
  if (request.mode === 'navigate' && !url.pathname.startsWith('/play/')) {
    event.respondWith(
      fetch(request).catch(() => {
        console.log('オフライン時のフォールバック:', url.pathname);
        return caches.match(OFFLINE_URL) || 
               new Response('オフラインです', { 
                 status: 200, 
                 headers: { 'Content-Type': 'text/html; charset=utf-8' } 
               });
      })
    );
  }
});

// Service Worker更新時の処理
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// プッシュ通知（将来の拡張用）
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/android-chrome-192x192.png',
      badge: '/favicon-32x32.png',
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

console.log('Custom Service Worker with Workbox loaded for My Video Storage PWA');
