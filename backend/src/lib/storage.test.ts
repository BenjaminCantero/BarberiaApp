import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockPut, mockDel, mockFs } = vi.hoisted(() => ({
  mockPut: vi.fn(),
  mockDel: vi.fn(),
  mockFs: {
    existsSync: vi.fn(),
    promises: { mkdir: vi.fn(), writeFile: vi.fn(), unlink: vi.fn() },
  },
}));

vi.mock('@vercel/blob', () => ({ put: mockPut, del: mockDel }));
vi.mock('fs', () => ({ default: mockFs, ...mockFs }));

import { storeUpload, deleteUpload } from './storage';

const file = { buffer: Buffer.from('x'), originalname: 'Foto.JPG', mimetype: 'image/jpeg' };

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  delete process.env.BLOB_READ_WRITE_TOKEN;
});

describe('storeUpload', () => {
  it('sin token guarda en disco y devuelve /uploads/<nombre>', async () => {
    const url = await storeUpload(file, 'portfolio');
    expect(url).toMatch(/^\/uploads\/[0-9a-f]{24}\.jpg$/);
    expect(mockFs.promises.writeFile).toHaveBeenCalled();
    expect(mockPut).not.toHaveBeenCalled();
  });

  it('con token sube a Vercel Blob dentro de la carpeta y devuelve su URL', async () => {
    process.env.BLOB_READ_WRITE_TOKEN = 'tok';
    mockPut.mockResolvedValue({ url: 'https://abc.public.blob.vercel-storage.com/portfolio/x.jpg' });
    const url = await storeUpload(file, 'portfolio');
    expect(url).toBe('https://abc.public.blob.vercel-storage.com/portfolio/x.jpg');
    expect(mockPut).toHaveBeenCalledWith(
      expect.stringMatching(/^portfolio\/[0-9a-f]{24}\.jpg$/),
      file.buffer,
      expect.objectContaining({ access: 'public', contentType: 'image/jpeg' }),
    );
    expect(mockFs.promises.writeFile).not.toHaveBeenCalled();
  });
});

describe('deleteUpload', () => {
  it('URL absoluta con token: borra en Blob', async () => {
    process.env.BLOB_READ_WRITE_TOKEN = 'tok';
    await deleteUpload('https://abc.public.blob.vercel-storage.com/portfolio/x.jpg');
    expect(mockDel).toHaveBeenCalledWith('https://abc.public.blob.vercel-storage.com/portfolio/x.jpg');
  });

  it('ruta local: borra el archivo del disco', async () => {
    mockFs.existsSync.mockReturnValue(true);
    await deleteUpload('/uploads/a.jpg');
    expect(mockFs.promises.unlink).toHaveBeenCalledWith(expect.stringMatching(/uploads[\\/]a\.jpg$/));
  });

  it('no lanza si el borrado falla', async () => {
    process.env.BLOB_READ_WRITE_TOKEN = 'tok';
    mockDel.mockRejectedValue(new Error('red caída'));
    await expect(deleteUpload('https://x.blob/y.jpg')).resolves.toBeUndefined();
  });
});
