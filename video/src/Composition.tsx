import {
  AbsoluteFill,
  Img,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";
import React from "react";

const FONT_STACK =
  '"Inter", "Helvetica Neue", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

type KenBurns = {
  fromScale: number;
  toScale: number;
  fromX?: number;
  toX?: number;
  fromY?: number;
  toY?: number;
};

type SceneProps = {
  src: string;
  durationInFrames: number;
  fadeInFrames?: number;
  fadeOutFrames?: number;
  kenBurns?: KenBurns;
  focalY?: string;
};

const Scene: React.FC<SceneProps> = ({
  src,
  durationInFrames,
  fadeInFrames = 20,
  fadeOutFrames = 20,
  kenBurns = { fromScale: 1.08, toScale: 1.18 },
  focalY = "50%",
}) => {
  const frame = useCurrentFrame();

  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.ease),
  });

  const scale = interpolate(
    progress,
    [0, 1],
    [kenBurns.fromScale, kenBurns.toScale],
  );
  const tx = interpolate(
    progress,
    [0, 1],
    [kenBurns.fromX ?? 0, kenBurns.toX ?? 0],
  );
  const ty = interpolate(
    progress,
    [0, 1],
    [kenBurns.fromY ?? 0, kenBurns.toY ?? 0],
  );

  const opacity = interpolate(
    frame,
    [
      0,
      fadeInFrames,
      durationInFrames - fadeOutFrames,
      durationInFrames,
    ],
    [0, 1, 1, 0],
    { extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ opacity, backgroundColor: "#000" }}>
      <AbsoluteFill
        style={{
          transform: `scale(${scale}) translate(${tx}%, ${ty}%)`,
          transformOrigin: `50% ${focalY}`,
        }}
      >
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: `center ${focalY}`,
          }}
        />
      </AbsoluteFill>

      {/* Vignette + top/bottom gradient for text legibility */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)",
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 25%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.55) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};

type OverlayTextProps = {
  children: React.ReactNode;
  style?: React.CSSProperties;
  durationInFrames: number;
  fadeFrames?: number;
  translateY?: number;
};

const OverlayText: React.FC<OverlayTextProps> = ({
  children,
  style,
  durationInFrames,
  fadeFrames = 15,
  translateY = 12,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, fadeFrames, durationInFrames - fadeFrames, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateRight: "clamp" },
  );
  const y = interpolate(frame, [0, fadeFrames], [translateY, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `translateY(${y}px)`,
        fontFamily: FONT_STACK,
        color: "#fff",
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

// Subtle animated film grain using layered noise SVG
const FilmGrain: React.FC = () => {
  const frame = useCurrentFrame();
  const seed = (frame % 8) + 1; // shift grain each frame
  const svg = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'>
      <filter id='n'>
        <feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='${seed}' stitchTiles='stitch'/>
        <feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.35 0'/>
      </filter>
      <rect width='100%' height='100%' filter='url(%23n)'/>
    </svg>`,
  )}`;
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `url("${svg}")`,
        backgroundSize: "300px 300px",
        mixBlendMode: "overlay",
        opacity: 0.18,
        pointerEvents: "none",
      }}
    />
  );
};

