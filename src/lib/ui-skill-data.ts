import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";

type CsvRecord = Record<string, string>;

type CatalogCount = {
  key: string;
  label: string;
  detail: string;
  count: number;
};

type FeaturedStyle = {
  name: string;
  kind: string;
  bestFor: string;
  performance: string;
  accessibility: string;
};

type FeaturedPattern = {
  name: string;
  cta: string;
  sections: string[];
};

export type UiSkillLandingData = {
  totalEntries: number;
  catalog: CatalogCount[];
  featuredStyles: FeaturedStyle[];
  featuredPatterns: FeaturedPattern[];
  stackNames: string[];
};

const DATA_ROOT = path.join(
  process.cwd(),
  "design-libraries/ui-skill/src/ui-ux-pro-max/data",
);

const STACK_LABELS: Record<string, string> = {
  "html-tailwind": "HTML + Tailwind",
  nextjs: "Next.js",
  react: "React",
  astro: "Astro",
  vue: "Vue",
  nuxtjs: "Nuxt.js",
  "nuxt-ui": "Nuxt UI",
  svelte: "Svelte",
  swiftui: "SwiftUI",
  "react-native": "React Native",
  flutter: "Flutter",
  shadcn: "shadcn/ui",
  "jetpack-compose": "Jetpack Compose",
  angular: "Angular",
  laravel: "Laravel",
  threejs: "Three.js",
};

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

async function readCsv(filePath: string): Promise<CsvRecord[]> {
  const raw = await fs.readFile(filePath, "utf8");
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""]),
    );
  });
}

function toDisplayName(fileName: string): string {
  const key = fileName.replace(/\.csv$/i, "");
  return STACK_LABELS[key] ?? key.replace(/-/g, " ");
}

function splitSections(order: string): string[] {
  return order
    .split(",")
    .map((part) => part.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3);
}

export const getUiSkillLandingData = cache(async (): Promise<UiSkillLandingData> => {
  const [
    styles,
    colors,
    typography,
    landing,
    charts,
    ux,
    stackFiles,
  ] = await Promise.all([
    readCsv(path.join(DATA_ROOT, "styles.csv")),
    readCsv(path.join(DATA_ROOT, "colors.csv")),
    readCsv(path.join(DATA_ROOT, "typography.csv")),
    readCsv(path.join(DATA_ROOT, "landing.csv")),
    readCsv(path.join(DATA_ROOT, "charts.csv")),
    readCsv(path.join(DATA_ROOT, "ux-guidelines.csv")),
    fs.readdir(path.join(DATA_ROOT, "stacks")),
  ]);

  const catalog: CatalogCount[] = [
    {
      key: "styles",
      label: "Visual Style Entries",
      detail: "General UI, landing, and dashboard directions",
      count: styles.length,
    },
    {
      key: "colors",
      label: "Color Palettes",
      detail: "Industry-aligned palettes tied to product categories",
      count: colors.length,
    },
    {
      key: "type",
      label: "Font Pairings",
      detail: "Curated typography combinations with implementation guidance",
      count: typography.length,
    },
    {
      key: "landing",
      label: "Landing Patterns",
      detail: "Conversion, demo, trust, and storytelling structures",
      count: landing.length,
    },
    {
      key: "charts",
      label: "Chart Types",
      detail: "Analytics, BI, and operations chart recommendations",
      count: charts.length,
    },
    {
      key: "ux",
      label: "UX Guidelines",
      detail: "Accessibility, anti-patterns, and implementation checks",
      count: ux.length,
    },
  ];

  const featuredStyles: FeaturedStyle[] = styles.slice(0, 4).map((record) => ({
    name: record["Style Category"] ?? "Unknown style",
    kind: record.Type || "General",
    bestFor: record["Best For"] || "General interfaces",
    performance: record.Performance || "Not specified",
    accessibility: record.Accessibility || "Not specified",
  }));

  const featuredPatterns: FeaturedPattern[] = landing.slice(0, 4).map((record) => ({
    name: record["Pattern Name"] ?? "Unknown pattern",
    cta: record["Primary CTA Placement"] || "Not specified",
    sections: splitSections(record["Section Order"] || ""),
  }));

  const stackNames = stackFiles
    .filter((fileName) => fileName.endsWith(".csv"))
    .map(toDisplayName)
    .sort((left, right) => left.localeCompare(right));

  return {
    totalEntries: catalog.reduce((sum, item) => sum + item.count, 0),
    catalog,
    featuredStyles,
    featuredPatterns,
    stackNames,
  };
});
