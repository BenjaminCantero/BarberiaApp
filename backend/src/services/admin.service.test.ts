import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma, mockHash, tx } = vi.hoisted(() => {
  const tx = {
    user: { update: vi.fn() },
    refreshToken: { deleteMany: vi.fn() },
  };
  return {
    tx,
    mockHash: vi.fn(),
    mockPrisma: {
      barber: { findUnique: vi.fn() },
      user: { findUnique: vi.fn() },
      $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    },
  };
});

vi.mock('../lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('bcryptjs', () => ({ default: { hash: mockHash } }));

import { updateBarberAccount } from './admin.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.barber.findUnique.mockResolvedValue({
    userId: 'user-1',
    user: { email: 'actual@example.com' },
  });
  tx.user.update.mockResolvedValue({ id: 'user-1' });
  mockHash.mockResolvedValue('hash-seguro');
});

describe('updateBarberAccount', () => {
  it('cifra la contraseña y cierra las sesiones existentes', async () => {
    await updateBarberAccount('barber-1', { password: 'Segura123' });
    expect(mockHash).toHaveBeenCalledWith('Segura123', 12);
    expect(tx.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'user-1' },
      data: expect.objectContaining({ passwordHash: 'hash-seguro' }),
    }));
    expect(tx.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
  });

  it('rechaza un correo que pertenece a otra cuenta', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'otro-user' });
    await expect(updateBarberAccount('barber-1', { email: 'OCUPADO@example.com' }))
      .rejects.toMatchObject({ statusCode: 409 });
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('no permite editar una cuenta sin perfil de barbero', async () => {
    mockPrisma.barber.findUnique.mockResolvedValue(null);
    await expect(updateBarberAccount('inexistente', { name: 'Nuevo nombre' }))
      .rejects.toMatchObject({ statusCode: 404 });
  });
});
