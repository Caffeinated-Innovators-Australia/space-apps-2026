// The Emergency button the shell places on every screen. It opens the basic life support steps.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import '../screens/emergency.css';

/**
 * Black background, white text and a white border in BOTH themes. This is the one deliberate
 * exception to the colour tokens: the button must look the same everywhere so it is found at once,
 * and it must not borrow red (reserved for the Urgent tier) or any other colour that means a tier.
 */
export function EmergencyButton({ go }: { go: (route: string, arg?: string) => void }) {
  return (
    <button type="button" className="x-em-button" aria-label="Emergency: start basic life support steps" onClick={() => go('emergency')}>
      Emergency
    </button>
  );
}
