import 'react';

declare module 'react' {
  namespace JSX {
    // Web components that are not React yet
    interface IntrinsicElements {
      'compose-post': object;
      'post-list': { instance?: string };
    }
  }
}
