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
const ClerkProvider = dynamic(() =>
  import('@clerk/nextjs').then(m => m.ClerkProvider)
)

/**
 * App挂载DOM 入口文件
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
      // 1. UA 检测
      const ua = navigator.userAgent
      const isMobileUA = /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(ua)
      
      // 2. 触摸屏检测
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0

      // 3. 🌟 针对 F12 模拟器的必杀技：内外宽度差检测
      // 正常手机上 outerWidth 和 innerWidth 几乎一致。
      // F12 模拟器下，innerWidth 是手机宽度，而 outerWidth 是你整个电脑屏幕/大窗口的宽度
      const isEmulator = window.outerWidth > 0 && (window.outerWidth - window.innerWidth > 150)

      // 综合判断逻辑：
      // 如果没有移动端UA，或者没有触摸屏(单纯缩小PC浏览器)，或者是模拟器(开启F12)，一律拦截！
      if (!isMobileUA || !hasTouch || isEmulator) {
        setIsBlocked(true)
        setCurrentUrl(window.location.href)
      } else {
        setIsBlocked(false)
      }
    }

    // 初始检测
    checkEnvironment()

    // 监听窗口改变，实时防护
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
  
  // 🚨 渲染拦截页面
  if (isBlocked) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center', fontSize: '18px', backgroundColor: '#f9f9f9', fontFamily: 'sans-serif' }}>
        <div style={{ background: '#fff', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>🚫 请使用手机访问本站</h2>
          <p style={{ color: '#E53E3E', fontSize: '14px', marginBottom: '20px', fontWeight: 'bold' }}>检测到桌面端或模拟器环境</p>
          {currentUrl && (
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(currentUrl)}`} 
              alt="二维码" 
              style={{ display: 'block', margin: '0 auto 20px auto' }}
            />
          )}
          <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>请使用手机真实环境扫码进入</p>
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
