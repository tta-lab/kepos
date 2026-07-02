export type ProductSurfaceId = 'chat' | 'dm' | 'treehole' | 'people'

export type ProductSurface = {
  id: ProductSurfaceId
  label: string
  title: string
}

export const productSurfaceTabs: ProductSurface[] = [
  {
    id: 'chat',
    label: 'Home',
    title: 'Home chat'
  },
  {
    id: 'dm',
    label: 'Chat',
    title: 'Chat'
  },
  {
    id: 'people',
    label: 'Contacts',
    title: 'Contacts'
  },
  {
    id: 'treehole',
    label: 'Treehole',
    title: 'Treehole'
  }
]

const DEFAULT_PRODUCT_SURFACE_ID: ProductSurfaceId = 'people'

export function getProductSurfaceLabel(surfaceId?: string | null): string {
  return readProductSurface(surfaceId).label
}

export function getProductSurfaceTitle(surfaceId?: string | null): string {
  return readProductSurface(surfaceId).title
}

function readProductSurface(surfaceId?: string | null): ProductSurface {
  return (
    productSurfaceTabs.find((surface) => surface.id === surfaceId) ||
    productSurfaceTabs.find((surface) => surface.id === DEFAULT_PRODUCT_SURFACE_ID) ||
    productSurfaceTabs[0]
  )
}
