// カスタムService Worker for My Video Storage PWA

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// プリキャッシュのセットアップ
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// 動画再生ページの戦略的キャッシュ
registerRoute(
  ({ request, url }) => {
    // /play/xxx パスをキャッシュ
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
    // 動画ファイルのAPIエンドポイントを検出
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

// オフライン時のフォールバック
registerRoute(
  ({ request }) => request.mode === 'navigate',
  async ({ event }) => {
    try {
      // ネットワークから取得を試行
      const response = await fetch(event.request);
      return response;
    } catch (error) {
      // オフライン時はフォールバックページを表示
      const cache = await caches.open('precache-v1');
      return cache.match('/offline') || new Response('Offline', { status: 200 });
    }
  }
);

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
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

console.log('Custom Service Worker loaded for My Video Storage PWA');
