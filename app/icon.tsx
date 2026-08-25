import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";
export const revalidate = false;

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0a0a0a",
          width: "100%",
          height: "100%",
          borderRadius: "112px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontFamily: "Arial, sans-serif",
            fontSize: 380,
            color: "white",
            fontWeight: 900,
            lineHeight: 1,
          }}
        >
          S
        </span>
      </div>
    ),
    size
  );
}
