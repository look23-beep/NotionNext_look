import { NextResponse, userAgent } from 'next/server'

export function middleware(request) {
  // 解析 User-Agent 获取设备信息
  const { device } = userAgent(request)

  // device.type 在移动端是 'mobile'，平板是 'tablet'
  // 如果不是手机和平板，我们默认它是电脑端 (PC)
  if (device.type !== 'mobile' && device.type !== 'tablet') {
    // 返回一段 HTML 提示，并设置状态码为 403 (禁止访问)
    return new NextResponse(
      `<!DOCTYPE html>
       <html>
         <head>
           <meta charset="utf-8" />
           <meta name="viewport" content="width=device-width, initial-scale=1">
           <title>访问受限</title>
           <style>
             body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; font-family: sans-serif; background-color: #f5f5f5; text-align: center; }
             .container { padding: 20px; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
           </style>
         </head>
         <body>
           <div class="container">
             <h2>🚫 抱歉，本博客仅限手机端访问</h2>
             <p>请使用移动设备浏览器打开此链接。</p>
           </div>
         </body>
       </html>`,
      {
        status: 403,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }
    )
  }

  // 如果是移动端，正常放行
  return NextResponse.next()
}

// 配置中间件匹配的路径
export const config = {
  // 匹配所有页面，但排除 API 路由、静态文件和图片资源
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
