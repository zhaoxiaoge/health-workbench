const CACHE_NAME = 'health-workbench-v7';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    'https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js',
    'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
];

// 安装：缓存核心资源
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS).catch(() => {});
        })
    );
    self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            );
        })
    );
    self.clients.claim();
});

// 请求拦截：HTML/JSON 网络优先（保证最新版本），其他资源缓存优先
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);
    const isHtmlOrJson = url.pathname.endsWith('.html') ||
                         url.pathname.endsWith('/') ||
                         url.pathname.endsWith('.json') ||
                         url.pathname.endsWith('.js');

    if (isHtmlOrJson) {
        // 网络优先策略：先尝试网络，失败则回退缓存
        event.respondWith(
            fetch(event.request).then((response) => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, clone).catch(() => {});
                });
                return response;
            }).catch(() => {
                return caches.match(event.request).then((cached) => {
                    return cached || caches.match('./index.html');
                });
            })
        );
    } else {
        // 缓存优先策略：适用于图片等静态资源
        event.respondWith(
            caches.match(event.request).then((cached) => {
                if (cached) return cached;
                return fetch(event.request).then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clone).catch(() => {});
                    });
                    return response;
                }).catch(() => {
                    return caches.match('./index.html');
                });
            })
        );
    }
});
