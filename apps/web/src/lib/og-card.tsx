import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ImageResponse } from "next/og";
import { sweetThemes } from "@sezi/shared";

/** Paylaşım görseli. Renkler `sweetThemes.light` ("Sezi kâğıt"); başlık Fraunces, alt yazı Atkinson; sabit palet yok. */
const theme = sweetThemes.light;

export const ogSize = { width: 1200, height: 630 };

const assetsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../assets");

function pngSize(buf: Buffer) {
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

async function loadAssets() {
  const [fraunces, atkinson, wordmark] = await Promise.all([
    readFile(path.join(assetsDir, "fonts/Fraunces-Regular.ttf")),
    readFile(path.join(assetsDir, "fonts/AtkinsonHyperlegibleNext-Regular.ttf")),
    readFile(path.join(assetsDir, "brand/wordmark.png")),
  ]);
  return { fraunces, atkinson, wordmark, ...pngSize(wordmark) };
}

export async function ogCard(title: string, subtitle?: string) {
  const { fraunces, atkinson, wordmark, width, height } = await loadAssets();
  const logoSrc = `data:image/png;base64,${wordmark.toString("base64")}`;
  const titleSize = title.length > 42 ? 52 : title.length > 26 ? 64 : 80;
  const logoWidth = title === "Sezi" ? 520 : 340;
  const logoHeight = Math.max(1, Math.round((logoWidth * height) / width));

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        backgroundColor: theme.background,
        color: theme.text,
      }}
    >
      <div style={{ width: 28, height: "100%", backgroundColor: theme.gold.fill }} />
      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          justifyContent: "center",
          padding: "56px 72px",
          gap: 28,
        }}
      >
        <img src={logoSrc} width={logoWidth} height={logoHeight} alt="" />
        <div
          style={{
            display: "flex",
            width: 980,
            fontFamily: "Fraunces",
            fontSize: titleSize,
            fontWeight: 400,
            lineHeight: 1.05,
            letterSpacing: -1.5,
            color: theme.text,
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div
            style={{
              display: "flex",
              width: 900,
              fontFamily: "Atkinson",
              fontSize: 32,
              lineHeight: 1.35,
              color: theme.textMuted,
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>,
    {
      ...ogSize,
      fonts: [
        { name: "Fraunces", data: fraunces, weight: 400, style: "normal" },
        { name: "Atkinson", data: atkinson, weight: 400, style: "normal" },
      ],
    },
  );
}
