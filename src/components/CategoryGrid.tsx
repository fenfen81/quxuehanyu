import { categories } from '@/data/content'
import type { CategorySlug } from '@/types'
import type { Lang } from '@/i18n/translations'
import { t } from '@/i18n/translations'

interface CategoryGridProps {
  onSelectCategory: (slug: CategorySlug) => void
  lang: Lang
}

export function CategoryGrid({ onSelectCategory, lang }: CategoryGridProps) {
  const descMap: Record<string, ReturnType<typeof t>> = {
    comprehensive: t('cat_comprehensive_desc', lang),
    hsk: t('cat_hsk_desc', lang),
    oral: t('cat_oral_desc', lang),
    vocational: t('cat_vocational_desc', lang),
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5">
      {categories.map((cat, i) => {
        return (
          <button
            key={cat.slug}
            onClick={() => onSelectCategory(cat.slug)}
            className="group bg-white rounded-2xl p-5 sm:p-6 text-center cursor-pointer
                       border-2 border-transparent
                       shadow-[0_4px_24px_rgba(108,92,231,0.08)]
                       hover:border-[rgba(108,92,231,0.3)] hover:-translate-y-1
                       hover:shadow-[0_8px_32px_rgba(108,92,231,0.15)]
                       transition-all duration-250 animate-slide-up"
            style={{ animationDelay: `${i * 0.06 + 0.15}s`, animationFillMode: 'both' }}
          >
            <div className="text-[36px] mb-3">{cat.icon}</div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800">{lang === 'en' ? cat.nameEn : cat.name}</h3>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: '#A69BBF' }}>{descMap[cat.slug]}</p>
          </button>
        )
      })}
    </div>
  )
}
