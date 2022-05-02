const {
    GraphQLList,
    GraphQLNonNull,
    GraphQLObjectType,
    GraphQLSchema,
    GraphQLString
} = require('graphql')
const { v4: uuidv4 } = require('uuid')
const { RedisPubSub } = require('graphql-redis-subscriptions')
const Redis = require("ioredis");

// const { createClient } = require('redis')

// const publisher = createClient({ url: `redis://127.0.0.1:6379` })
// const subscriber = createClient({ url: `redis://127.0.0.1:6379` })
// publisher.connect().catch(console.error)
// subscriber.connect().catch(console.error)

// const pubsub = new RedisPubSub({
//     publisher,
//     subscriber,
//     messageEventName: 'message_buffer',
//     pmessageEventName: 'pmessage_buffer',
// })

const options = {
    host: '127.0.0.1',
    port: 6379,
    retryStrategy: times => {
        // reconnect after
        return Math.min(times * 50, 2000);
    }
};

const pubsub = new RedisPubSub({
    publisher: new Redis(options),
    subscriber: new Redis(options),
    // messageEventName: 'messageBuffer',
    // pmessageEventName: 'pmessageBuffer',
})

const SOMETHING_CHANGED_TOPIC = 'something_changed';
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
                await pubsub.publish(SOMETHING_CHANGED_TOPIC, { somethingOld: posts })
                return post
            }
        }
    }
})

const subscription = new GraphQLObjectType({
    name: 'Subscription',
    fields: {
        something: {
            type: Post,
            subscribe: async function* () {
                for (let post of posts) {
                    yield { something: post }
                }
            }
        },
        somethingOld: {
            type: GraphQLList(Post),
            subscribe: function (parentValue, args, req) {
                return pubsub.asyncIterator(SOMETHING_CHANGED_TOPIC)
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