import { promises as fs } from 'node:fs'
import path from 'node:path'

import matter from 'gray-matter'
import { compileMDX } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import { cache, type ReactElement } from 'react'

import { blogMdxComponents } from '<npm>/components/blog/mdx-components'

const BLOG_DIRECTORY = path.join(process.cwd(), 'content', 'blog')

type BlogFrontmatterInput = {
  title?: unknown
  description?: unknown
  date?: unknown
  categories?: unknown
  featured?: unknown
  published?: unknown
}

export type BlogFrontmatter = {
  title: string
  description: string
  date: string
  categories: string[]
  featured: boolean
  published: boolean
}

export type BlogPostSummary = BlogFrontmatter & {
  slug: string
  formattedDate: string
  readingTime: string
}

export type BlogPost = BlogPostSummary & {
  content: ReactElement
}

function parseBlogDate(date: string) {
  const [year, month, day] = date.split('-').map(Number)

  if (!year || !month || !day) {
    throw new Error(`Invalid blog date "${date}". Use YYYY-MM-DD.`)
  }

  const parsedDate = new Date(Date.UTC(year, month - 1, day))

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error(`Invalid blog date "${date}".`)
  }

  return parsedDate
}

function normalizeCategories(categories: unknown) {
  if (Array.isArray(categories)) {
    return categories
      .filter((category): category is string => typeof category === 'string')
      .map((category) => category.trim())
      .filter(Boolean)
  }

  if (typeof categories === 'string' && categories.trim().length > 0) {
    return [categories.trim()]
  }

  return []
}

function normalizeDate(date: unknown, slug: string) {
  if (typeof date === 'string' && date.trim().length > 0) {
    return date.trim()
  }

  if (date instanceof Date && !Number.isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10)
  }

  throw new Error(`Blog post "${slug}" is missing a valid date.`)
}

function normalizeFrontmatter(input: BlogFrontmatterInput, slug: string): BlogFrontmatter {
  if (typeof input.title !== 'string' || input.title.trim().length === 0) {
    throw new Error(`Blog post "${slug}" is missing a valid title.`)
  }

  if (typeof input.description !== 'string' || input.description.trim().length === 0) {
    throw new Error(`Blog post "${slug}" is missing a valid description.`)
  }

  const categories = normalizeCategories(input.categories)

  if (categories.length === 0) {
    throw new Error(`Blog post "${slug}" must include at least one category.`)
  }

  const normalizedDate = normalizeDate(input.date, slug)
  parseBlogDate(normalizedDate)

  return {
    title: input.title.trim(),
    description: input.description.trim(),
    date: normalizedDate,
    categories,
    featured: input.featured === true,
    published: input.published !== false,
  }
}

function formatPostDate(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parseBlogDate(date))
}

function estimateReadingTime(content: string) {
  const plainText = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, ' $1 ')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, ' $1 ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, ' $1 ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/[>#*_~-]/g, ' ')
    .replace(/\n+/g, ' ')

  const words = plainText.split(/\s+/).filter(Boolean).length
  const minutes = Math.max(1, Math.ceil(words / 220))

  return `${minutes} min read`
}

async function getBlogFileNames() {
  try {
    const entries = await fs.readdir(BLOG_DIRECTORY, { withFileTypes: true })

    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.mdx'))
      .map((entry) => entry.name)
  } catch (error) {
    const fileError = error as NodeJS.ErrnoException

    if (fileError.code === 'ENOENT') {
      return []
    }

    throw error
  }
}

function getPostPath(slug: string) {
  return path.join(BLOG_DIRECTORY, `${slug}.mdx`)
}

async function readBlogPostSource(slug: string) {
  try {
    return await fs.readFile(getPostPath(slug), 'utf8')
  } catch (error) {
    const fileError = error as NodeJS.ErrnoException

    if (fileError.code === 'ENOENT') {
      return null
    }

    throw error
  }
}

function sortPosts(posts: BlogPostSummary[]) {
  return [...posts].sort((left, right) => {
    if (left.featured !== right.featured) {
      return Number(right.featured) - Number(left.featured)
    }

    return parseBlogDate(right.date).getTime() - parseBlogDate(left.date).getTime()
  })
}

export const getAllBlogPosts = cache(async (): Promise<BlogPostSummary[]> => {
  const fileNames = await getBlogFileNames()

  const posts = await Promise.all(
    fileNames.map(async (fileName) => {
      const slug = fileName.replace(/\.mdx$/, '')
      const source = await fs.readFile(path.join(BLOG_DIRECTORY, fileName), 'utf8')
      const { data, content } = matter(source)
      const frontmatter = normalizeFrontmatter(data as BlogFrontmatterInput, slug)

      if (!frontmatter.published) {
        return null
      }

      return {
        slug,
        ...frontmatter,
        formattedDate: formatPostDate(frontmatter.date),
        readingTime: estimateReadingTime(content),
      }
    })
  )

  return sortPosts(posts.filter((post): post is BlogPostSummary => post !== null))
})

export const getBlogPost = cache(async (slug: string): Promise<BlogPost | null> => {
  const source = await readBlogPostSource(slug)

  if (!source) {
    return null
  }

  const { data, content: rawContent } = matter(source)
  const frontmatter = normalizeFrontmatter(data as BlogFrontmatterInput, slug)

  if (!frontmatter.published) {
    return null
  }

  const { content } = await compileMDX<BlogFrontmatter>({
    source,
    components: blogMdxComponents,
    options: {
      parseFrontmatter: true,
      blockJS: false,
      mdxOptions: {
        remarkPlugins: [remarkGfm],
      },
    },
  })

  return {
    slug,
    ...frontmatter,
    formattedDate: formatPostDate(frontmatter.date),
    readingTime: estimateReadingTime(rawContent),
    content,
  }
})
