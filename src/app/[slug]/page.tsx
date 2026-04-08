import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ArrowLeft, CalendarDays, Clock3 } from 'lucide-react'

import { BlogNav } from '<npm>/components/blog/blog-nav'
import { CategoryTag } from '<npm>/components/blog/category-tag'
import { getAllBlogPosts, getBlogPost } from '<npm>/lib/blog'

type ArticlePageProps = {
  params: Promise<{ slug: string }>
}

export const dynamicParams = false

export async function generateStaticParams() {
  const posts = await getAllBlogPosts()

  return posts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await getBlogPost(slug)

  if (!post) {
    return {}
  }

  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: `/${slug}`,
    },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      images: [{ url: '/logo.png', width: 1024, height: 1024, alt: 'OpsRadar' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: ['/logo.png'],
    },
  }
}

export default async function BlogArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params
  const post = await getBlogPost(slug)

  if (!post) {
    notFound()
  }

  return (
    <main className="blog-shell min-h-screen text-on-surface">
      <BlogNav />

      <section className="mx-auto max-w-6xl px-6 pb-24 pt-10 md:px-8 md:pt-14">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] px-6 py-8 shadow-[0_24px_80px_rgba(4,8,20,0.3)] md:px-10 md:py-10">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-medium text-on-surface-variant transition-colors hover:text-on-surface"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to blog index
          </Link>

          <div className="mt-8 max-w-4xl">
            <div className="flex flex-wrap gap-2">
              {post.categories.map((category) => (
                <CategoryTag key={category} category={category} />
              ))}
            </div>

            <h1 className="mt-6 font-headline text-4xl font-semibold tracking-tight text-on-surface md:text-6xl md:leading-[1.02]">
              {post.title}
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-on-surface-variant md:text-xl">
              {post.description}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-5 text-sm text-on-surface-variant">
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                {post.formattedDate}
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock3 className="h-4 w-4" />
                {post.readingTime}
              </span>
            </div>
          </div>
        </div>

        <article className="blog-prose mt-14">{post.content}</article>

        <div className="mx-auto mt-16 max-w-3xl rounded-[1.75rem] border border-white/10 bg-white/[0.03] px-6 py-6 text-on-surface-variant shadow-[0_18px_60px_rgba(4,8,20,0.24)]">
          <p className="blog-eyebrow text-primary/80">Need implementation help?</p>
          <h2 className="mt-3 font-headline text-2xl font-semibold tracking-tight text-on-surface">
            Turn the guide into a working system.
          </h2>
          <p className="mt-3 leading-8">
            OpsRadar designs, ships, and maintains the automation layer behind sales ops,
            onboarding, reporting, and AI handoffs.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/audit"
              className="inline-flex items-center justify-center rounded-full bg-primary-container px-5 py-3 text-sm font-semibold text-on-primary-container transition hover:bg-primary-container/80"
            >
              Start a free audit
            </Link>
            <Link
              href="/blog"
              className="inline-flex items-center justify-center rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-on-surface transition hover:border-primary/30 hover:text-primary"
            >
              Browse more guides
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
