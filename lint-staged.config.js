export default {
  "*.{js,ts,cjs,mjs,d.cts,d.mts,jsx,tsx,json,jsonc,yaml,yml,md,html,css,scss,less,vue,svelte}":
    [
      "bunx biome check --write --no-errors-on-unmatched --files-ignore-unknown=true --colors=off",
    ],
  "*.rs": ["rustfmt"],
};
