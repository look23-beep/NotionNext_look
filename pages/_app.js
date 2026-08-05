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
 * 多层设备检测工具
 * 服务端已由 middleware.js 完成 UA 预筛，前端专注于行为特征检测
 */
function detectDesktop() {
  let reason = null

  // 1. 触摸支持
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0

  // 2. 屏幕尺寸
  const isSmallScreen = window.innerWidth <= 1024

  // 3. 设备像素比（桌面显示器通常是 1，移动设备 2-3）
  const dpr = window.devicePixelRatio || 1

  // 4. 连接类型
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  const isCellular = connection?.type === 'cellular'

  // 无触摸 → 桌面
  if (!hasTouch) {
    reason = 'no_touch'
  }

  // 大屏幕 + 低 DPR + 非蜂窝网络 → 桌面显示器
  if (!isSmallScreen && dpr === 1 && !isCellular) {
    reason = 'desktop_display'
  }

  // 大屏幕 + 无触摸 → 横屏 iPad Pro 可能有触摸但屏幕大，单独处理
  if (!isSmallScreen && !hasTouch) {
    reason = 'large_screen_no_touch'
  }

  return { blocked: !!reason, reason }
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

  // 拦截状态
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockReason, setBlockReason] = useState('')
  const [currentUrl, setCurrentUrl] = useState('')

  useEffect(() => {
    let mouseDetected = false
    let wheelDetected = false
    let blockTimer = null

    // 行为检测：鼠标移动是桌面端最难以隐藏的痕迹
    const detectMouseMove = (e) => {
      // movementX/Y 不为 0 说明是物理鼠标移动
      if (e.movementX !== 0 || e.movementY !== 0) {
        mouseDetected = true
        applyBlock('mouse_behavior')
      }
    }

    const detectWheel = () => {
      wheelDetected = true
      applyBlock('wheel_behavior')
    }

    // 右键菜单
    const detectContextMenu = () => {
      applyBlock('context_menu')
    }

    const applyBlock = (reason) => {
      if (!isBlocked) {
        setBlockReason(reason)
        setCurrentUrl(window.location.href)
        setIsBlocked(true)
      }
    }

    // 初始静态检测
    const result = detectDesktop()
    if (result.blocked) {
      applyBlock(result.reason)
    }

    // 挂载行为监听
    window.addEventListener('mousemove', detectMouseMove, { passive: true })
    window.addEventListener('wheel', detectWheel, { passive: true })
    window.addEventListener('contextmenu', detectContextMenu)

    // 窗口大小变化
    const handleResize = () => {
      const r = detectDesktop()
      if (r.blocked) {
        applyBlock(r.reason)
      }
    }
    window.addEventListener('resize', handleResize)

    // 延迟二次检测：给改 UA 插件 3 秒时间"稳定"，再测一次环境指纹
    blockTimer = setTimeout(() => {
      const r = detectDesktop()
      if (r.blocked) {
        applyBlock('delayed_' + r.reason)
      }
    }, 3000)

    return () => {
      window.removeEventListener('mousemove', detectMouseMove)
      window.removeEventListener('wheel', detectWheel)
      window.removeEventListener('contextmenu', detectContextMenu)
      window.removeEventListener('resize', handleResize)
      clearTimeout(blockTimer)
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

  if (isBlocked) {
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
