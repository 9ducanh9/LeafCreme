export interface Page<T> {
  items: T[]
  total: number
  skip: number
  limit: number
}
