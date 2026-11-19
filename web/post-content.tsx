import { Fragment, type ReactNode } from 'react';
import { LinkPreview } from './components/link-preview.tsx';
import { TagInline } from './components/tag-inline.tsx';

const tagReference = /#!([a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12})/;
const url = /(\b(?:https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/i;
const www = /((?:^|[^/])www\.\S+(?:\b|$))/i;

/** Splits text on a pattern with one capture group; the odd entries are what the group captured. */
const split = (text: string, pattern: RegExp) => text.split(new RegExp(pattern, 'gi'));

const withLinks = (text: string, postId: string): ReactNode[] => split(text, url).flatMap<ReactNode>((piece, index) => index % 2
  ? [<LinkPreview href={piece} postId={postId} key={`u${index}`} />]
  : split(piece, www).map((part, wwwIndex) => {
    if (wwwIndex % 2 === 0) return part;
    const [, before, address] = /^([^/]?)(www\..*)$/is.exec(part) ?? [];

    return <Fragment key={`w${index}-${wwwIndex}`}>{before}<LinkPreview href={`https://${address}`} postId={postId} /></Fragment>;
  }));

const withTags = (line: string, postId: string): ReactNode[] => split(line, tagReference).flatMap<ReactNode>((piece, index) => index % 2
  ? [<TagInline tagId={piece} key={`t${index}`} />]
  : withLinks(piece, postId));

const tidy = (content: unknown) => `${content}`.trim().replace(/\n{3,}/gi, '\n\n').split('\n');

/** The server stores `<` as `&lt;`; restore it, since React escapes the text. */
const restore = (line: string) => line.replace(/&lt;/gi, '<');

const Line = ({ line, postId }: { line: string; postId: string }) => {
  const nodes = withTags(restore(line), postId).filter(node => node !== '');

  return <div className="contentLine">{nodes.length ? nodes : '\u00a0'}</div>;
};

/** A post: its lines as text, with the tag references and the links turned into components. */
export const PostContent = ({ content, postId }: { content: unknown; postId: string }) => (
  <>
    {tidy(content).map((line, index) => <Line line={line} postId={postId} key={index} />)}
  </>
);

/** A comment: its lines as plain text. */
export const CommentContent = ({ content }: { content: unknown }) => (
  <>
    {tidy(content).map((line, index) => <div className="line" key={index}>{line || ' '}</div>)}
  </>
);
