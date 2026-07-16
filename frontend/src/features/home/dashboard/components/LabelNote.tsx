import { splitLabelNote } from '../utils/labelNote';
import styles from '../styles/LabelNote.module.css';

type LabelNoteProps = {
  label: string;
};

export function LabelNote({ label }: LabelNoteProps): JSX.Element {
  const { main, note } = splitLabelNote(label);
  return (
    <>
      {main}
      {note && <span className={styles.noteText}> ({note})</span>}
    </>
  );
}
