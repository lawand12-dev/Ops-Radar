import SiteHeader from '<npm>/components/ui/site-header'

export function BlogNav() {
  return (
    <SiteHeader
      sticky
      navLinks={[
        { label: 'Home', href: '/' },
        { label: 'Services', href: '/services' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'About', href: '/about' },
        { label: 'Blog', href: '/blog', isActive: true },
      ]}
      ctaLabel="Start Audit"
      ctaHref="/audit"
    />
  )
}
