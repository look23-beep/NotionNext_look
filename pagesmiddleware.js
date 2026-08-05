// middleware.js — 服务端 UA 预筛
// 运行在 Vercel Edge Runtime，请求到达页面之前就拦截

import { NextResponse } from 'next/server'

export function middleware(request) {
  const ua = request.headers.get('user-agent') || ''
  const url = request.nextUrl.clone()

  // 跳过 API 路由、静态资源、Next.js 内部请求
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/') ||
    url.pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|css|js|xml|txt|woff2?)$/)
  ) {
    return NextResponse.next()
  }

  // 搜索引擎放行
  const isBot = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandex|facebookexternalhit|twitterbot|linkedinbot|slack/i.test(ua)
  if (isBot) {
    return NextResponse.next()
  }

  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua)

  if (!isMobile) {
    return new NextResponse(
      `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>请使用手机访问</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    display: flex; align-items: center; justify-content: center;
    height: 100vh; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
  }
  .card {
    background: #fff; padding: 48px 56px; border-radius: 16px;
    box-shadow: 0 4px 24px rgba(0,0,0,.06); text-align: center; max-width: 400px;
  }
  .icon { font-size: 48px; margin-bottom: 16px; }
  h2 { color: #1a1a1a; font-size: 20px; font-weight: 600; margin-bottom: 8px; }
  p { color: #888; font-size: 14px; line-height: 1.6; }
</style>
</head>
<body>
<div class="card">
  <div class="icon">📱</div>
  <h2>请使用手机访问</h2>
  <p>本站仅支持移动端浏览<br>请用手机扫码或直接访问</p>
</div>
</body>
</html>`,
      {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/((?!api|_next|favicon.ico|sitemap.xml|robots.txt).*)',
}
