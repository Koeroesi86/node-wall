declare module 'match-all' {
  interface MatchAll {
    toArray(): string[];
  }

  export default function matchAll(input: string, regex: RegExp): MatchAll;
}
