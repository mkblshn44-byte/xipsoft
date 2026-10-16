import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { isValidElement } from "react";
import NextImage from "next/image";

export default function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-invert max-w-none prose-headings:font-bold prose-a:text-cyan-300 prose-a:no-underline hover:prose-a:underline prose-li:text-zinc-300 prose-p:text-zinc-300 prose-p:leading-8">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeSlug,
          [
            rehypeAutolinkHeadings,
            {
              behavior: "wrap",
              properties: {
                className: ["anchor-link"],
                ariaLabel: "Link to this section",
              },
            },
          ],
        ]}
        components={{
          a: ({ href, children, ...props }) => {
            // Security: only allow http/https/mailto/tel protocols
            if (href) {
              const allowedProtocols = ["http:", "https:", "mailto:", "tel:"];
              const protocol = href.split(":")[0] + ":";
              if (!allowedProtocols.includes(protocol)) {
                return <span {...props}>{children}</span>;
              }
            }
            return (
              <a
                href={href}
                target={href?.startsWith("http") ? "_blank" : undefined}
                rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
                {...props}
              >
                {children}
              </a>
            );
          },
          img: ({ src, alt, ...props }) => {
            // Security: validate image URLs
            if (typeof src !== "string" || !src) return null;
            const allowedProtocols = ["http:", "https:", "data:"];
            const protocol = src.split(":")[0] + ":";
            if (!allowedProtocols.includes(protocol)) return null;
            // data: URL'leri next/image desteklemez — fallback olarak <img> bırak
            if (src.startsWith("data:")) {
              return <img src={src} alt={alt || ""} style={{ maxWidth: "100%" }} />;
            }
            return (
              <NextImage
                src={src}
                alt={alt || ""}
                width={800}
                height={450}
                unoptimized
                style={{ maxWidth: "100%", height: "auto" }}
              />
            );
          },
          script: () => null, // Security: prevent script tags
          iframe: () => null, // Security: prevent iframes
          style: () => null, // Security: prevent style tags
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
