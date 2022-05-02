const { createClient } = require('graphql-ws')
const ws = require('ws')

let client

beforeEach(() => {
    client = createClient({
        webSocketImpl: ws,
        url: 'ws://localhost:4000/subscriptions',
    })
})

describe('websockets', () => {
    it('connects to hello world query', async () => {
        const result = await new Promise((resolve, reject) => {
            let result;
            client.subscribe(
                {
                    query: '{ hello }',
                },
                {
                    next: (data) => (result = data),
                    error: reject,
                    complete: () => resolve(result),
                },
            );
        });
        expect(result).toEqual({ data: { hello: 'Hello World!' } });
    })
    it('connects to greetings subscription', async () => {
        const onNext = jest.fn().mockImplementation(function (data) {
            console.log(data.data.greetings)
        })
        await new Promise((resolve, reject) => {
            client.subscribe(
                {
                    query: 'subscription { greetings }',
                },
                {
                    next: onNext,
                    error: reject,
                    complete: resolve,
                },
            )
        })
        expect(onNext).toBeCalledTimes(5)
    })
    it('connects to something subscription', async () => {
        const onNext = jest.fn().mockImplementation(function (data) {
            console.log(data.data.something)
        })
        await new Promise((resolve, reject) => {
            client.subscribe(
                {
                    query: 'subscription { something {id,body}}',
                },
                {
                    next: onNext,
                    error: reject,
                    complete: resolve,
                },
            )
        })
        expect(onNext).toBeCalledTimes(3)
    })
})