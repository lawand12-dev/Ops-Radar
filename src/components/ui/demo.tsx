import ResponsiveHeroBanner from "<npm>/components/ui/responsive-hero-banner"

function HeroDemo() {
  return (
    <div className="bg-[#030712] p-6">
      <ResponsiveHeroBanner
        badgeLabel="New"
        badgeText="First-class automation systems for modern agencies"
        title="Automation for Agencies"
        titleLine2="Without Another Tool to Manage"
        description="Use the banner as a drop-in hero on top of your existing background layers."
      />
    </div>
  )
}

export { HeroDemo }
