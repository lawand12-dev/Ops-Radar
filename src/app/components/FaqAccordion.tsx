'use client'

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '<npm>/components/ui/accordion'

type FaqEntry = { q: string; a: string }

export default function FaqAccordion({ faqs }: { faqs: FaqEntry[] }) {
  return (
    <Accordion type="single" collapsible className="space-y-3">
      {faqs.map(({ q, a }) => (
        <AccordionItem
          key={q}
          value={q}
          className="rounded-xl bg-surface-container border border-outline-variant/10 hover:border-outline-variant/25 transition-colors duration-200 px-6 not-last:border-b-0"
        >
          <AccordionTrigger className="font-headline font-semibold text-[15px] text-on-surface py-5 hover:no-underline leading-snug">
            {q}
          </AccordionTrigger>
          <AccordionContent className="text-sm text-on-surface-variant leading-relaxed pb-5">
            <div className="h-px bg-outline-variant/10 mb-4" />
            {a}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
