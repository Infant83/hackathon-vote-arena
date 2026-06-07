import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  deckSlides,
  type DeckCard,
  type DeckRect,
  type DeckRow,
  type DeckSlide,
} from "./deckData";

export const FPS = 30;
export const SLIDE_DURATION = 180;
export const TOTAL_DURATION = deckSlides.length * SLIDE_DURATION;

const colors = {
  red: "#A50034",
  activeRed: "#FD312E",
  ink: "#202124",
  body: "#4A4A4F",
  muted: "#7B7B82",
  surface: "#FFFFFF",
  canvas: "#F7F7F8",
  line: "#E7E5E5",
  night: "#07142F",
  blue: "#3F63FF",
  cyan: "#087F8C",
  green: "#197B50",
  violet: "#7A3FF2",
  amber: "#C47D00",
};

const toneColor: Record<DeckCard["tone"], string> = {
  red: colors.red,
  blue: colors.blue,
  green: colors.green,
  violet: colors.violet,
  amber: colors.amber,
};

const defaultCanvas = {
  title: { x: 92, y: 94, w: 1540, h: 150 },
  subtitle: { x: 92, y: 250, w: 1360, h: 90 },
  content: { x: 92, y: 386, w: 1736, h: 560 },
  heroContent: { x: 110, y: 496, w: 1180, h: 480 },
};

const closingCanvas = {
  content: { x: 92, y: 150, w: 1736, h: 790 },
};

const rectStyle = (
  rect: DeckRect | undefined,
  fallback: DeckRect,
): CSSProperties => {
  const target = rect ?? fallback;

  return {
    position: "absolute",
    left: target.x,
    top: target.y,
    width: target.w,
    minHeight: target.h,
  };
};

