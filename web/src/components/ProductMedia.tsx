import Image from 'next/image'

import { CategoryIcon } from '@/components/icons'

interface Props {
  name: string
  image?: string
  categorySlug: string
  sizes: string
  priority?: boolean
}

/** Изображение товара или аккуратная заглушка с иконкой категории. */
export function ProductMedia({ name, image, categorySlug, sizes, priority }: Props) {
  if (image?.startsWith('/')) {
    return <Image src={image} alt={name} fill sizes={sizes} priority={priority} style={{ objectFit: 'contain', padding: 16 }} />
  }
  if (image?.startsWith('https://')) {
    // Внешние изображения (например, от партнёров) показываем без оптимизации,
    // чтобы не открывать сервер оптимизации изображений для любых доменов.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt={name} loading={priority ? 'eager' : 'lazy'} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', padding: 16 }} />
  }
  return (
    <div className="media-placeholder" role="img" aria-label={`${name} — изображение появится позже`}>
      <CategoryIcon slug={categorySlug} />
    </div>
  )
}
