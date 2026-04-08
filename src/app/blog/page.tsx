import type { Metadata } from 'next'
import Link from 'next/link'

import { ArrowUpRight, BookOpenText } from 'lucide-react'

import { BlogNav } from '<npm>/components/blog/blog-nav'
import { CategoryTag } from '<npm>/components/blog/category-tag'
import { getAllBlogPosts } from '<npm>/lib/blog'

export const metadata: Metadata = {
  title: 'Blog Index',
  description:
    'Technical guides on sales operations, AI systems, reporting layers, and the automation workflows behind scalable service teams.',
}

export default async function BlogIndexPage() {
  const posts = await getAllBlogPosts()
  const categoryCount = new Set(posts.flatMap((post) => post.categories)).size

  return (
    <main className="blog-shell min-h-screen text-on-surface">
      <BlogNav />

      <section className="mx-auto max-w-6xl px-6 pb-12 pt-14 md:px-8 md:pb-16 md:pt-20">
        <div className="blog-panel rounded-[2rem] px-7 py-10 shadow-[0_28px_90px_rgba(4,8,20,0.34)] md:px-10 md:py-12">
          <p className="blog-eyebrow text-primary/80">Blog Index</p>

          <div className="mt-6 grid gap-10 md:grid-cols-[minmax(0,1fr)_220px] md:items-end">
            <div className="max-w-3xl">
              <h1 className="font-headline text-4xl font-semibold tracking-tight text-on-surface md:text-6xl md:leading-[1.02]">
                A premium library of field-tested ops guides.
              </h1>
              <p className="mt-5 text-lg leading-8 text-on-surface-variant md:text-xl">
                Technical breakdowns on sales systems, AI workflows, reporting infrastructure,
                and the operating layers that make agencies scale cleanly.
              </p>
            </div>

            <div className="grid gap-4 text-sm text-on-surface-variant">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                <p className="blog-eyebrow text-on-surface-variant/85">Collection</p>
                <p className="mt-2 font-headline text-2xl font-semibold text-on-surface">
                  {posts.length} guides
                </p>
                <p className="mt-1 leading-6">
                  Built for quick scanning, deep implementation, and high-signal reuse.
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                <p className="blog-eyebrow text-on-surface-variant/85">Coverage</p>
                <p className="mt-2 font-headline text-2xl font-semibold text-on-surface">
                  {categoryCount} tracks
                </p>
                <p className="mt-1 leading-6">
                  Sales Ops, AI, reporting, onboarding, and adjacent operating systems.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24 md:px-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="blog-eyebrow text-on-surface-variant/80">Resource Library</p>
            <h2 className="mt-3 font-headline text-2xl font-semibold tracking-tight text-on-surface md:text-3xl">
              Latest guides
            </h2>
          </div>

          <div className="hidden items-center gap-2 text-sm text-on-surface-variant md:flex">
            <BookOpenText className="h-4 w-4" />
            Clean list view
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-white/12 bg-white/[0.025] px-6 py-10 text-on-surface-variant">
            No blog posts are published yet. Add an `.mdx` file under `content/blog` to populate the
            library.
          </div>
        ) : (
          <ol className="space-y-4">
            {posts.map((post) => (
              <li key={post.slug}>
                <Link
                  href={`/${post.slug}`}
                  className="group grid gap-6 rounded-[1.75rem] border border-white/10 bg-white/[0.025] px-6 py-6 shadow-[0_24px_80px_rgba(4,8,20,0.28)] transition duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-white/[0.045] md:grid-cols-[168px_minmax(0,1fr)] md:px-8 md:py-7"
                >
                  <div className="space-y-2 text-sm text-on-surface-variant">
                    <p className="blog-eyebrow text-primary/75">
                      {post.featured ? 'Featured' : 'Guide'}
                    </p>
                    <p>{post.formattedDate}</p>
                    <p>{post.readingTime}</p>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      {post.categories.map((category) => (
                        <CategoryTag key={category} category={category} />
                      ))}
                    </div>

                    <h3 className="mt-4 font-headline text-2xl font-semibold tracking-tight text-on-surface transition-colors group-hover:text-primary md:text-[2rem]">
                      {post.title}
                    </h3>

                    <p className="mt-4 max-w-3xl text-base leading-8 text-on-surface-variant md:text-lg">
                      {post.description}
                    </p>

                    <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-on-surface">
                      <span>Read guide</span>
                      <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  )
}
