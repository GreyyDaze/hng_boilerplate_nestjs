import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, ProductStatusType } from './entities/product.entity';
import { Organisation } from '../organisations/entities/organisations.entity';
import { CreateProductRequestDto } from './dto/create-product.dto';
import { ProductComment } from '../product-comment/entities/product-comment.entity';
import { User } from '../user/entities/user.entity';
import { CreateCommentDto } from './dto/create-commemt.dto';

interface SearchCriteria {
  name?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private productRepository: Repository<Product>,
    @InjectRepository(ProductComment) private productCommentRepository: Repository<ProductComment>,
    @InjectRepository(Organisation) private organisationRepository: Repository<Organisation>,
    @InjectRepository(User) private userRepository: Repository<User>
  ) {}

  async createProduct(id: string, dto: CreateProductRequestDto) {
    const { name, quantity, price } = dto;
    const org = await this.organisationRepository.findOne({ where: { id } });
    if (!org)
      throw new InternalServerErrorException({
        status: 'Unprocessable entity exception',
        message: 'Invalid organisation credentials',
        status_code: 422,
      });
    const newProduct: Product = await this.productRepository.create({
      name,
      quantity,
      price,
    });
    newProduct.org = org;
    if (!newProduct)
      throw new InternalServerErrorException({
        status_code: 500,
        status: 'Internal server error',
        message: 'An unexpected error occurred. Please try again later.',
      });
    const statusCal = await this.calculateProductStatus(quantity);
    newProduct.satus = statusCal;
    await this.productRepository.save(newProduct);
    return {
      status: 'success',
      message: 'Product created successfully',
      data: {
        id: newProduct.id,
        name: newProduct.name,
        description: newProduct.description,
        price: newProduct.price,
        status: newProduct.satus,
        quantity,
        created_at: newProduct.created_at,
        updated_at: newProduct.updated_at,
      },
    };
  }

  async searchProducts(criteria: SearchCriteria) {
    const { name, category, minPrice, maxPrice } = criteria;
    const query = this.productRepository.createQueryBuilder('product');

    if (name) {
      query.andWhere('product.name ILIKE :name', { name: `%${name}%` });
    }
    // if (category) {
    //   query.andWhere('product.category ILIKE :category', { category: `%${category}%` });
    // }
    if (minPrice) {
      query.andWhere('product.price >= :minPrice', { minPrice });
    }
    if (maxPrice) {
      query.andWhere('product.price <= :maxPrice', { maxPrice });
    }

    const products = await query.getMany();

    if (!products.length) {
      throw new NotFoundException({
        status: 'No Content',
        status_code: 204,
        message: 'No products found',
      });
    }

    return {
      success: true,
      statusCode: 200,
      products,
    };
  }

  async addComment(productId: string, dto: CreateCommentDto) {
    const { userId, comment } = dto;

    try {
      const product = await this.productRepository.findOne({ where: { id: productId } });
      if (!product) {
        throw new NotFoundException({
          status_code: 404,
          status: 'Not Found',
          message: 'Product not found',
        });
      }

      const user = await this.userRepository.findOne({ where: { id: String(userId) } });
      if (!user) {
        throw new NotFoundException({
          status_code: 404,
          status: 'Not Found',
          message: 'User not found',
        });
      }

      const newComment = this.productCommentRepository.create({
        product,
        user,
        comment,
      });

      await this.productCommentRepository.save(newComment);

      console.log('newComment:', newComment);

      return {
        status: 'success',
        message: 'Comment added successfully',
        status_code: 201,
        data: {
          id: newComment.id,
          product_id: newComment.product.id,
          comment: newComment.comment,
          user_id: newComment.user.id,
          created_at: newComment.created_at,
          updated_at: newComment.updated_at,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      } else {
        console.error('Error adding comment:', error);
        throw new InternalServerErrorException({
          status_code: 500,
          status: 'Server Error',
          message: 'An error occurred while adding the comment',
        });
      }
    }
  }

  async calculateProductStatus(quantity: number): Promise<ProductStatusType> {
    if (quantity === 0) return ProductStatusType.OUT_STOCK;
    return quantity >= 5 ? ProductStatusType.IN_STOCK : ProductStatusType.LOW_STOCK;
  }
}
