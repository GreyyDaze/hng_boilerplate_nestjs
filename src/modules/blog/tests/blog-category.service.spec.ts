import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { BlogPostCategoryService } from '../services/blog-category.service';
import { createBlogPostCategory } from '../entities/blog-category.entity';
import { CreateBlogCategoryDto } from '../dto/create-blog-category.dto';

describe('BlogCategoryService', () => {
  let service: BlogPostCategoryService;
  let repository: Repository<createBlogPostCategory>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlogPostCategoryService,
        {
          provide: getRepositoryToken(createBlogPostCategory),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BlogPostCategoryService>(BlogPostCategoryService);
    repository = module.get<Repository<createBlogPostCategory>>(getRepositoryToken(createBlogPostCategory));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCategory', () => {
    it('should successfully create a category', async () => {
      const createBlogCategoryDto: CreateBlogCategoryDto = { name: 'New Category' };
      const category = new createBlogPostCategory();
      category.name = 'New Category';
      const savedCategory = { ...category };

      jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      jest.spyOn(repository, 'create').mockReturnValue(category);
      jest.spyOn(repository, 'save').mockResolvedValue(savedCategory);

      const result = await service.createCategory(createBlogCategoryDto);

      expect(result).toEqual({
        status: 'success',
        message: 'Blog category created successfully.',
        data: { name: savedCategory.name },
        status_code: 201,
      });
    });

    it('should throw BadRequestException if category already exists', async () => {
      const createBlogCategoryDto: CreateBlogCategoryDto = { name: 'Existing Category' };
      const existingCategory = new createBlogPostCategory();
      existingCategory.name = 'Existing Category';

      jest.spyOn(repository, 'findOne').mockResolvedValue(existingCategory);

      await expect(service.createCategory(createBlogCategoryDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw InternalServerErrorException if save fails', async () => {
      const createBlogCategoryDto: CreateBlogCategoryDto = { name: 'New Category' };
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      jest.spyOn(repository, 'create').mockReturnValue(new createBlogPostCategory());
      jest.spyOn(repository, 'save').mockRejectedValue(new Error('Database error'));

      await expect(service.createCategory(createBlogCategoryDto)).rejects.toThrow(InternalServerErrorException);
    });
  });
});