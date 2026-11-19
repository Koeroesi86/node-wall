import 'react';

declare module 'react' {
  namespace JSX {
    // Web components that are not React yet
    interface IntrinsicElements {
      'post-editor': object;
      'translate-text': { alias?: string };
      'post-list': { instance?: string };
    }
  }
}
