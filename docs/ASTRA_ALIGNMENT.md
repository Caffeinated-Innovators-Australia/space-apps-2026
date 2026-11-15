# Aligning the emergency module (ASTRA) with the main app

For the emergency module's owner. Written 15 Nov 2026 at the clinical lead's request (acting for the team lead).

The clinical lead asked for the emergency module and the main app to work as one, with the same voice and AI support. ASTRA's source is not in this repository, and `public/astra/index.html` is the owner's file (docs/MODULE_GUIDE.md). So the main app was aligned **through the message bridge only**, in `src/core/astra.ts` and `src/screens/Astra.tsx`. Nothing in the module's file was changed.

## Done in the main app, through the bridge

1. **Cardiac arrest hand-off.** When the module opens or ticks a step in checklist 1, raises a monitor alert for it, or records "not responding" and "not breathing" (its own rule), the app shows **"Cardiac arrest: use the guided CPR steps"**. That screen offers:
   - each step read aloud
   - a pace marker at 110 a minute
   - the strap-down step at 0 g
   - "next", "yes" and "no" by voice
   - the clinical lead's yes/no questions on Danger and Response
   - a timed handover
2. **Hand-over to the crew medic.** On the guided CPR and defibrillation steps, a button opens the module's checklist 1 for the crew medic's advanced life support steps. This uses the route argument `1:als`, so the module does not offer basic CPR again.
3. **AI on what was described.** When the module sends `astra.description`, the app runs the text through its small language model, if it is turned on (FR-60), or the module's own keywords. It shows its suggested checklist, with a button that sends `astra.command openPathway`.
4. **The app's voice and AI above the module.** A "Say what is happening" card above the frame uses the same voice pipeline as the main app (FR-61). It opens a module checklist at a tap, or the guided CPR steps for checklist 1.

## Asked of the module's owner

These need the module's source.

1. **Send a message when a checklist opens**, not only when a step is ticked. For example `astra.pathway.opened {construct}`. The app can then offer the guided CPR steps the moment checklist 1 opens.
2. **Accept answers and descriptions from the host.** Accept inbound `astra.answer {question, answer}` and `astra.description {text}`, so the app's speech and AI plugins can answer the module's questions. One voice pipeline would then serve both modules, and the module would not need its own.
3. **Command words.** If the module keeps its own speech recognition, treat command words ("back", "skip", "no", "stop", "next") as commands only in a short reply. The main app had a bug where "pain in my lower back" was read as "go back" and "cannot pass urine" as "skip" (fixed 15 Nov 2026 in `src/core/speech.ts`, at four words or fewer).
4. **Basic life support wording.** Checklist 1 is advanced life support. It includes a carotid pulse check, which ANZCOR does not ask of lay rescuers, plus an oral airway, the resuscitator, ECG and medicines. Consider:
   - opening it with the main app's signed-off DRSABCD wording, or a pointer to it (CR-32)
   - adding the 0 g strap-down line the clinical lead signed off (CR-38)
5. **Medicines and doses.** The module names medicines and doses, for example in checklist 1. The clinical lead has decided these may be named once the AI clinical assistant is linked, as suggestions for the crew medic to check against the formulary (CR-50). The module's own lists still need a clinician's review before they are relied on.
6. **Licence.** Please confirm the module's licence (CR-50).
7. **Source.** If the source can be shared in a repository the team can reach, the module's own screens can be brought in line with the main app's large step cards and voice control, rather than through the bridge alone.
