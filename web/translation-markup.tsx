import { createElement, type ReactNode } from 'react';

/** The markup the translations may use: the elements and, per element, the attributes that are kept. */
const allowed: Record<string, Record<string, string>> = {
  a: { href: 'href', rel: 'rel', target: 'target' },
  br: {},
  button: { type: 'type' },
  form: { action: 'action', method: 'method', class: 'className' },
  h4: {},
  li: {},
  p: {},
  ul: {},
};
const voidElements = ['br'];
const links = ['href', 'action'];
const safeUrl = /^(\/(?!\/)|https?:\/\/|mailto:)/i;

const entities: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': '\'' };
const decode = (text: string) => text.replace(/&(amp|lt|gt|quot|#39);/g, entity => entities[entity]);

const token = /<(\/?)([a-z][a-z0-9]*)((?:\s+[a-z-]+(?:="[^"]*")?)*)\s*(\/?)>/gi;
const attribute = /([a-z-]+)(?:="([^"]*)")?/gi;

interface Node {
  tag: string;
  props: Record<string, string>;
  children: (Node | string)[];
}

const attributesOf = (tag: string, source: string) => Object.fromEntries(
  [...source.matchAll(attribute)]
    .map(([, name, value = '']) => [allowed[tag][name.toLowerCase()], decode(value), name.toLowerCase()] as const)
    .filter(([prop, value, name]) => prop && (!links.includes(name) || safeUrl.test(value)))
    .map(([prop, value]) => [prop, value]),
);

/** Reads the markup into a tree of allowed elements; anything else is dropped (its text is kept). */
const parse = (markup: string): Node => {
  const root: Node = { tag: '', props: {}, children: [] };
  const open: Node[] = [root];
  let last = 0;
  const top = () => open[open.length - 1];

  for (const match of markup.matchAll(token)) {
    const [whole, closing, rawTag, source, selfClosing] = match;
    const tag = rawTag.toLowerCase();
    if (match.index > last) top().children.push(decode(markup.slice(last, match.index)));
    last = match.index + whole.length;

    if (!(tag in allowed)) continue;

    if (closing) {
      const index = open.map(node => node.tag).lastIndexOf(tag);
      if (index > 0) open.length = index;
      continue;
    }

    const node: Node = { tag, props: attributesOf(tag, source), children: [] };
    top().children.push(node);
    if (!selfClosing && !voidElements.includes(tag)) open.push(node);
  }

  if (last < markup.length) top().children.push(decode(markup.slice(last)));

  return root;
};

const toReact = (node: Node | string, key: number): ReactNode => typeof node === 'string'
  ? node
  : createElement(node.tag, { ...node.props, key }, ...(voidElements.includes(node.tag) ? [] : node.children.map(toReact)));

/**
 * A translation as React elements. The text is escaped by React and only the elements above, with
 * their listed attributes and links to this site or http(s)/mailto addresses, are produced, so a
 * translation can never bring in a script or an event handler.
 */
export const renderMarkup = (markup: string): ReactNode[] => parse(markup).children.map(toReact);
