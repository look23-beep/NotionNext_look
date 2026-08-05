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
 * 设备检测 - 白名单模式
 * 返回 true 表示确认是移动端，允许放行
 */
function isMobileDevice() {
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  const isSmallScreen = window.innerWidth <= 1024
  const ua = navigator.userAgent
  const isMobileUA = /Mobi|Android|iPhone|iPad|iPod/i.test(ua)
  const dpr = window.devicePixelRatio || 1
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  const isCellular = connection?.type === 'cellular'

  // 必须同时满足：移动端 UA + 触摸支持 + 小屏幕
  const passes = isMobileUA && hasTouch && isSmallScreen

  // 放宽：iPad（可能无 Mobi 标识）有触摸 + 小屏/蜂窝网络也放行
  const ipadPass = hasTouch && isSmallScreen && (dpr >= 2 || isCellular)

  return passes || ipadPass
}

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

  // 关键改动：初始状态 = "待检测"，页面内容在检测通过前不渲染
  const [deviceChecked, setDeviceChecked] = useState(false)
  const [isAllowed, setIsAllowed] = useState(false)
  const [currentUrl, setCurrentUrl] = useState('')

  useEffect(() => {
    // 服务端 middleware 已经拦过一轮，这里做前端补刀
    const allowed = isMobileDevice()
    setIsAllowed(allowed)
    setCurrentUrl(window.location.href)
    setDeviceChecked(true)

    // 如果放行了，挂载行为监听 — 一旦检测到桌面端行为立即拦截
    if (allowed) {
      const block = () => {
        setIsAllowed(false)
        setDeviceChecked(true)
      }

      const handleMouseMove = (e) => {
        if (e.movementX !== 0 || e.movementY !== 0) block()
      }
      const handleWheel = () => block()
      const handleResize = () => {
        if (!isMobileDevice()) block()
      }

      window.addEventListener('mousemove', handleMouseMove, { passive: true })
      window.addEventListener('wheel', handleWheel, { passive: true })
      window.addEventListener('resize', handleResize)

      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('wheel', handleWheel)
        window.removeEventListener('resize', handleResize)
      }
    }
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

  // 检测未完成 — 不渲染任何内容（空白，避免页面闪现）
  if (!deviceChecked) {
    return null
  }

  // 检测未通过 — 拦截页
  if (!isAllowed) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100vh', textAlign: 'center',
        fontSize: '18px', backgroundColor: '#f9f9f9'
      }}>
        <div style={{
          background: '#fff', padding: '40px', borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>🚫 请使用手机访问本站</h2>
          {currentUrl && (
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(currentUrl)}`}
              alt="二维码"
              style={{ display: 'block', margin: '0 auto 20px auto' }}
            />
          )}
          <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
            请使用手机自带浏览器扫码进入
          </p>
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
