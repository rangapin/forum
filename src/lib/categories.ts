export const CATEGORIES = [
  {
    name: "General Discussion",
    slug: "general-discussion",
    color: "bg-gray-100 text-gray-700",
  },
  {
    name: "Training & Technique",
    slug: "training-technique",
    color: "bg-blue-100 text-blue-700",
  },
  {
    name: "Gear & Equipment",
    slug: "gear-equipment",
    color: "bg-green-100 text-green-700",
  },
  {
    name: "Spots & Travel",
    slug: "spots-travel",
    color: "bg-orange-100 text-orange-700",
  },
  {
    name: "Beginner Questions",
    slug: "beginner-questions",
    color: "bg-purple-100 text-purple-700",
  },
] as const;

export function getCategoryBySlug(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug);
}
