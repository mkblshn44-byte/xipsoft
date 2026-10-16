/**
 * FeaturedSnippet - Optimized content for Google Featured Snippets
 * 
 * This component creates a structured answer box in the first 40-60 words
 * of content to optimize for featured snippets and AI Overviews.
 * 
 * Best practices:
 * - Place near the top of the content
 * - Directly answer the main question
 * - Use clear, concise language
 * - Include key entities and facts
 * - Keep under 60 words for optimal snippet capture
 */

interface FeaturedSnippetProps {
  question: string;
  answer: string;
  className?: string;
}

export function FeaturedSnippet({ question, answer, className = "" }: FeaturedSnippetProps) {
  return (
    <div className={`featured-snippet-container my-6 p-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-lg ${className}`}>
      <h3 className="text-lg font-semibold text-indigo-300 mb-2">{question}</h3>
      <p className="text-zinc-300 leading-relaxed">
        {answer}
      </p>
    </div>
  );
}

/**
 * ExtractFeaturedSnippet - Utility to extract or generate featured snippet content
 * 
 * This helps create optimized answers from longer content or generates
 * structured answers for blog posts.
 */
export function extractFeaturedSnippet(content: string, maxLength: number = 60): string {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  // Try to find a good candidate sentence (first sentence that's not too short)
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.length >= 20 && trimmed.length <= maxLength) {
      return trimmed;
    }
  }
  
  // Fallback: first sentence truncated if needed
  const firstSentence = sentences[0]?.trim() || "";
  if (firstSentence.length > maxLength) {
    return firstSentence.substring(0, maxLength - 3) + "...";
  }
  
  return firstSentence;
}

/**
 * FeaturedSnippetSchema - JSON-LD schema for FAQPage
 * 
 * This helps Google understand the Q&A structure for rich results.
 */
export function featuredSnippetSchema(question: string, answer: string) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": answer
        }
      }
    ]
  };
}