export const VibeVoteArenaDeck = () => {
  return (
    <AbsoluteFill style={styles.composition}>
      <DeckBackdrop />
      {deckSlides.map((slide, index) => (
        <Sequence
          key={slide.kicker}
          from={index * SLIDE_DURATION}
          durationInFrames={SLIDE_DURATION}
          hidden
        >
          <SlideScene slide={slide} index={index} total={deckSlides.length} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

const DeckBackdrop = () => {
  return (
    <AbsoluteFill style={styles.backdrop}>
      <div style={styles.ribbonOne} />
      <div style={styles.ribbonTwo} />
      <div style={styles.gridTexture} />
    </AbsoluteFill>
  );
};

const SlideScene = ({
  slide,
  index,
  total,
}: {
  slide: DeckSlide;
  index: number;
  total: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(
    frame,
    [0, 18, SLIDE_DURATION - 24, SLIDE_DURATION],
    [0, 1, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    },
  );
  const y = interpolate(frame, [0, 24], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const scale = spring({
    frame,
    fps,
    config: { damping: 180, stiffness: 80, mass: 0.8 },
  });

  return (
    <AbsoluteFill
      style={{
        ...styles.slide,
        opacity,
        transform: `translateY(${y}px) scale(${0.985 + scale * 0.015})`,
      }}
    >
      {slide.layout === "hero" ? (
        <HeroSlide slide={slide} />
      ) : (
        <StandardSlide slide={slide} index={index} total={total} />
      )}
    </AbsoluteFill>
  );
};

const HeroSlide = ({ slide }: { slide: DeckSlide }) => {
  const frame = useCurrentFrame();
  const imageScale = interpolate(frame, [0, SLIDE_DURATION], [1.04, 1.12], {
    extrapolateRight: "clamp",
  });
  const mark = interpolate(frame, [12, 42], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={styles.hero}>
      <Img
        src={staticFile("arena-hero.webp")}
        style={{
          ...styles.heroImage,
          transform: `scale(${imageScale})`,
          rotate: "10deg",
        }}
      />
      <div style={styles.heroShade} />
      <div
        style={{
          ...styles.heroContent,
          ...rectStyle(slide.canvas?.heroContent, defaultCanvas.heroContent),
        }}
      >
        <div
          style={{ ...styles.kickerLine, opacity: mark, width: 220 * mark }}
        />
        <p style={styles.kicker}>{slide.kicker}</p>
        <h1 style={styles.heroTitle}>{slide.title}</h1>
        <p style={styles.heroSubtitle}>{slide.subtitle}</p>
        <div style={styles.heroPills}>
          <span>Audience Vote</span>
          <span>Admin Console</span>
          <span>Cloudflare Worker</span>
        </div>
        <p style={styles.heroNote}>{slide.note}</p>
      </div>
    </AbsoluteFill>
  );
};

const StandardSlide = ({
  slide,
  index,
  total,
}: {
  slide: DeckSlide;
  index: number;
  total: number;
}) => {
  if (slide.layout === "closing") {
    const contentRect = slide.canvas?.content ?? closingCanvas.content;

    return (
      <AbsoluteFill style={styles.standard}>
        <main
          style={{
            ...styles.slideBody,
            ...rectStyle(contentRect, closingCanvas.content),
            height: contentRect.h,
          }}
        >
          <Closing slide={slide} />
        </main>
        <SlideFooter index={index} total={total} />
      </AbsoluteFill>
    );
  }

  const titleRect = slide.canvas?.title ?? defaultCanvas.title;
  const subtitleRect = slide.canvas?.subtitle ?? defaultCanvas.subtitle;
  const contentRect = slide.canvas?.content ?? defaultCanvas.content;

  return (
    <AbsoluteFill style={styles.standard}>
      <SlideHeader
        slide={slide}
        titleRect={titleRect}
        subtitleRect={subtitleRect}
      />
      <main
        style={{
          ...styles.slideBody,
          ...rectStyle(contentRect, defaultCanvas.content),
        }}
      >
        {slide.layout === "cards" ? (
          <CardGrid cards={slide.cards ?? []} />
        ) : null}
        {slide.layout === "flow" ? <FlowList steps={slide.flow ?? []} /> : null}
        {slide.layout === "architecture" ? (
          <Architecture rows={slide.rows ?? []} />
        ) : null}
        {slide.layout === "hosting" ? <Hosting slide={slide} /> : null}
        {slide.layout === "table" ? (
          <SpecTable rows={slide.rows ?? []} />
        ) : null}
      </main>
      <SlideFooter index={index} total={total} />
    </AbsoluteFill>
  );
};

const SlideHeader = ({
  slide,
  titleRect,
  subtitleRect,
}: {
  slide: DeckSlide;
  titleRect: DeckRect;
  subtitleRect: DeckRect;
}) => {
  const frame = useCurrentFrame();
  const lineWidth = interpolate(frame, [8, 38], [0, 180], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <header style={styles.header}>
      <div style={rectStyle(titleRect, defaultCanvas.title)}>
        <div style={{ ...styles.kickerLine, width: lineWidth }} />
        <p style={styles.kicker}>{slide.kicker}</p>
        <h2 style={{ ...styles.title, width: "100%" }}>{slide.title}</h2>
      </div>
      <p
        style={{
          ...styles.subtitle,
          ...rectStyle(subtitleRect, defaultCanvas.subtitle),
          margin: 0,
        }}
      >
        {slide.subtitle}
      </p>
    </header>
  );
};

const CardGrid = ({ cards }: { cards: DeckCard[] }) => {
  return (
    <div style={styles.cardGrid}>
      {cards.map((card, index) => (
        <AnimatedPanel key={card.title} delay={index * 8}>
          <article
            style={{ ...styles.card, borderTopColor: toneColor[card.tone] }}
          >
            <span style={{ ...styles.cardLabel, color: toneColor[card.tone] }}>
              {card.label}
            </span>
            <h3 style={styles.cardTitle}>{card.title}</h3>
            <p style={styles.cardBody}>{card.body}</p>
          </article>
        </AnimatedPanel>
      ))}
    </div>
  );
};

const FlowList = ({ steps }: { steps: { title: string; body: string }[] }) => {
  return (
    <div style={styles.flowGrid}>
      {steps.map((step, index) => (
        <AnimatedPanel key={step.title} delay={index * 10}>
          <article style={styles.flowItem}>
            <div style={styles.flowNumber}>{index + 1}</div>
            <div>
              <h3 style={styles.flowTitle}>{step.title}</h3>
              <p style={styles.flowBody}>{step.body}</p>
            </div>
          </article>
        </AnimatedPanel>
      ))}
    </div>
  );
};

const Architecture = ({ rows }: { rows: DeckRow[] }) => {
  return (
    <div style={styles.architecture}>
      {rows.map((row, index) => (
        <AnimatedPanel key={row.key} delay={index * 8}>
          <div style={styles.archNode}>
            <span style={styles.archKey}>{row.key}</span>
            <strong style={styles.archValue}>{row.value}</strong>
            <p style={styles.archNote}>{row.note}</p>
          </div>
          {index < rows.length - 1 ? (
            <div style={styles.archArrow}>→</div>
          ) : null}
        </AnimatedPanel>
      ))}
    </div>
  );
};

const Hosting = ({ slide }: { slide: DeckSlide }) => {
  return (
    <div style={styles.hostingLayout}>
      <AnimatedPanel delay={0}>
        <pre style={styles.codeBlock}>{slide.code?.join("\n")}</pre>
      </AnimatedPanel>
      <div style={styles.hostingCards}>
        {slide.cards?.map((card, index) => (
          <AnimatedPanel key={card.title} delay={10 + index * 10}>
            <article
              style={{ ...styles.card, borderTopColor: toneColor[card.tone] }}
            >
              <span
                style={{ ...styles.cardLabel, color: toneColor[card.tone] }}
              >
                {card.label}
              </span>
              <h3 style={styles.cardTitle}>{card.title}</h3>
              <p style={styles.cardBody}>{card.body}</p>
            </article>
          </AnimatedPanel>
        ))}
      </div>
      <AnimatedPanel delay={30}>
        <div style={styles.warningNote}>
          운영 주소는 문서별 흔적이 다르므로 Cloudflare Dashboard 기준으로 최종
          확정합니다.
        </div>
      </AnimatedPanel>
    </div>
  );
};

const SpecTable = ({ rows }: { rows: DeckRow[] }) => {
  return (
    <div style={styles.table}>
      {rows.map((row, index) => (
        <AnimatedPanel key={row.key} delay={index * 8}>
          <div style={styles.tableRow}>
            <span style={styles.tableKey}>{row.key}</span>
            <strong style={styles.tableValue}>{row.value}</strong>
            <p style={styles.tableNote}>{row.note}</p>
          </div>
        </AnimatedPanel>
      ))}
    </div>
  );
};

const Closing = ({ slide }: { slide: DeckSlide }) => {
  const frame = useCurrentFrame();
  const rotate = interpolate(frame, [0, SLIDE_DURATION], [-4, 8]);

  return (
    <div style={styles.closing}>
      <div style={styles.closingCopy}>
        <p style={styles.closingLead}>Ready for run-of-show</p>
        <h3 style={styles.closingTitle}>{slide.title}</h3>
        <p style={styles.closingBody}>{slide.subtitle}</p>
        <span style={styles.closingPath}>{slide.note}</span>
      </div>
      <Img
        src={staticFile("trophy-static.png")}
        style={{
          ...styles.trophy,
          transform: `rotate(${rotate}deg)`,
        }}
      />
    </div>
  );
};

const AnimatedPanel = ({
  children,
  delay,
}: {
  children: ReactNode;
  delay: number;
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delay, delay + 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const x = interpolate(frame, [delay, delay + 20], [38, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <div style={{ opacity, transform: `translateX(${x}px)` }}>{children}</div>
  );
};

const SlideFooter = ({ index, total }: { index: number; total: number }) => {
  const progress = (index + 1) / total;

  return (
    <footer style={styles.footer}>
      <span>Vibe Vote Arena</span>
      <div style={styles.progressTrack}>
        <div style={{ ...styles.progressFill, width: `${progress * 100}%` }} />
      </div>
      <span>
        {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </span>
    </footer>
  );
};

const styles: Record<string, CSSProperties> = {
  composition: {
    backgroundColor: colors.canvas,
    fontFamily:
      "Inter, Segoe UI, Apple SD Gothic Neo, Malgun Gothic, system-ui, sans-serif",
  },
  backdrop: {
    background: `linear-gradient(135deg, ${colors.canvas} 0%, #ffffff 55%, #f2f5fb 100%)`,
  },
  ribbonOne: {
    position: "absolute",
    right: -140,
    top: 90,
    width: 740,
    height: 68,
    background: `linear-gradient(90deg, transparent, ${colors.red}, ${colors.activeRed})`,
    transform: "rotate(-28deg)",
    opacity: 0.18,
  },
  ribbonTwo: {
    position: "absolute",
    right: -220,
    top: 250,
    width: 820,
    height: 42,
    background: `linear-gradient(90deg, transparent, ${colors.blue}, ${colors.cyan})`,
    transform: "rotate(-22deg)",
    opacity: 0.16,
  },
  gridTexture: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "linear-gradient(rgba(32,33,36,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(32,33,36,0.035) 1px, transparent 1px)",
    backgroundSize: "64px 64px",
    opacity: 0.55,
  },
  slide: {
    padding: 92,
  },
  hero: {
    overflow: "hidden",
    backgroundColor: colors.night,
  },
  heroImage: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  heroShade: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(90deg, rgba(3,6,17,0.95), rgba(7,20,47,0.74) 54%, rgba(7,20,47,0.22))",
  },
  heroContent: {
    position: "absolute",
    color: "#fff",
  },
  kickerLine: {
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.activeRed,
    marginBottom: 18,
  },
  kicker: {
    margin: 0,
    color: "#A50034",
    fontSize: 25,
    fontWeight: 850,
    textTransform: "uppercase",
  },
  heroTitle: {
    margin: "18px 0 24px",
    color: "#ffffff",
    fontSize: 112,
    lineHeight: 0.95,
    fontWeight: 850,
  },
  heroSubtitle: {
    width: 980,
    margin: "0 0 36px",
    color: "#f4f7ff",
    fontSize: 34,
    lineHeight: 1.55,
    fontWeight: 520,
  },
  heroPills: {
    display: "flex",
    gap: 16,
    marginBottom: 34,
  },
  heroNote: {
    margin: 0,
    color: "#dbe8ff",
    fontSize: 24,
    fontWeight: 760,
  },
  standard: {
    padding: "74px 92px 64px",
  },
  header: {
    position: "absolute",
    inset: 0,
    zIndex: 3,
  },
  title: {
    margin: "14px 0 20px",
    color: colors.ink,
    fontSize: 58,
    lineHeight: 1.13,
    fontWeight: 850,
    wordBreak: "keep-all",
  },
  subtitle: {
    margin: 0,
    color: colors.body,
    fontSize: 28,
    lineHeight: 1.55,
    fontWeight: 510,
    wordBreak: "keep-all",
  },
  slideBody: {
    position: "absolute",
    zIndex: 2,
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 24,
  },
  card: {
    minHeight: 330,
    padding: 34,
    borderRadius: 8,
    border: `1px solid ${colors.line}`,
    borderTop: "8px solid",
    backgroundColor: "rgba(255,255,255,0.94)",
    boxShadow: "0 18px 40px rgba(16, 24, 40, 0.08)",
  },
  cardLabel: {
    display: "inline-block",
    marginBottom: 24,
    fontSize: 24,
    lineHeight: 1,
    fontWeight: 850,
  },
  cardTitle: {
    margin: "0 0 18px",
    color: colors.ink,
    fontSize: 36,
    lineHeight: 1.22,
    fontWeight: 830,
  },
  cardBody: {
    margin: 0,
    color: colors.body,
    fontSize: 25,
    lineHeight: 1.52,
    fontWeight: 520,
  },
  flowGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 24,
  },
  flowItem: {
    display: "grid",
    gridTemplateColumns: "84px 1fr",
    gap: 26,
    minHeight: 194,
    padding: 32,
    borderRadius: 8,
    border: `1px solid ${colors.line}`,
    backgroundColor: "rgba(255,255,255,0.94)",
    boxShadow: "0 18px 40px rgba(16, 24, 40, 0.07)",
  },
  flowNumber: {
    width: 72,
    height: 72,
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
    color: "#ffffff",
    backgroundColor: colors.red,
    fontSize: 30,
    fontWeight: 850,
  },
  flowTitle: {
    margin: "0 0 12px",
    color: colors.ink,
    fontSize: 34,
    lineHeight: 1.25,
    fontWeight: 830,
  },
  flowBody: {
    margin: 0,
    color: colors.body,
    fontSize: 25,
    lineHeight: 1.52,
  },
  architecture: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 18,
    alignItems: "stretch",
  },
  archNode: {
    minHeight: 420,
    padding: 34,
    borderRadius: 8,
    border: `1px solid ${colors.line}`,
    backgroundColor: "rgba(255,255,255,0.96)",
    boxShadow: "0 18px 40px rgba(16, 24, 40, 0.07)",
  },
  archKey: {
    display: "inline-block",
    marginBottom: 26,
    color: colors.red,
    fontSize: 24,
    fontWeight: 850,
  },
  archValue: {
    display: "block",
    marginBottom: 22,
    color: colors.ink,
    fontSize: 39,
    lineHeight: 1.18,
    fontWeight: 850,
  },
  archNote: {
    margin: 0,
    color: colors.body,
    fontSize: 24,
    lineHeight: 1.52,
  },
  archArrow: {
    position: "absolute",
    top: 178,
    right: -32,
    color: colors.red,
    fontSize: 42,
    fontWeight: 900,
  },
  hostingLayout: {
    display: "grid",
    gridTemplateColumns: "1.2fr 1fr",
    gap: 28,
    alignItems: "start",
  },
  codeBlock: {
    minHeight: 430,
    margin: 0,
    padding: 42,
    borderRadius: 8,
    color: "#f8fafc",
    backgroundColor: "#111827",
    fontFamily: "Cascadia Mono, Consolas, monospace",
    fontSize: 32,
    lineHeight: 1.48,
    boxShadow: "0 18px 42px rgba(17, 24, 39, 0.22)",
  },
  hostingCards: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
  },
  warningNote: {
    gridColumn: "1 / span 2",
    padding: "24px 28px",
    borderRadius: 8,
    border: "1px solid #F1D9A7",
    borderLeft: "8px solid #C47D00",
    color: "#4A3300",
    backgroundColor: "#FFF9ED",
    fontSize: 25,
    lineHeight: 1.45,
    fontWeight: 690,
  },
  table: {
    display: "grid",
    gap: 18,
  },
  tableRow: {
    display: "grid",
    gridTemplateColumns: "280px 420px 1fr",
    gap: 28,
    alignItems: "center",
    minHeight: 118,
    padding: "26px 30px",
    borderRadius: 8,
    border: `1px solid ${colors.line}`,
    backgroundColor: "rgba(255,255,255,0.95)",
    boxShadow: "0 12px 30px rgba(16, 24, 40, 0.055)",
  },
  tableKey: {
    color: colors.red,
    fontSize: 24,
    fontWeight: 850,
  },
  tableValue: {
    color: colors.ink,
    fontSize: 30,
    lineHeight: 1.25,
    fontWeight: 820,
  },
  tableNote: {
    margin: 0,
    color: colors.body,
    fontSize: 24,
    lineHeight: 1.45,
  },
  closing: {
    display: "grid",
    gridTemplateColumns: "1.25fr 0.75fr",
    gap: 40,
    alignItems: "center",
    height: "100%",
  },
  closingCopy: {
    padding: 56,
    borderRadius: 8,
    border: `1px solid ${colors.line}`,
    backgroundColor: "rgba(255,255,255,0.95)",
    boxShadow: "0 18px 42px rgba(16, 24, 40, 0.08)",
  },
  closingLead: {
    margin: "0 0 24px",
    color: colors.red,
    fontSize: 28,
    fontWeight: 850,
  },
  closingTitle: {
    margin: "0 0 26px",
    color: colors.ink,
    fontSize: 58,
    lineHeight: 1.16,
    fontWeight: 850,
  },
  closingBody: {
    margin: "0 0 32px",
    color: colors.body,
    fontSize: 29,
    lineHeight: 1.5,
  },
  closingPath: {
    display: "inline-block",
    padding: "12px 18px",
    borderRadius: 999,
    color: colors.red,
    backgroundColor: "#FFF0F4",
    fontSize: 22,
    fontWeight: 780,
  },
  trophy: {
    width: 430,
    margin: "0 auto",
    objectFit: "contain",
    filter: "drop-shadow(0 24px 38px rgba(16, 24, 40, 0.18))",
  },
  footer: {
    position: "absolute",
    left: 92,
    right: 92,
    bottom: 42,
    display: "grid",
    gridTemplateColumns: "220px 1fr 90px",
    gap: 22,
    alignItems: "center",
    color: colors.muted,
    fontSize: 19,
    fontWeight: 760,
  },
  progressTrack: {
    height: 5,
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "#E4E6EC",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.red,
  },
};
