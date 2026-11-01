// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // Yazılar "Yazı boyutu" ayarıyla büyüsün diye tek kaynaktan gelir.
    files: ["src/**/*.tsx"],
    ignores: ["src/components/text.tsx"],
    rules: {
      "no-restricted-imports": ["error", { paths: [{ name: "react-native", importNames: ["Text"], message: "Text'i '@/components/text' içinden alın (uygulama yazı boyutu)." }] }],
    },
  },
]);
