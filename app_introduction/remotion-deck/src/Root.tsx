import "./index.css";
import { Composition } from "remotion";
import { FPS, TOTAL_DURATION, VibeVoteArenaDeck } from "./Composition";

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="VibeVoteArenaDeck"
        component={VibeVoteArenaDeck}
        durationInFrames={TOTAL_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};