export const MyComposition: React.FC = () => {
  const { fps } = useVideoConfig();

  // Scene timing (frames). Crossfades use overlap via "from + durationInFrames" with opacity fades.
  const s = (sec: number) => Math.round(sec * fps);

  // Total = 30s. Scene durations overlap slightly so fades crossfade cleanly.
  const scenes = [
    // 0-5s Opening: calm selfie (mindset)
    { from: s(0), dur: s(5), src: "selfie.jpg", kb: { fromScale: 1.1, toScale: 1.22, fromY: 1, toY: -1 } },
    // 4.5-9.5s Handstand outdoors
    { from: s(4.5), dur: s(5), src: "handstand.jpg", kb: { fromScale: 1.15, toScale: 1.0, fromY: -2, toY: 1 } },
    // 9-13.5s Side profile physique
    { from: s(9), dur: s(4.5), src: "side-profile.jpg", kb: { fromScale: 1.05, toScale: 1.2, fromX: 1, toX: -1 } },
    // 13-17s Portrait arms crossed (strength)
    { from: s(13), dur: s(4), src: "portrait-arms.jpg", kb: { fromScale: 1.22, toScale: 1.08 } },
    // 16.5-21s Side profile closeup (detail)
    { from: s(16.5), dur: s(4.5), src: "side-profile-2.jpg", kb: { fromScale: 1.08, toScale: 1.2, fromY: -1, toY: 2 } },
    // 20.5-25s T-shirt outdoor (brand build)
    { from: s(20.5), dur: s(4.5), src: "tshirt-outdoor.jpg", kb: { fromScale: 1.18, toScale: 1.02 } },
    // 24-30s Brand reveal (moody ASPYR)
    { from: s(24), dur: s(6), src: "aspyr-moody.jpg", kb: { fromScale: 1.1, toScale: 1.2 } },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {scenes.map((sc, i) => (
        <Sequence
          key={i}
          from={sc.from}
          durationInFrames={sc.dur}
          premountFor={fps}
          layout="none"
        >
          <Scene
            src={staticFile(`images/${sc.src}`)}
            durationInFrames={sc.dur}
            kenBurns={sc.kb}
          />
        </Sequence>
      ))}

      {/* Text overlays */}
      <Sequence from={s(1)} durationInFrames={s(3.5)} layout="none">
        <OverlayText
          durationInFrames={s(3.5)}
          style={{
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 200,
              letterSpacing: 14,
              textTransform: "uppercase",
              textShadow: "0 2px 20px rgba(0,0,0,0.5)",
            }}
          >
            Hybrid Athlete
          </div>
        </OverlayText>
      </Sequence>

      <Sequence from={s(9.5)} durationInFrames={s(3.5)} layout="none">
        <OverlayText
          durationInFrames={s(3.5)}
          style={{
            justifyContent: "flex-end",
            alignItems: "center",
            paddingBottom: 220,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 300,
              letterSpacing: 10,
              textTransform: "uppercase",
              textShadow: "0 2px 18px rgba(0,0,0,0.6)",
            }}
          >
            Marathon + Strength
          </div>
        </OverlayText>
      </Sequence>

      <Sequence from={s(13.5)} durationInFrames={s(3.5)} layout="none">
        <OverlayText
          durationInFrames={s(3.5)}
          style={{
            justifyContent: "flex-end",
            alignItems: "center",
            paddingBottom: 240,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 56,
              fontWeight: 300,
              letterSpacing: 4,
              fontStyle: "italic",
              textShadow: "0 2px 14px rgba(0,0,0,0.7)",
            }}
          >
            Built through miles and reps
          </div>
        </OverlayText>
      </Sequence>

      {/* Brand reveal — main announcement */}
      <Sequence from={s(24.2)} durationInFrames={s(3.8)} layout="none">
        <OverlayText
          durationInFrames={s(3.8)}
          style={{
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            padding: "0 80px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 52,
                fontWeight: 300,
                letterSpacing: 2,
                lineHeight: 1.35,
                color: "#f5f5f5",
                textShadow: "0 2px 18px rgba(0,0,0,0.75)",
              }}
            >
              I&apos;m proud to announce I&apos;m officially an
            </div>
            <div
              style={{
                fontSize: 130,
                fontWeight: 700,
                letterSpacing: 22,
                marginTop: 28,
                color: "#fff",
                textShadow: "0 2px 22px rgba(0,0,0,0.85)",
              }}
            >
              ASPYR
            </div>
            <div
              style={{
                fontSize: 42,
                fontWeight: 300,
                letterSpacing: 10,
                textTransform: "uppercase",
                color: "#ccc",
                marginTop: 6,
              }}
            >
              Athlete
            </div>
          </div>
        </OverlayText>
      </Sequence>

      {/* Promo code */}
      <Sequence from={s(27.8)} durationInFrames={s(2.2)} layout="none">
        <OverlayText
          durationInFrames={s(2.2)}
          fadeFrames={12}
          style={{
            justifyContent: "flex-end",
            alignItems: "center",
            paddingBottom: 220,
            textAlign: "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 36,
                fontWeight: 300,
                letterSpacing: 4,
                color: "#e0e0e0",
                textShadow: "0 2px 12px rgba(0,0,0,0.7)",
              }}
            >
              Use code
            </div>
            <div
              style={{
                fontSize: 92,
                fontWeight: 700,
                letterSpacing: 10,
                color: "#fff",
                marginTop: 10,
                textShadow: "0 2px 18px rgba(0,0,0,0.8)",
              }}
            >
              TEODOR10
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 300,
                letterSpacing: 3,
                color: "#bbb",
                marginTop: 12,
              }}
            >
              for 10% off
            </div>
          </div>
        </OverlayText>
      </Sequence>

      {/* Film grain overlay — whole video */}
      <FilmGrain />

      {/* Opening + closing black fades */}
      <OpeningBlackFade />
    </AbsoluteFill>
  );
};

const OpeningBlackFade: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const opacity = interpolate(
    frame,
    [0, 20, durationInFrames - 25, durationInFrames],
    [1, 0, 0, 1],
    { extrapolateRight: "clamp" },
  );
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#000",
        opacity,
        pointerEvents: "none",
      }}
    />
  );
};
