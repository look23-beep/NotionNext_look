// import '@/styles/animate.css' // @see https://animate.style/
import '@/styles/globals.css'
import '@/styles/utility-patterns.css'

// core styles shared by all of react-notion-x (required)
import '@/styles/notion.css' // 重写部分notion样式
import 'react-notion-x/src/styles.css' // 原版的react-notion-x

import useAdjustStyle from '@/hooks/useAdjustStyle'
import { GlobalContextProvider } from '@/lib/global'
import { getBaseLayoutByTheme } from '@/themes/theme'
import { useRouter } from 'next/router'
import { useCallback, useMemo, useEffect, useState } from 'react'
import { getQueryParam } from '../lib/utils'

// 各种扩展插件 这个要阻塞引入
import BLOG from '@/blog.config'
import ExternalPlugins from '@/components/ExternalPlugins'
import SEO from '@/components/SEO'
import { zhCN } from '@clerk/localizations'
import dynamic from 'next/dynamic'
// import { ClerkProvider } from '@clerk/nextjs'
const ClerkProvider = dynamic(() =>
  import('@clerk/nextjs').then(m => m.ClerkProvider)
)

/**
 * App挂载DOM 入口文件
 * @param {*} param0
 * @returns
 */
const MyApp = ({ Component, pageProps }) => {
  useAdjustStyle()

  const route = useRouter()
  const theme = useMemo(() => {
    return (
      getQueryParam(route.asPath, 'theme') ||
      pageProps?.NOTION_CONFIG?.THEME ||
      BLOG.THEME
    )
  }, [route])

  // 🚨 电脑端拦截状态
  const [isBlocked, setIsBlocked] = useState(false)
  const [currentUrl, setCurrentUrl] = useState('')

  useEffect(() => {
    const checkEnvironment = () => {
      // 1. UA 检测 (基础防御)
      const ua = navigator.userAgent
      const isMobileUA = /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(ua)
      
      // 2. 触摸屏检测 (F12 手机模式默认有 touch，但普通改 UA 插件通常不会伪造 touch)
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0

      // 3. 屏幕物理像素与逻辑分辨率检测 (拦截强行缩小浏览器窗口的行为)
      const isSmallScreen = window.innerWidth <= 1024
      
      // 4. 平台底层检测 (即使 F12 伪装了 UA，navigator.platform 有时依然会暴露 MacIntel 或 Win32)
      // 注意：该 API 已被标记为废弃，但在旧版和部分现代浏览器中依然有效，适合做辅助判断
      const platform = navigator?.platform || ''
      const isDesktopPlatform = /MacIntel|Win32|Win64|Linux x86_64/.test(platform)

      // 综合判断逻辑：如果不是移动端 UA，或者没有触摸功能，或者是明显的 PC 平台，就拦截
      // (特例: iPad 较新版本 UA 可能像 Mac，但具有 touch，这里放行 touch + smallScreen)
      if (!isMobileUA || !hasTouch || (isDesktopPlatform && !hasTouch)) {
        setIsBlocked(true)
        setCurrentUrl(window.location.href)
      } else {
        // 如果用户在模拟器中放大了窗口，也拦截
        if (!isSmallScreen) {
          setIsBlocked(true)
          setCurrentUrl(window.location.href)
        } else {
          setIsBlocked(false)
        }
      }
    }

    // 初始检测
    checkEnvironment()

    // 监听窗口改变 (防止用户先在小窗口打开，然后最大化)
    window.addEventListener('resize', checkEnvironment)
    return () => window.removeEventListener('resize', checkEnvironment)
  }, [])

  // 整体布局
  const GLayout = useCallback(
    props => {
      const Layout = getBaseLayoutByTheme(theme)
      return <Layout {...props} />
    },
    [theme]
  )

  const enableClerk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  
  // 🚨 如果被拦截，直接返回拦截页面，不挂载任何原页面 DOM
  if (isBlocked) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center', fontSize: '18px', backgroundColor: '#f9f9f9' }}>
        <div style={{ background: '#fff', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>🚫 请使用手机访问本站</h2>
          {currentUrl && (
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(currentUrl)}`} 
              alt="二维码" 
              style={{ display: 'block', margin: '0 auto 20px auto' }}
            />
          )}
          <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>请使用手机微信或浏览器扫码进入</p>
        </div>
      </div>
    )
  }

  const content = (
    <GlobalContextProvider {...pageProps}>
      <GLayout {...pageProps}>
        <SEO {...pageProps} />
        <Component {...pageProps} />
      </GLayout>
      <ExternalPlugins {...pageProps} />
    </GlobalContextProvider>
  )

  return (
    <>
      {enableClerk ? (
        <ClerkProvider localization={zhCN}>{content}</ClerkProvider>
      ) : (
        content
      )}
    </>
  )
}

export default MyApp
