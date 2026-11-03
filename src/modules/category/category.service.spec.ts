import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { CategoryService } from './category.service.js';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';

describe('CategoryService', () => {
  let service: CategoryService;
  let prisma: Partial<PrismaService>;

  beforeEach(() => {
    prisma = {
      category: {
        findFirst: vi.fn(),
        create: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      } as any,
    };

    service = new CategoryService(prisma as PrismaService);
  });

  describe('createCategory', () => {
    it('should throw ConflictException if category name already exists', async () => {
      (prisma.category!.findFirst as any).mockResolvedValue({ id: '1', name: 'Electronics' });

      await expect(
        service.createCategory({ name: 'Electronics', description: 'Tech gadgets' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create and return category when name is unique', async () => {
      (prisma.category!.findFirst as any).mockResolvedValue(null);
      const createdCategory = {
        id: 'cat-123',
        name: 'Electronics',
        description: 'Tech gadgets',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.category!.create as any).mockResolvedValue(createdCategory);

      const result = await service.createCategory({
        name: 'Electronics',
        description: 'Tech gadgets',
      });

      expect(result.message).toBe('Category created successfully');
      expect(result.data).toEqual(createdCategory);
      expect(prisma.category!.create).toHaveBeenCalledWith({
        data: { name: 'Electronics', description: 'Tech gadgets' },
      });
    });
  });

  describe('getAllCategories', () => {
    it('should return paginated categories', async () => {
      const mockCategories = [
        { id: '1', name: 'Electronics', _count: { products: 5 } },
        { id: '2', name: 'Clothing', _count: { products: 2 } },
      ];
      (prisma.category!.count as any).mockResolvedValue(2);
      (prisma.category!.findMany as any).mockResolvedValue(mockCategories);

      const result = await service.getAllCategories({ page: 1, limit: 10 });

      expect(result.data).toEqual(mockCategories);
      expect(result.meta).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });
  });

  describe('getCategoryById', () => {
    it('should throw NotFoundException if category does not exist', async () => {
      (prisma.category!.findUnique as any).mockResolvedValue(null);

      await expect(service.getCategoryById('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should return category when found', async () => {
      const mockCategory = { id: 'cat-1', name: 'Shoes', _count: { products: 3 } };
      (prisma.category!.findUnique as any).mockResolvedValue(mockCategory);

      const result = await service.getCategoryById('cat-1');
      expect(result.data).toEqual(mockCategory);
    });
  });

  describe('updateCategory', () => {
    it('should throw NotFoundException if category not found', async () => {
      (prisma.category!.findUnique as any).mockResolvedValue(null);

      await expect(
        service.updateCategory('cat-1', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if updated name belongs to another category', async () => {
      (prisma.category!.findUnique as any).mockResolvedValue({ id: 'cat-1', name: 'Old' });
      (prisma.category!.findFirst as any).mockResolvedValue({ id: 'cat-2', name: 'Existing' });

      await expect(
        service.updateCategory('cat-1', { name: 'Existing' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should successfully update category', async () => {
      (prisma.category!.findUnique as any).mockResolvedValue({ id: 'cat-1', name: 'Old' });
      (prisma.category!.findFirst as any).mockResolvedValue(null);
      (prisma.category!.update as any).mockResolvedValue({
        id: 'cat-1',
        name: 'New Name',
        description: 'New Desc',
      });

      const result = await service.updateCategory('cat-1', { name: 'New Name' });
      expect(result.message).toBe('Category updated successfully');
      expect(result.data.name).toBe('New Name');
    });
  });

  describe('deleteCategory', () => {
    it('should throw NotFoundException if category not found', async () => {
      (prisma.category!.findUnique as any).mockResolvedValue(null);

      await expect(service.deleteCategory('cat-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if category has products', async () => {
      (prisma.category!.findUnique as any).mockResolvedValue({
        id: 'cat-1',
        name: 'Electronics',
        _count: { products: 10 },
      });

      await expect(service.deleteCategory('cat-1')).rejects.toThrow(BadRequestException);
    });

    it('should delete category if no products attached', async () => {
      (prisma.category!.findUnique as any).mockResolvedValue({
        id: 'cat-1',
        name: 'Empty Category',
        _count: { products: 0 },
      });
      (prisma.category!.delete as any).mockResolvedValue({ id: 'cat-1' });

      const result = await service.deleteCategory('cat-1');
      expect(result.message).toBe('Category deleted successfully');
      expect(prisma.category!.delete).toHaveBeenCalledWith({ where: { id: 'cat-1' } });
    });
  });
});

