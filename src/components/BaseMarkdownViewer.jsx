import PropTypes from "prop-types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";

const BaseMarkdownViewer = ({ content = "" }) => (
	<ReactMarkdown
		remarkPlugins={[remarkGfm]}
		className="markdown-body"
		components={{
			a: ({ children, node: _, ...prps }) => (
				<a {...prps} target="_blank" rel='noopener noreferrer'>
					{children}
				</a>
			),
			code({ node: _, inline, className, children, ...prps }) {
				const match = /language-(\w+)/.exec(className || "");
				return !inline && match ? (
					<SyntaxHighlighter language={match[1]} PreTag="div" {...prps}>
						{String(children).replace(/\n$/, "")}
					</SyntaxHighlighter>
				) : (
					<code className={className} {...prps}>{children}</code>
				);
			},
		}}
	>
		{content}
	</ReactMarkdown>
);

BaseMarkdownViewer.propTypes = { content: PropTypes.string };

export default BaseMarkdownViewer;
