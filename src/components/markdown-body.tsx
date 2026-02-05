import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

export default function MarkdownBody({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none text-gray-800">
      <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
