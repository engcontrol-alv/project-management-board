import { scheduleRag } from './rag';

const limits = { greenMin: 0.95, yellowMin: 0.85 };

describe('scheduleRag', () => {
  it('faixas de SPI e marcos', () => {
    expect(scheduleRag({ spi: null, milestones: [], ...limits }).rag).toBe('n/a');
    expect(scheduleRag({ spi: 0.96, milestones: [], ...limits }).rag).toBe('verde');
    expect(scheduleRag({ spi: 0.9, milestones: [], ...limits }).rag).toBe('amarelo');
    expect(scheduleRag({ spi: 0.8, milestones: [], ...limits }).rag).toBe('vermelho');
    expect(scheduleRag({ spi: 0.99, milestones: [{ status: 'Atrasado', critical: true }], ...limits }).rag).toBe(
      'vermelho',
    );
    expect(scheduleRag({ spi: 0.99, milestones: [{ status: 'Atrasado', critical: false }], ...limits }).rag).toBe(
      'amarelo',
    );
    expect(scheduleRag({ spi: 0.99, milestones: [{ status: 'Atenção', critical: true }], ...limits }).rag).toBe(
      'verde',
    );
    expect(scheduleRag({ spi: null, milestones: [{ status: 'No prazo', critical: true }], ...limits }).rag).toBe(
      'verde',
    );
  });
  it('sempre traz motivo', () => {
    expect(scheduleRag({ spi: 0.8, milestones: [], ...limits }).reason).toMatch(/SPI físico 0,80/);
  });
});
