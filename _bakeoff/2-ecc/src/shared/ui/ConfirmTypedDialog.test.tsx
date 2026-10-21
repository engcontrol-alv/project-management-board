import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmTypedDialog } from './ConfirmTypedDialog';

describe('ConfirmTypedDialog', () => {
  it('só habilita com a palavra exata', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<ConfirmTypedDialog open title="Apagar dados locais" word="APAGAR" onConfirm={onConfirm} onCancel={() => {}} />);
    const input = screen.getByLabelText('Digite APAGAR para confirmar');
    const button = screen.getByRole('button', { name: 'Confirmar' });
    await user.type(input, 'apagar');
    expect(button).toBeDisabled();
    await user.clear(input);
    await user.type(input, 'APAGAR');
    expect(button).toBeEnabled();
    await user.click(button);
    expect(onConfirm).toHaveBeenCalledOnce();
  });
  it('fechado não renderiza', () => {
    render(<ConfirmTypedDialog open={false} title="x" word="APAGAR" onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
