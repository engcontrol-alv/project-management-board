import { Badge } from '@/shared/ui/Badge';
import { formatDateBR } from '@/shared/lib/dates';
import { RegisterView } from '@/registers/RegisterView';
import type { FieldDef } from '@/registers/fields';
import { LESSON_CATEGORIES, LESSON_TYPES, type Lesson } from '../index';
import { lessonExamples } from '../examples';

const fields: FieldDef[] = [
  { key: 'title', label: 'Título', type: 'text', required: true },
  { key: 'type', label: 'Tipo', type: 'select', options: LESSON_TYPES, hint: 'Algo a evitar (ponto de melhoria) ou a repetir (boa prática)?' },
  { key: 'category', label: 'Categoria', type: 'select', options: LESSON_CATEGORIES },
  { key: 'context', label: 'Contexto', type: 'textarea' },
  { key: 'recommendation', label: 'Recomendação', type: 'textarea' },
  { key: 'date', label: 'Data', type: 'date' },
  { key: 'ownerId', label: 'Responsável', type: 'reference', module: 'stakeholders', collection: 'parties', constraint: 'isPerson' },
];

const newLesson = () =>
  ({ id: '', code: '', title: '', type: 'Ponto de melhoria', category: 'Técnica', context: '', recommendation: '', date: null, ownerId: null }) as unknown as Lesson;

export function LessonsPage() {
  return (
    <RegisterView<Lesson>
      module="governance"
      collection="lessons"
      title="Lições aprendidas"
      columns={[
        { key: 'title', label: 'Lição' },
        { key: 'category', label: 'Categoria' },
        { key: 'type', label: 'Tipo', render: (l) => <Badge text={l.type} tone={l.type === 'Boa prática' ? 'green' : 'amber'} /> },
        { key: 'date', label: 'Data', mono: true, render: (l) => formatDateBR(l.date) },
      ]}
      fields={fields}
      examples={lessonExamples}
      newEntity={newLesson}
    />
  );
}
