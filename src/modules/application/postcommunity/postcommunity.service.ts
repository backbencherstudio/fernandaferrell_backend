import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { formatDistanceToNow } from 'date-fns';
import { TajulStorage } from 'src/common/lib/Disk/TajulStorage';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateCommentDto,
  CreatePostDto,
} from './dto/create-postcommunity.dto';

@Injectable()
export class PostCommunityService {
  constructor(private prisma: PrismaService) {}

  // 1. Create a Post
  async createPost(
    userId: string,
    dto: CreatePostDto,
    file?: Express.Multer.File,
  ) {
    // 1. Validate User and Permissions
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { type: true },
    });

    if (!user) throw new NotFoundException('User not found');

    if (user.type !== 'SEEKER') {
      throw new ForbiddenException(
        'Access denied. Only Seekers can create posts.',
      );
    }

    // 2. Handle File Upload to public/storage/post-community
    let fileName: string | null = null;

    if (file) {
      try {
        // Generate name: e.g., 1772526..._image.jpg
        fileName = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;

        // The path relative to your storage root
        const relativePath = `post-community/${fileName}`;

        // Upload the buffer
        await TajulStorage.put(relativePath, file.buffer);
      } catch (uploadError) {
        console.error('Upload Error:', uploadError);
        throw new BadRequestException('Failed to upload image.');
      }
    }

    // 3. Database Operation
    try {
      const post = await this.prisma.postCommunity.create({
        data: {
          title: dto.title,
          content: dto.content,
          location_tag: dto.location_tag,
          image_url: fileName,
          user: {
            connect: { id: userId },
          },
        },
      });

      return {
        status: 201,
        message: 'Post created successfully',
        data: post,
      };
    } catch (error) {
      console.error('Prisma Error:', error);
      throw new BadRequestException('Database error. Please try again.');
    }
  }

  async getAllPosts() {
    const posts = await this.prisma.postCommunity.findMany({
      include: {
        user: {
          select: { id: true, first_name: true, last_name: true, avatar: true },
        },
        _count: {
          select: { likes: true, comments: true },
        },
        comments: {
          where: { parent_id: null }, // Only root comments initially
          take: 5,
          include: {
            user: { select: { first_name: true, avatar: true } },
            replies: {
              take: 3,
              include: {
                user: { select: { first_name: true, avatar: true } },
                // Note: Prisma deeper level fetch korar jonno ekhane recursion handle korte hobe
              },
            },
          },
          orderBy: { created_at: 'desc' },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    if (posts.length === 0) {
      throw new NotFoundException('No posts found');
    }

    const formattedPosts = posts.map((post) => {
      let fullImageUrl = post.image_url;
      if (post.image_url) {
        fullImageUrl = `/public/storage/post-community/${post.image_url}`;
      }

      return {
        ...post,
        image_url: fullImageUrl,
        // Post creation time
        time_ago: formatDistanceToNow(post.created_at, { addSuffix: true }),
        // Recursive call for comments and their replies
        comments: this.buildCommentTree(post.comments),
      };
    });

    return {
      status: 200,
      message: 'Posts fetched successfully',
      data: formattedPosts,
    };
  }

  // 2. Get Post Details (With image path, time_ago, like count and nested comments)
  async getPostDetail(postId: string) {
    const post = await this.prisma.postCommunity.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
        _count: { select: { likes: true, comments: true } },
        comments: {
          include: {
            user: { select: { name: true, avatar: true } },
          },
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!post) throw new NotFoundException('Post not found');

    // 1. Post Author Avatar Formatting
    const postAuthorAvatar = `/public/storage/avatar/${post.user.avatar}`;

    // 2. Post Image URL Formatting
    const fullImageUrl = `/public/storage/post-community/${post.image_url}`;

    // 3. Comments User Avatar Formatting
    const formattedComments = post.comments.map((comment) => ({
      ...comment,
      user: {
        ...comment.user,
        avatar: `/public/storage/avatar/${comment.user.avatar}`,
      },
    }));

    // 4. Build Recursive Comment Tree with formatted avatars
    const commentTree = this.buildCommentTree(formattedComments);

    return {
      status: 200,
      message: 'Post fetched successfully',
      data: {
        ...post,
        image_url: fullImageUrl,
        time_ago: formatDistanceToNow(post.created_at, { addSuffix: true }),
        user: {
          ...post.user,
          avatar: postAuthorAvatar, // Sora-sori URL string
        },
        comments: commentTree,
      },
    };
  }

  // 3. Toggle Like Logic (Scalable way)
  async toggleLike(userId: string, postId: string) {
    const existingLike = await this.prisma.postLike.findUnique({
      where: { post_id_user_id: { post_id: postId, user_id: userId } },
    });

    if (existingLike) {
      await this.prisma.postLike.delete({ where: { id: existingLike.id } });
      return { message: 'Unliked successfully', liked: false };
    }

    await this.prisma.postLike.create({
      data: { post_id: postId, user_id: userId },
    });
    return { message: 'Liked successfully', liked: true };
  }

  // 4. Create Comment/Reply
  async createComment(userId: string, postId: string, dto: CreateCommentDto) {
    const comment = await this.prisma.comment.create({
      data: {
        content: dto.content,
        post_id: postId,
        author_id: userId,
        parent_id: dto.parent_id || null, // If parent_id exists, it's a reply
      },
    });

    return {
      message: 'Comment created successfully',
      status: 200,
      data: comment,
    };
  }

  private buildCommentTree(
    comments: any[],
    parentId: string | null = null,
  ): any[] {
    return comments
      .filter((comment) => comment.parent_id === parentId)
      .map((comment) => ({
        ...comment,
        time_ago: formatDistanceToNow(comment.created_at, { addSuffix: true }),
        // Avatar path formatting (jodi dorkar hoy)
        user: {
          ...comment.user,
          avatar: comment.user.avatar
            ? `/public/storage/avatar/${comment.user.avatar}`
            : null,
        },
        // Recursion happens here
        replies: this.buildCommentTree(comments, comment.id),
      }));
  }
}
