import { RegisterView } from '@/registers/RegisterView';
import type { FieldDef } from '@/registers/fields';
import { NORM_TYPES, type Norm } from '../index';
import { normExamples } from '../examples';

const fields: FieldDef[] = [
  { key: 'standard', label: 'Código da norma', type: 'text', required: true, hint: 'Ex.: ISO 9001:2015, NBR 5410, NR-10' },
  { key: 'type', label: 'Tipo', type: 'select', options: NORM_TYPES },
  { key: 'title', label: 'Título', type: 'text' },
  { key: 'notes', label: 'Observação', type: 'textarea' },
];

const newNorm = () => ({ id: '', code: '', standard: '', type: 'ISO', title: '', notes: '' }) as unknown as Norm;

export function NormsPage() {
  return (
    <RegisterView<Norm>
      module="governance"
      collection="norms"
      title="Qualidade — normas aplicáveis"
      columns={[
        { key: 'standard', label: 'Norma', mono: true },
        { key: 'type', label: 'Tipo' },
        { key: 'title', label: 'Título' },
      ]}
      fields={fields}
      examples={normExamples}
      newEntity={newNorm}
    />
  );
}
