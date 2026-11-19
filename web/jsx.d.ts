import type { ClassAttributes } from 'react';

type CustomElement<Props = object> = Props & ClassAttributes<HTMLElement>;

declare module 'react' {
  namespace JSX {
    // Web components that are not React yet
    interface IntrinsicElements {
      'post-editor': CustomElement;
      'translate-text': CustomElement<{ alias?: string }>;
      'post-preview': CustomElement<{ 'post-id'?: string }>;
    }
  }
}
