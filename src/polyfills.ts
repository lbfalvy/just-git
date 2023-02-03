export function at<T>(this: T[], i: number): T|undefined {
  if (0 <= i) return this[i]
  return this[this.length + i]
}

Array.prototype.at = Array.prototype.at ?? at;