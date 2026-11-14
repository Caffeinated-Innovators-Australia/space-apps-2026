// AI assistance: drafted with Claude Code (see AI_USE.md).
import { useRef, useState, type CSSProperties } from 'react';

type Eye = 'right' | 'left';
type Phase = 'idle' | 'reading' | 'pause' | 'done';

const LETTERS = ['C', 'D', 'H', 'K', 'N', 'O', 'R', 'S', 'V', 'Z'];
/** Letter (cap) heights in CSS px for lines 1 to 8. */
const HEIGHTS = [30, 24, 19, 15, 12, 10, 8, 6];
const LINES = HEIGHTS.length;

function randomLine(): string {
  const pool = [...LETTERS];
  const out: string[] = [];
  for (let i = 0; i < 5; i++) {
    const j = Math.floor(Math.random() * pool.length);
    out.push(pool[j]);
    pool.splice(j, 1);
  }
  return out.join('');
}

const lines = (n: number) => `${n} ${n === 1 ? 'line' : 'lines'}`;

export function VisionTest({ onResult }: { onResult: (worseEyeLines: number) => void }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [eye, setEye] = useState<Eye>('right');
  const [line, setLine] = useState(1);
  const [letters, setLetters] = useState(randomLine);
  const [right, setRight] = useState(0);
  const [left, setLeft] = useState(0);
  const reported = useRef(false);
  const resultRef = useRef(onResult);
  resultRef.current = onResult;

  const start = () => {
    reported.current = false;
    setRight(0);
    setLeft(0);
    setEye('right');
    setLine(1);
    setLetters(randomLine());
    setPhase('reading');
  };

  const finishEye = (score: number) => {
    if (eye === 'right') {
      setRight(score);
      setPhase('pause');
    } else {
      setLeft(score);
      setPhase('done');
      if (!reported.current) {
        reported.current = true;
        resultRef.current(Math.min(right, score));
      }
    }
  };

  const canRead = () => {
    if (line >= LINES) {
      finishEye(LINES);
    } else {
      setLine(line + 1);
      setLetters(randomLine());
    }
  };

  const cannotRead = () => finishEye(line - 1);

  const continueToLeft = () => {
    setEye('left');
    setLine(1);
    setLetters(randomLine());
    setPhase('reading');
  };

  const eyeName = eye === 'right' ? 'Right eye' : 'Left eye';
  const cover = eye === 'right' ? 'Cover your left eye.' : 'Cover your right eye.';
  const worse = Math.min(right, left);

  const status =
    phase === 'idle' ? 'Ready to start the vision check.' :
    phase === 'reading' ? `${eyeName}. ${cover} Line ${line} of ${LINES}.` :
    phase === 'pause' ? `Right eye: ${lines(right)}. Now cover your right eye.` :
    `Finished. Right eye: ${lines(right)}. Left eye: ${lines(left)}. Worse eye: ${lines(worse)}.`;

  return (
    <div className="x-vt">
      <div className="x-vt-panel">
        {phase === 'idle' ? (
          <>
            <p className="x-vt-text">
              Hold the screen 30 cm from your eyes. If you cannot measure it, use your own arm's length, the same every time. Wear your usual glasses or contact lenses. You will check one eye at a time.
            </p>
            <button type="button" className="btn x-vt-btn" onClick={start}>Start the vision check</button>
          </>
        ) : null}

        {phase === 'reading' ? (
          <>
            <div className="x-vt-head">
              <span className="x-vt-eye">{eyeName}</span>
              <span className="x-vt-text">{cover}</span>
              <span className="x-vt-mono x-vt-count">Line {line} of {LINES}</span>
            </div>
            <div className="x-vt-chart">
              <span
                className="x-vt-letters"
                style={{ '--x-vt-h': `${HEIGHTS[line - 1]}px` } as CSSProperties}
                aria-label={`Line ${line}: ${letters.split('').join(' ')}`}
              >
                {letters}
              </span>
            </div>
            <div className="x-vt-actions">
              <button type="button" className="btn x-vt-btn" onClick={canRead}>I can read every letter</button>
              <button type="button" className="btn secondary x-vt-btn" onClick={cannotRead}>I cannot read it</button>
            </div>
          </>
        ) : null}

        {phase === 'pause' ? (
          <>
            <p className="x-vt-text">
              <span className="x-vt-mono">Right eye: {lines(right)}.</span> Now cover your right eye.
            </p>
            <button type="button" className="btn x-vt-btn" onClick={continueToLeft}>Continue</button>
          </>
        ) : null}

        {phase === 'done' ? (
          <>
            <ul className="x-vt-scores" aria-label="Vision check results">
              <li className="x-vt-mono">Right eye: {lines(right)}</li>
              <li className="x-vt-mono">Left eye: {lines(left)}</li>
              <li className="x-vt-mono x-vt-worse">Worse eye: {lines(worse)}</li>
            </ul>
            <button type="button" className="btn secondary x-vt-btn" onClick={start}>Run it again</button>
          </>
        ) : null}
      </div>
      <p className="caption">
        Not a calibrated eye chart. It compares you with your own earlier results on this device, at the same distance and screen brightness.
      </p>
      <p className="x-vt-sr" aria-live="polite" role="status">{status}</p>
    </div>
  );
}
