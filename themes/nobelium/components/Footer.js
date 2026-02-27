import { siteConfig } from '@/lib/config'

export const Footer = (props) => {
  const { post } = props
  const fullWidth = post?.fullWidth ?? false

  return (
    <footer
      className={`z-10 relative mt-6 flex-shrink-0 m-auto w-full transition-all ${
        !fullWidth ? 'max-w-2xl px-4' : 'px-4 md:px-24'
      }`}
    >
    </footer>
  )
}
