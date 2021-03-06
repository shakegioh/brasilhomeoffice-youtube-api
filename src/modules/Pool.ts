import { User } from '.prisma/client';
import { context, Context } from '../context'
import { ensureUser } from '../lib/auth';
import { fbGetUser } from '../lib/facebook';
import jwt from '../lib/jwt';

export const typeDef = `
  type PoolBySlugResponse {
    pool: Pool!
    userAnswerId: Int
  }

  type Pool {
    id: Int
    slug: String
    title: String
    description: String
    poolStatus: Int
    options: [PoolOption!]!
    # answers: [PoolAnswer!]
    # createdAt: DateTime
  }
  
  type PoolOption {
    id: Int
    # pool: Pool
    poolId: Int
    image: String
    label: String
    value: String
    votes: Int
  }
  
  type PoolAnswer {
    id: Int
    # pool: Pool
    poolId: Int
    userId: Int
    poolOptionId: Int
  }
`;

export const Mutation = `
  createPool(
    slug: String
    title: String
    description: String
  ): Pool

  createPoolOption(
    poolId: Int!
    image: String
    label: String!
    value: String
  ): PoolOption

  updatePoolOption(
    id: Int!
    image: String
    label: String
    value: String
  ): PoolOption

  deletePoolOption(
    id: Int!
  ): Boolean

  answerPool(
    poolId: Int!
    poolOptionId: Int!
  ): PoolAnswer

  openPool(
    poolId: Int!
  ): Boolean

  closePool(
    poolId: Int!
  ): Boolean
`;

export const Query = `
  poolBySlug(
    slug: String!
  ): PoolBySlugResponse
`;

export const resolvers = {
  Query: {
    poolBySlug: async (
      _,
      data: QueryPoolBySlug,
      context: Context,
    ): Promise<any> => {
      const pool = await context.prisma.pool.findFirst({
        where: {
          slug: data.slug,
        },
        include: {
          options: true,
        },
        rejectOnNotFound: true,
      });

      let userAnswerId: number | null = null;

      if (context.user) {
        const poolAnswer = await context.prisma.poolAnswer.findFirst({
          where: {
            AND: {
              poolId: pool.id,
              userId: context.user.id,
            },
          },
          select: {
            id: true,
          },
        });

        userAnswerId = poolAnswer ? poolAnswer.id : null;
      }

      return {
        pool,
        userAnswerId,
      };
    },
  },
  Mutation: {
    createPool: async (
      _,
      {
        title,
        slug,
        description,
      }: CreatePoolInput,
      context: Context,
    ): Promise<Pool> => {
      await ensureUser(context);

      const pool = await context.prisma.pool.create({
        data: {
          slug,
          title,
          description,
        },
      });
      return pool;
    },
    createPoolOption: async (
      _,
      {
        poolId,
        image,
        label,
        value,
      }: any,
      context: Context,
    ): Promise<any> => {
      await ensureUser(context);

      const option = await context.prisma.poolOption.create({
        data: {
          poolId,
          image,
          label,
          value,
        },
      });
      return option;
    },
    updatePoolOption: async (
      _,
      {
        id,
        image,
        label,
        value,
      }: any,
      context: Context,
    ): Promise<any> => {
      await ensureUser(context);
      
      const option = await context.prisma.poolOption.update({
        where: {
          id,
        },
        data: {
          image,
          label,
          value,
        },
      });
      return option;
    },
    deletePoolOption: async (
      _,
      {
        id,
      }: any,
      context: Context,
    ) => {
      await ensureUser(context);

      const option = await context.prisma.poolOption.delete({
        where: {
          id,
        },
      });
      return true;
    },
    answerPool: async (
      _,
      {
        poolId,
        poolOptionId,
      }: any,
      context: Context,
    ): Promise<any> => {
      await ensureUser(context);

      const userId = 1;
      await context.prisma.poolOption.update({
        where: {
          id: poolOptionId,
        },
        data: {
          votes: {
            increment: 1,
          },
        },
      })
      const answer = await context.prisma.poolAnswer.create({
        data: {
          userId,
          poolId,
          poolOptionId,
        },
      });
      return answer;
    },
    openPool: async (
      _,
      { poolId }: any,
      context: Context,
    ): Promise<any> => {
      await ensureUser(context);

      await context.prisma.pool.update({
        where: {
          id: poolId,
        },
        data: {
          poolStatus: 2,// PoolStatus.OPEN_TO_VOTE,
        }
      })
      return true;
    },
    closePool: async (
      _,
      { poolId }: any,
      context: Context,
    ): Promise<any> => {
      await ensureUser(context);
      
      await context.prisma.pool.update({
        where: {
          id: poolId,
        },
        data: {
          poolStatus: 0,// PoolStatus.OPEN_TO_VOTE,
        }
      })
      return true;
    },
  },
}

interface Pool {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  poolStatus: number | null;
}

interface CreatePoolInput {
  slug: string;
  title: string;
  description: string;
}

// enum PoolStatus {
//   DRAFT,
//   OPEN_TO_VOTE,
//   FINISHED,
// }

interface QueryPoolBySlug {
  slug: string;
}
