import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma, mockDeleteUpload } = vi.hoisted(() => ({
  mockPrisma: {
    portfolioPhoto: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
  mockDeleteUpload: vi.fn()
}));

vi.mock('../lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('../lib/storage', () => ({ deleteUpload: mockDeleteUpload }));

import {
  MAX_PHOTOS_PER_BARBER,
  createPortfolioPhoto,
  deletePortfolioPhoto,
  listPublicPortfolio,
  listBarberPortfolio,
  reviewPortfolioPhoto,
} from './portfolio.service';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listPublicPortfolio', () => {
  it('solo devuelve fotos aprobadas', async () => {
    mockPrisma.portfolioPhoto.findMany.mockResolvedValue([]);
    await listPublicPortfolio({ barberId: 'b1' });
    const args = mockPrisma.portfolioPhoto.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ status: 'APPROVED', barberId: 'b1', barber: { isActive: true } });
  });

  it('limita la cantidad a 48 como máximo', async () => {
    mockPrisma.portfolioPhoto.findMany.mockResolvedValue([]);
    await listPublicPortfolio({ limit: 500 });
    expect(mockPrisma.portfolioPhoto.findMany.mock.calls[0][0].take).toBe(48);
  });
});

describe('listBarberPortfolio', () => {
  it('devuelve todas las fotos del barbero sin filtrar estado', async () => {
    mockPrisma.portfolioPhoto.findMany.mockResolvedValue([]);
    await listBarberPortfolio('b1');
    expect(mockPrisma.portfolioPhoto.findMany.mock.calls[0][0].where).toEqual({ barberId: 'b1' });
  });
});

describe('createPortfolioPhoto', () => {
  it('una foto subida por un barbero queda pendiente', async () => {
    mockPrisma.portfolioPhoto.count.mockResolvedValue(0);
    mockPrisma.portfolioPhoto.create.mockImplementation(({ data }) => data);
    const photo = await createPortfolioPhoto({ barberId: 'b1', imageUrl: '/uploads/a.jpg', autoApprove: false });
    expect(photo.status).toBe('PENDING');
    expect(photo.reviewedAt).toBeUndefined();
  });

  it('una foto subida por el admin se aprueba sola', async () => {
    mockPrisma.portfolioPhoto.count.mockResolvedValue(0);
    mockPrisma.portfolioPhoto.create.mockImplementation(({ data }) => data);
    const photo = await createPortfolioPhoto({ barberId: 'b1', imageUrl: '/uploads/a.jpg', autoApprove: true });
    expect(photo.status).toBe('APPROVED');
    expect(photo.reviewedAt).toBeInstanceOf(Date);
  });

  it('rechaza superar el límite de fotos', async () => {
    mockPrisma.portfolioPhoto.count.mockResolvedValue(MAX_PHOTOS_PER_BARBER);
    await expect(
      createPortfolioPhoto({ barberId: 'b1', imageUrl: '/uploads/a.jpg', autoApprove: false }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(mockPrisma.portfolioPhoto.create).not.toHaveBeenCalled();
  });

  it('recorta la descripción y descarta una vacía', async () => {
    mockPrisma.portfolioPhoto.count.mockResolvedValue(0);
    mockPrisma.portfolioPhoto.create.mockImplementation(({ data }) => data);
    const photo = await createPortfolioPhoto({ barberId: 'b1', imageUrl: '/uploads/a.jpg', caption: '   ', autoApprove: false });
    expect(photo.caption).toBeNull();
  });
});

describe('deletePortfolioPhoto', () => {
  it('404 si la foto no existe', async () => {
    mockPrisma.portfolioPhoto.findUnique.mockResolvedValue(null);
    await expect(deletePortfolioPhoto('p1', 'b1')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('403 si la foto es de otro barbero', async () => {
    mockPrisma.portfolioPhoto.findUnique.mockResolvedValue({ id: 'p1', barberId: 'otro', imageUrl: '/uploads/a.jpg' });
    await expect(deletePortfolioPhoto('p1', 'b1')).rejects.toMatchObject({ statusCode: 403 });
    expect(mockPrisma.portfolioPhoto.delete).not.toHaveBeenCalled();
  });

  it('borra la fila y el archivo físico', async () => {
    mockPrisma.portfolioPhoto.findUnique.mockResolvedValue({ id: 'p1', barberId: 'b1', imageUrl: '/uploads/a.jpg' });
    await deletePortfolioPhoto('p1', 'b1');
    expect(mockPrisma.portfolioPhoto.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
    expect(mockDeleteUpload).toHaveBeenCalledWith('/uploads/a.jpg');
  });
});

describe('reviewPortfolioPhoto', () => {
  it('404 si la foto no existe', async () => {
    mockPrisma.portfolioPhoto.findUnique.mockResolvedValue(null);
    await expect(reviewPortfolioPhoto('p1', 'APPROVED')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('actualiza estado y fecha de revisión', async () => {
    mockPrisma.portfolioPhoto.findUnique.mockResolvedValue({ id: 'p1' });
    mockPrisma.portfolioPhoto.update.mockImplementation(({ data }) => data);
    const res = await reviewPortfolioPhoto('p1', 'REJECTED');
    expect(res.status).toBe('REJECTED');
    expect(res.reviewedAt).toBeInstanceOf(Date);
  });
});
