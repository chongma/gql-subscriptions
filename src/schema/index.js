const {
    GraphQLList,
    GraphQLNonNull,
    GraphQLObjectType,
    GraphQLSchema,
    GraphQLString
} = require('graphql')
const { v4: uuidv4 } = require('uuid')
const { RedisPubSub } = require('graphql-redis-subscriptions')
const Redis = require("ioredis")

const options = {
    host: '127.0.0.1',
    port: 6379,
    retryStrategy: times => {
        // reconnect after
        return Math.min(times * 50, 2000);
    }
}

const pubsub = new RedisPubSub({
    publisher: new Redis(options),
    subscriber: new Redis(options),
    // messageEventName: 'messageBuffer',
    // pmessageEventName: 'pmessageBuffer',
})

const POSTS_TOPIC = 'posts';
const posts = [
    { id: uuidv4(), body: 'Some post 1' },
    { id: uuidv4(), body: 'Some post 2' },
    { id: uuidv4(), body: 'Some post 3' }
]

const Post = new GraphQLObjectType({
    name: 'Post',
    fields: () => ({
        id: { type: GraphQLString },
        body: { type: GraphQLString }
    })
})

const query = new GraphQLObjectType({
    name: 'RootQueryType',
    fields: {
        posts: {
            type: GraphQLList(Post),
            async resolve(parentValue, args, req) {
                return posts
            }
        },
        post: {
            type: Post,
            args: { id: { type: GraphQLNonNull(GraphQLString) } },
            async resolve(parentValue, { id }, req) {
                return posts.find(post => post.id === id)
            }
        },
        hello: {
            type: GraphQLString,
            resolve(parentValue, args, req) {
                return 'Hello World!'
            }
        }
    }
})

const mutation = new GraphQLObjectType({
    name: 'Mutation',
    fields: {
        createPost: {
            type: Post,
            args: { body: { type: GraphQLNonNull(GraphQLString) } },
            async resolve(parentValue, { body }, req) {
                const post = { id: uuidv4(), body }
                posts.push(post)
                await pubsub.publish(POSTS_TOPIC, { postsPubSub: posts })
                return post
            }
        },
        updatePost: {
            type: Post,
            args: { id: { type: GraphQLNonNull(GraphQLString) }, body: { type: GraphQLNonNull(GraphQLString) } },
            async resolve(parentValue, { id, body }, req) {
                const post = posts.find(post => post.id === id)
                post.body = body
                await pubsub.publish(POSTS_TOPIC, { postsPubSub: posts })
                await pubsub.publish(`${POSTS_TOPIC}_${id}`, { postPubSubWithArg: post })
                return post
            }
        }
    }
})

const subscription = new GraphQLObjectType({
    name: 'Subscription',
    fields: {
        posts: {
            type: Post,
            subscribe: async function* () {
                for (let post of posts) {
                    yield { posts: post }
                }
            }
        },
        postsPubSub: {
            type: GraphQLList(Post),
            subscribe: function (parentValue, args, req) {
                return pubsub.asyncIterator(POSTS_TOPIC)
            }
        },
        postPubSubWithArg: {
            type: Post,
            args: { id: { type: GraphQLNonNull(GraphQLString) } },
            subscribe: function (parentValue, { id }, req) {
                return pubsub.asyncIterator(`${POSTS_TOPIC}_${id}`)
            }
        },
        greetings: {
            type: GraphQLString,
            subscribe: async function* () {
                for (const hi of ['Hi', 'Bonjour', 'Hola', 'Ciao', 'Zdravo']) {
                    yield { greetings: hi };
                }
            },
        },
    }
})

module.exports = new GraphQLSchema({
    query,
    mutation,
    subscription
})