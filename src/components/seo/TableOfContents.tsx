/**
 * TableOfContents - Auto-generated table of contents for long-form content
 * 
 * This component analyzes content and creates a structured table of contents
 * for better UX and SEO. It helps with content structure and navigation.
 */

import { useState, useEffect } from "react";
import { List, ChevronRight, Menu } from "lucide-react";

interface TOCItem {
  id: string;
  text: string;
  level: number;
  children?: TOCItem[];
}

interface TableOfContentsProps {
  content: string;
  className?: string;
  maxDepth?: number;
  title?: string;
  showOnMobile?: boolean;
}

export function TableOfContents({
  content,
  className = "",
  maxDepth = 3,
  title = "İçindekiler",
  showOnMobile = false,
}: TableOfContentsProps) {
  const [tocItems, setTocItems] = useState<TOCItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const items = extractHeadings(content, maxDepth);
    setTocItems(items);
  }, [content, maxDepth]);

  useEffect(() => {
    // IntersectionObserver ile aktif başlığı takip et — getBoundingClientRect döngüsü yok,
    // scroll listener yok → sıfır forced reflow.
    const headings = Array.from(
      document.querySelectorAll<HTMLElement>("h1, h2, h3, h4")
    ).filter((el) => el.id);

    if (!headings.length) return;

    // rootMargin: üstten 0-100px arası görünür olduğunda aktif say
    const observer = new IntersectionObserver(
      (entries) => {
        // Görünür olan başlıklar arasından en üstteki (en küçük y) aktif
        const visible = entries
          .filter((e) => e.isIntersecting)
          .map((e) => e.target as HTMLElement);

        if (visible.length > 0) {
          // Doküman sırasına göre en üstteki başlığı seç
          const topmost = visible.reduce((a, b) =>
            a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? a : b
          );
          setActiveId(topmost.id);
        }
      },
      {
        rootMargin: "-10px 0px -80% 0px", // başlık viewportun üst %20'sine girince tetikle
        threshold: 0,
      }
    );

    headings.forEach((h) => observer.observe(h));

    return () => observer.disconnect();
  }, [tocItems]); // tocItems değişince başlıkları yeniden tara

  if (tocItems.length === 0) return null;

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      // scrollIntoView — tarayıcı iç layout hesabı yapar, JS forced reflow yok
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className={`toc-container ${className}`}>
      {/* Mobile Toggle */}
      {showOnMobile && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="lg:hidden flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-4"
        >
          <Menu className="w-4 h-4" />
          <span>{title}</span>
          <ChevronRight
            className={`w-4 h-4 transition-transform ${isOpen ? "rotate-90" : ""}`}
          />
        </button>
      )}

      {/* Desktop TOC */}
      <div
        className={`${
          showOnMobile && !isOpen ? "hidden" : "block"
        } lg:block sticky top-24`}
      >
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-zinc-200 mb-3 flex items-center gap-2">
            <List className="w-4 h-4 text-purple-400" />
            {title}
          </h3>
          <nav>
            <ul className="space-y-1">
              {tocItems.map((item) => (
                <TOCItem
                  key={item.id}
                  item={item}
                  isActive={activeId === item.id}
                  onClick={() => scrollToHeading(item.id)}
                />
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
}

function TOCItem({
  item,
  isActive,
  onClick,
  level = 0,
}: {
  item: TOCItem;
  isActive: boolean;
  onClick: () => void;
  level?: number;
}) {
  const paddingLeft = level * 12;

  return (
    <li>
      <button
        onClick={onClick}
        className={`w-full text-left text-xs py-1.5 px-2 rounded transition-colors flex items-start gap-2 ${
          isActive
            ? "bg-purple-500/10 text-purple-300 font-medium"
            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
        }`}
        style={{ paddingLeft: `${paddingLeft + 8}px` }}
      >
        <span className="truncate">{item.text}</span>
      </button>
      {item.children && item.children.length > 0 && (
        <ul className="mt-1">
          {item.children.map((child) => (
            <TOCItem
              key={child.id}
              item={child}
              isActive={isActive}
              onClick={() => {}}
              level={level + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * Extract headings from content and generate TOC structure
 */
export function extractHeadings(content: string, maxDepth: number = 3): TOCItem[] {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const items: TOCItem[] = [];
  const stack: TOCItem[] = [];
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const hashes = match[1] ?? "";
    const text = (match[2] ?? "").trim();
    if (!text) continue;

    const level = hashes.length;
    const id = generateHeadingId(text);

    if (level > maxDepth) continue;

    const item: TOCItem = { id, text, level };

    // Remove items from stack that are at or below current level
    while (stack.length > 0 && (stack[stack.length - 1]?.level ?? 0) >= level) {
      stack.pop();
    }

    if (stack.length === 0) {
      items.push(item);
    } else {
      const parent = stack[stack.length - 1];
      if (parent) {
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(item);
      } else {
        items.push(item);
      }
    }

    stack.push(item);
  }

  return items;
}

/**
 * Generate SEO-friendly heading ID from text
 */
export function generateHeadingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .trim();
}

/**
 * Auto-generate heading IDs in content
 * This function can be used to add IDs to headings in content
 */
export function addHeadingIds(content: string): string {
  return content.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, text) => {
    const id = generateHeadingId(text);
    return `${hashes} ${text} {#${id}}`;
  });
}

/**
 * Estimate if content needs TOC based on length and heading count
 */
export function shouldShowTOC(content: string, minHeadings: number = 3): boolean {
  const headingCount = (content.match(/^#{1,6}\s/gm) || []).length;
  const wordCount = content.trim().split(/\s+/).length;
  
  // Show TOC if content is long enough and has enough headings
  return wordCount > 500 && headingCount >= minHeadings;
}